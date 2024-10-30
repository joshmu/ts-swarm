import { OpenAI } from 'openai';
import { mergeChunkAndToolCalls } from './utils/mergeChunkAndToolCalls';
import { logger } from './utils/logger';
import { validateAgentFuncArgs } from './utils/validateAgentFuncArgs';
import {
  Response,
  Result,
  createSwarmResult,
  createAgentFunctionResult,
  createToolFunction,
} from './types';
import { Agent, AgentFunction } from './agent';
import {
  ChatCompletion,
  ChatCompletionMessageToolCall,
} from 'openai/resources';
import { EventEmitter } from 'events';
import { getChatCompletion } from './lib/chatCompletion';

const CTX_VARS_NAME = 'context_variables';

type SwarmRunOptions<TStream extends boolean> = {
  agent: Agent;
  messages: Array<any>;
  context_variables?: Record<string, any>;
  model_override?: string;
  stream?: TStream;
  debug?: boolean;
  max_turns?: number;
  execute_tools?: boolean;
};

export class Swarm extends EventEmitter {
  private readonly client: OpenAI;

  constructor({ apiKey }: { apiKey?: string } = {}) {
    super();
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      // Default configuration
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Normalize the result of the agent function
   * Takes in to account the possibility of the result being an agent
   */
  private handleFunctionResult(result: any, debug: boolean): Result {
    if (result && typeof result === 'object' && 'value' in result) {
      return result;
    } else if (result instanceof Agent) {
      return createAgentFunctionResult({
        value: JSON.stringify({ assistant: result.name }),
        agent: result,
      });
    } else {
      try {
        return createAgentFunctionResult({ value: String(result) });
      } catch (e: any) {
        const errorMessage = `Failed to cast response to string: ${result}. Make sure agent functions return a string or Result object. Error: ${e.message}`;
        logger(debug, errorMessage);
        throw new TypeError(errorMessage);
      }
    }
  }

  /**
   * Handle the list of tool call responses from the LLM
   */
  private handleToolCalls(
    tool_calls: ChatCompletionMessageToolCall[],
    functions: AgentFunction[],
    context_variables: Record<string, any>,
    debug: boolean,
  ): Response {
    /**
     * Create the function tool registry
     */
    const function_map: Record<string, AgentFunction> = {};
    functions.forEach((func) => {
      function_map[func.name] = func;
    });

    /**
     * Initialize the swarm response output
     */
    const partialResponse = createSwarmResult({
      messages: [],
      agent: undefined,
      context_variables: {},
    });

    /**
     * Iterate over the tools which have been called
     */
    tool_calls.forEach((tool_call) => {
      const name = tool_call.function.name;
      /**
       * Check if the tool is registered
       * And if not, log an error and add it to the response
       */
      if (!(name in function_map)) {
        logger(debug, `Tool ${name} not found in function map.`);
        partialResponse.messages.push({
          role: 'tool',
          tool_call_id: tool_call.id,
          tool_name: name,
          content: `Error: Tool ${name} not found.`,
        });
        return;
      }

      /**
       * Retrive the function tool arguments
       */
      const args = JSON.parse(tool_call.function.arguments);
      logger(
        debug,
        `Processing tool call: ${name} with arguments`,
        JSON.stringify(args),
      );

      /**
       * Provide the context variables to the function if required
       */
      const func = function_map[name];
      const hasFunc = func.func.length;
      const hasContextVars = (func as Record<string, any>).hasOwnProperty(
        CTX_VARS_NAME,
      );
      if (hasFunc && hasContextVars) args[CTX_VARS_NAME] = context_variables;

      /**
       * Validate the arguments
       * By ensuring they match the function descriptor
       */
      let validatedArgs: any;
      try {
        validatedArgs = validateAgentFuncArgs(args, func.descriptor);
      } catch (e: any) {
        logger(
          debug,
          `Argument validation failed for function ${name}: ${e.message}`,
        );
        partialResponse.messages.push({
          role: 'tool',
          tool_call_id: tool_call.id,
          tool_name: name,
          content: `Error: ${e.message}`,
        });
        return;
      }

      logger(
        debug,
        `Processing tool call: ${name} with arguments`,
        JSON.stringify(validatedArgs),
      );

      /**
       * Invoke the function with the validated arguments
       */
      const raw_result = func.func(validatedArgs);
      logger(debug, 'Raw result:', raw_result);

      /**
       * Normalize the result of the agent function
       * Takes in to account the possibility of the result being an agent
       */
      const result: Result = this.handleFunctionResult(raw_result, debug);
      /**
       * Add the result to the response
       */
      partialResponse.messages.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        tool_name: name,
        content: result.value,
      });
      /**
       * Update the context variables
       */
      partialResponse.context_variables = {
        ...partialResponse.context_variables,
        ...result.context_variables,
      };
      /**
       * If the result is an agent, switch to it
       */
      if (result.agent) {
        partialResponse.agent = result.agent;
        this.emit('agentSwitch', result.agent);
      }
      this.emit('toolCall', {
        name,
        args: validatedArgs,
        result: result.value,
      });
    });

