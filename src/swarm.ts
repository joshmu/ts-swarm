import { CoreToolResult } from 'ai';
import { colors, debugLog, isLastDuplicates, log } from './utils';
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
         * @todo: hack to remove the Agent data object from the message history
         */
        const replacementMsg = 'transferred.';
        t.result = replacementMsg;
        (
          response.messages.find(
            (m: any) => m.content[0].toolCallId === t.toolCallId,
          )!.content[0] as any
        ).result = replacementMsg;
      }

      console.log(
        `${colors.blue}🤖 ${activeAgent.id} ${colors.yellow}(TOOL - ${t.toolName}):${colors.reset} ${t.result}`,
      );
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
  const { agent, messages, debug } = options;
  debugLog(debug, `passing ${messages.length} messages to ${agent.id}`);
  debugLog(debug, `${agent.id} has ${Object.keys(agent.tools).length} tools`);
  debugLog(debug, messages);
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
    /**
     * Make the LLM request
     */
    const { toolCalls, toolResults, text, response } = await getChatCompletion({
      agent: activeAgent,
      messages: history,
      contextVariables: ctx_vars,
      modelOverride,
      debug,
    });

    // debugLog(debug, response);
    debugLog(debug, { toolCalls, toolResults, text });

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
     * If the tool result is a duplicate of what we already have in history then break
     * @todo: have not seen this occur anymore, may be worthwhile removing
     */
    if (history.at(-1)?.content === (toolResults.at(-1) as any)?.result) {
      console.log(
        'Tool result is a duplicate of what we already have in history, breaking...',
      );
      activeAgent = null;
      break;
    }
    /**
     * @todo: there should be another guard scenario when we are caught in a transfer agent loop
     * when this occurs we should also break
     */

    /**
     * If there are no tool calls, end the turn
     */
    if (!toolCalls.length) {
      debugLog(debug, 'Ending turn.');
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
      log(activeAgent, `Transferring to ${partialResponse.agent.id}`);
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
