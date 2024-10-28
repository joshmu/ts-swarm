import { Agent } from './agent';
import {
  CoreAssistantMessage,
  CoreMessage,
  CoreTool,
  CoreToolMessage,
  generateText,
  ToolContent,
} from 'ai';

const CTX_VARS_NAME = 'context_variables';

/**
 * Swarm orchestration of agents
 * ! does not handle streaming
 */
export class Swarm {
  private readonly agents: Agent[];

  constructor({ agents }: { agents: Agent[] }) {
    this.agents = agents;
  }

  /**
   * Normalize the result of the agent function
   * Takes in to account the possibility of the result being an agent
   */
  private normalizeToolResult(result: any) {}

  /**
   * Handle the list of tool call responses from the LLM
   */
  private handleToolCalls(
    toolCalls: Tools,
    toolResults: ToolResults,
    response: ReturnGenerateText['response'],
  ) {
    /**
     * determine whether we need to update the agent
     * or simply append the latest tool result to the history
     */
    const partialResponse: SwarmResult = this.createSwarmResponse();

    /**
     * Determine if we need to transfer to a new agent
     */
    const newAgentId = toolCalls.find(this.isTransferAgentCall)?.args.agentId;
    const newAgent = this.agents.find((a) => a.id === newAgentId);
    if (newAgent) {
      partialResponse.agent = newAgent;
      return partialResponse;
    }

    // if (toolCalls.length) {
    //   partialResponse.messages.push({
    //     role: 'assistant',
    //     content: toolCalls,
    //   } satisfies CoreAssistantMessage);
    // }

    if (toolResults.length) {
      partialResponse.messages.push(...response.messages);
      // partialResponse.messages.push({
      //   role: 'tool',
      //   content: toolResults,
      // } satisfies CoreToolMessage);
    }

    /**
     * Iterate over the tool results and append to history
     */
    // toolResults.forEach((toolResult: ToolResults[number]) => {

    //   partialResponse.messages.push({
    //     /**
    //      * ! hack we set role as assistant to avoid breaking the zod checks in ai/sdk
    //      * @todo: is there a better way?
    //      */
    //     role: 'tool',
    //     content:
    //       (toolResult as { result: string }).result ??
    //       ('' as unknown as ToolContent),
    //   } as unknown as CoreMessage);
    // });
    // @todo: could also try the above logic to simply be partial_response.messages.push(...toolResults)

    return partialResponse;
  }

  /**
   * Check if the tool call is a transfer agent calls
   */
  private isTransferAgentCall(tool: Tools[number]) {
    return (
      tool.type === 'tool-call' &&
      tool.toolName.startsWith('transferTo') &&
      tool.args.hasOwnProperty('agentId')
    );
  }

  /**
   * Handle LLM call
   */
  private async getChatCompletion(options: SwarmRunOptions) {
    const { agent, messages, contextVariables, modelOverride, debug } = options;
    this.debugLog(debug, `passing ${messages.length} messages to ${agent.id}`);
    this.debugLog(
      debug,
      `${agent.id} has ${Object.keys(agent.tools).length} tools`,
    );
    this.debugLog(debug, messages);
    return await agent.init({
      messages,
      /**
       * If we keep seeing the same message
       * Then the llm is most likely stuck calling the same tool
       * let's force it to stop with some form of answer
       */
      ...(this.isLastDuplicates(messages) && { toolChoice: 'none' }),
    });
  }

  private isLastDuplicates(items: any[], threshold = 2) {
    if (items.length < threshold) return false;
    const lastItems = items.slice(-threshold);
    const isDuplicate = lastItems.every(
      (m, i) => JSON.stringify(m) === JSON.stringify(lastItems[i + 1]),
    );
    return isDuplicate;
  }

  /**
   * Create swarm result
   */
  private createSwarmResponse(params: Partial<SwarmResult> = {}): SwarmResult {
    return {
      messages: params.messages ?? [],
      agent: params.agent,
      contextVariables: params.contextVariables ?? {},
    };
  }

  private debugLog(
    debug: SwarmRunOptions['debug'],
    args: Parameters<typeof console.dir>[0],
  ) {
    if (debug) console.dir(args, { depth: Infinity });
  }

  /**
   * Run the swarm by making a single LLM request which is NOT streamed
   */
  async run(options: SwarmRunOptions) {
    const {
      agent,
      messages,
      contextVariables = {},
      modelOverride,
      debug = false,
      // maxTurns = Infinity,
      maxTurns = 10,
      executeTools = true,
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
      const { toolCalls, toolResults, text, response } =
        await this.getChatCompletion({
          agent: activeAgent,
          messages: history,
          contextVariables: ctx_vars,
          modelOverride,
          debug,
        });

      // this.debugLog(debug, response);
      this.debugLog(debug, { toolCalls, toolResults, text });

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
       */
      if (history.at(-1)?.content === (toolResults.at(-1) as any)?.result) {
        console.log(
          'Tool result is a duplicate of what we already have in history, breaking...',
        );
        activeAgent = null;
        break;
      }

      /**
       * If there are no tool calls, end the turn
       */
      if (!toolCalls.length) {
        this.debugLog(debug, 'Ending turn.');
        break;
      }

      /**
       * Handle the tool calls
       */
      const partialResponse = this.handleToolCalls(
        toolCalls,
        toolResults,
        response,
      );

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
        this.debugLog(debug, `Transferring to ${partialResponse.agent.id}`);
        activeAgent = partialResponse.agent;
      }
    }

    /**
     * Return the result
     * However only the messages associated to this run
     */
    const newMessages = history.slice(initialMessageLength);
    return this.createSwarmResponse({
      messages: newMessages,
      agent: activeAgent!,
      contextVariables: ctx_vars,
    });
  }
}

type SwarmMessageMeta = {
  swarmMeta?: {
    agentId: string;
  };
};

type SwarmRunOptions = {
  agent: Agent;
  /**
   * Messages could be CoreMessage[] with additional swarm meta fields
   */
  messages: (CoreMessage & SwarmMessageMeta)[];
  contextVariables?: Record<string, any>;
  modelOverride?: string;
  debug?: boolean;
  maxTurns?: number;
  executeTools?: boolean;
};

type ReturnGenerateText = Awaited<ReturnType<typeof generateText>>;
type Tools = ReturnGenerateText['toolCalls'];
type ToolResults = ReturnGenerateText['toolResults'];
type Text = ReturnGenerateText['text'];

type SwarmResult = {
  messages: (CoreMessage & SwarmMessageMeta)[];
  agent?: Agent;
  contextVariables: Record<string, any>;
};