    return partialResponse;
  }

  /**
   * Run the swarm by making a single LLM request which is streamed
   */
  async *runAndStream(options: SwarmRunOptions<true>): AsyncIterable<any> {
    const {
      agent,
      messages,
      context_variables = {},
      model_override,
      debug = false,
      max_turns = Infinity,
      execute_tools = true,
    } = options;

    let active_agent = agent;
    let ctx_vars = structuredClone(context_variables);
    const history = structuredClone(messages);
    const init_len = history.length;

    while (history.length - init_len < max_turns && active_agent) {
      const message: any = {
        content: '',
        sender: agent.name,
        role: 'assistant',
        function_call: null,
        tool_calls: {},
      };

      // Update the getChatCompletion call
      const completion = await getChatCompletion(
        this.client,
        active_agent,
        history,
        ctx_vars,
        model_override,
        true,
        debug,
      );

      yield { delim: 'start' };
      for await (const chunk of completion) {
        logger(debug, 'Received chunk:', JSON.stringify(chunk));
        const delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
          sender?: string;
        } = chunk.choices[0].delta;
        if (chunk.choices[0].delta.role === 'assistant') {
          delta.sender = active_agent.name;
        }
        yield delta;
        delete delta.role;
        delete delta.sender;
        mergeChunkAndToolCalls(message, delta);
      }
      yield { delim: 'end' };

      message.tool_calls = Object.values(message.tool_calls);
      if (message.tool_calls.length === 0) {
        message.tool_calls = null;
      }
      logger(debug, 'Received completion:', message);
      history.push(message);

      if (!message.tool_calls || !execute_tools) {
        logger(debug, 'Ending turn.');
        break;
      }

      // Convert tool_calls to objects
      const tool_calls: ChatCompletionMessageToolCall[] =
        message.tool_calls.map((tc: any) => {
          const func = createToolFunction({
            arguments: tc.function.arguments,
            name: tc.function.name,
          });
          return {
            id: tc.id,
            function: func,
            type: tc.type,
          };
        });

      // Handle function calls, updating context_variables and switching agents
      const partial_response = this.handleToolCalls(
        tool_calls,
        active_agent.functions,
        ctx_vars,
        debug,
      );
      history.push(...partial_response.messages);
      ctx_vars = { ...ctx_vars, ...partial_response.context_variables };
      if (partial_response.agent) {
        active_agent = partial_response.agent;
      }
    }

    yield {
      response: createSwarmResult({
        messages: history.slice(init_len),
        agent: active_agent,
        context_variables: ctx_vars,
      }),
    };
  }

  /**
   * Run the swarm by making a single LLM request which is NOT streamed
   */
  async run<TStream extends boolean = false>(
    options: SwarmRunOptions<TStream>,
  ): Promise<TStream extends true ? AsyncIterable<any> : Response> {
    const {
      agent,
      messages,
      context_variables = {},
      model_override,
      stream = false,
      debug = false,
      max_turns = Infinity,
      execute_tools = true,
    } = options;

    /**
     * Handle a streamed response by delegating to the runAndStream method
     */
    if (stream) {
      return this.runAndStream({
        agent,
        messages,
        context_variables,
        model_override,
        debug,
        max_turns,
        execute_tools,
      }) as TStream extends true ? AsyncIterable<any> : never;
    }

    /**
     * Initialize
     */
    let active_agent = agent;
    let ctx_vars = structuredClone(context_variables);
    const history = structuredClone(messages);
    const initialMessageLength = history.length;

    /**
     * Iterate
     */
    while (history.length - initialMessageLength < max_turns && active_agent) {
      /**
       * Make the LLM request
       */
      const completion: ChatCompletion = await getChatCompletion(
        this.client,
        active_agent,
        history,
        ctx_vars,
        model_override,
        false,
        debug,
      );

      /**
       * Update the history
       */
      const messageData = completion.choices[0].message;
      logger(debug, 'Received completion:', messageData);
      const message: any = { ...messageData, sender: active_agent.name };
      history.push(message);

      /**
       * If there are no tool calls, end the turn
       */
      if (!message.tool_calls || !execute_tools) {
        logger(debug, 'Ending turn.');
        break;
      }

      /**
       * Handle function calls, updating context_variables and switching agents
       */
      const partial_response = this.handleToolCalls(
        message.tool_calls,
        active_agent.functions,
        ctx_vars,
        debug,
      );
      /**
       * Add to history
       */
      history.push(...partial_response.messages);
      /**
       * Update context
       */
      ctx_vars = { ...ctx_vars, ...partial_response.context_variables };
      /**
       * If the result is an agent, switch to it
       */
      if (partial_response.agent) {
        active_agent = partial_response.agent;
      }
    }
    /**
     * Return the result
     * However only the messages associated to this run
     */
    const newMessages = history.slice(initialMessageLength);
    return createSwarmResult({
      messages: newMessages,
      agent: active_agent,
      context_variables: ctx_vars,
    }) as TStream extends true ? never : Response;
  }
}
