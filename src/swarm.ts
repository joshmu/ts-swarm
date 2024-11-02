import { CoreToolResult } from 'ai';
import { debugLog, isLastDuplicates } from './utils';
import {
  Agent,
  RunSwarmOptions,
  SwarmResult,
  ToolResults,
  Tools,
  ReturnGenerateText,
} from './types';

/**
 * Handle the list of tool call responses from the LLM
 */
function handleToolCalls(
  toolResults: ToolResults,
  response: ReturnGenerateText['response'],
  activeAgent: Agent,
): SwarmResult {
  const partialResponse: SwarmResult = createSwarmResponse();

  if (toolResults.length) {
    toolResults.forEach((t: CoreToolResult<string, any, any>) => {
      /**
       * Determine if we need to transfer to a new agent
       */
      const transferToAgent = toolResults.find(isTransferAgentToolResult) as
        | (Omit<CoreToolResult<string, any, Agent>, 'result'> & {
            result: () => Agent;
          })
        | undefined;
      const newAgent = transferToAgent?.result?.();
      if (newAgent) {
        partialResponse.agent = newAgent;
        /**
         * Remove the Agent data object from the message history
         */
        const replacementMsg = `transferring to: ${newAgent.id}`;
        t.result = replacementMsg;
        (
          response.messages.find(
            (m: any) => m.content[0].toolCallId === t.toolCallId,
          )!.content[0] as any
        ).result = replacementMsg;
      }

      // @todo: remove
      // prettyLog({ agent: activeAgent, tool: t });
    });
    // add the response messages to the partial response
    partialResponse.messages.push(...response.messages);
  }

  return partialResponse;
}

/**
 * Check if the tool call is a transfer agent calls
 */
function isTransferAgentToolResult(tool: Tools[number]) {
  return tool.toolName.startsWith('transferTo');
}

/**
 * Handle LLM call
 */
async function getChatCompletion(options: RunSwarmOptions) {
  const { agent, messages } = options;
  return await agent.generate({
    messages,
    /**
     * If we keep seeing the same message
     * Then the llm is most likely stuck calling the same tool
     * let's force it to stop with some form of answer
     */
    ...(isLastDuplicates(messages) && { toolChoice: 'none' }),
  });
}

/**
 * Create swarm result
 */
function createSwarmResponse(params: Partial<SwarmResult> = {}): SwarmResult {
  return {
    messages: params.messages ?? [],
    /**
     * @todo: this type is not correct...
     */
    agent: params.agent!,
    contextVariables: params.contextVariables ?? {},
  };
}

/**
 * Run the swarm by making a single LLM request which is NOT streamed
 */
export async function runSwarm(options: RunSwarmOptions) {
  const {
    agent,
    messages,
    contextVariables = {},
    modelOverride,
    debug = false,
    maxTurns = 10,
  } = options;

  /**
   * Initialize
   */
  let activeAgent: Agent | null = agent;
  let ctx_vars = structuredClone(contextVariables);
  const history = structuredClone(messages);
  const initialMessageLength = history.length;

  /**
   * Iterate
   */
  while (history.length - initialMessageLength < maxTurns && activeAgent) {
    debugLog(debug, `Running ${activeAgent.id}`);
    debugLog(debug, history);

    /**
     * Make the LLM request
     */
    const chatCompletionResponse = await getChatCompletion({
      agent: activeAgent,
      messages: history,
      contextVariables: ctx_vars,
      modelOverride,
      debug,
    });
    debugLog(debug, chatCompletionResponse);
    const { toolCalls, toolResults, text, response } = chatCompletionResponse;

    /**
     * Update the history
     */
    if (text) {
      history.push({
        role: 'assistant',
        content: text,
        swarmMeta: {
          agentId: activeAgent.id,
        },
      });
    }

    /**
     * If there are no tool calls, end the turn
     */
    if (!toolCalls.length) {
      debugLog(debug, 'No toolCalls, ending run.');
      break;
    }

    /**
     * Handle the tool calls
     */
    const partialResponse = handleToolCalls(toolResults, response, activeAgent);

    /**
     * Add to history
     */
    history.push(
      ...partialResponse.messages.map((m) => ({
        ...m,
        swarmMeta: {
          agentId: activeAgent?.id!,
        },
      })),
    );

    /**
     * Update context
     */
    ctx_vars = { ...ctx_vars, ...partialResponse.contextVariables };

    /**
     * Update active agent
     */
    if (partialResponse.agent) {
      activeAgent = partialResponse.agent;
    }
  }

  /**
   * Return the result
   * However only the messages associated to this run
   * And not including the user query which we would already be aware of
   */
  const newMessages = history.slice(initialMessageLength);
  return createSwarmResponse({
    messages: newMessages,
    agent: activeAgent!,
    contextVariables: ctx_vars,
  });
}
