import { OpenAI } from 'openai'
import { mergeChunkAndToolCalls } from './utils/mergeChunkAndToolCalls'
import { logger } from './utils/logger'
import { validateAgentFuncArgs } from './utils/validateAgentFuncArgs'
import {
  Response,
  Result,
  createResponse,
  createResult,
  createToolFunction,
} from './types'
import { Agent, AgentFunction } from './agent'
import { ChatCompletion, ChatCompletionMessageToolCall } from 'openai/resources'
import { EventEmitter } from 'events'
import { getChatCompletion } from './lib/chatCompletion'

const CTX_VARS_NAME = 'context_variables'

type SwarmRunOptions<TStream extends boolean> = {
  agent: Agent
  messages: Array<any>
  context_variables?: Record<string, any>
  model_override?: string
  stream?: TStream
  debug?: boolean
  max_turns?: number
  execute_tools?: boolean
}

export class Swarm extends EventEmitter {
  private readonly client: OpenAI

  constructor(apiKey?: string) {
    super()
    if (apiKey) {
      this.client = new OpenAI({ apiKey })
    } else {
      // Default configuration
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    }
  }

  private handleFunctionResult(result: any, debug: boolean): Result {
    if (result && typeof result === 'object' && 'value' in result) {
      return result
    } else if (result instanceof Agent) {
      return createResult({
        value: JSON.stringify({ assistant: result.name }),
        agent: result,
      })
    } else {
      try {
        return createResult({ value: String(result) })
      } catch (e: any) {
        const errorMessage = `Failed to cast response to string: ${result}. Make sure agent functions return a string or Result object. Error: ${e.message}`
        logger(debug, errorMessage)
        throw new TypeError(errorMessage)
      }
    }
  }

  private handleToolCalls(
    tool_calls: ChatCompletionMessageToolCall[],
    functions: AgentFunction[],
    context_variables: Record<string, any>,
    debug: boolean,
  ): Response {
    const function_map: Record<string, AgentFunction> = {}
    functions.forEach(func => {
      function_map[func.name] = func
    })

    const partialResponse = createResponse({
      messages: [],
      agent: undefined,
      context_variables: {},
    })

    tool_calls.forEach(tool_call => {
      const name = tool_call.function.name
      if (!(name in function_map)) {
        logger(debug, `Tool ${name} not found in function map.`)
        partialResponse.messages.push({
          role: 'tool',
          tool_call_id: tool_call.id,
          tool_name: name,
          content: `Error: Tool ${name} not found.`,
        })
        return
      }

      const args = JSON.parse(tool_call.function.arguments)
      logger(
        debug,
        `Processing tool call: ${name} with arguments`,
        JSON.stringify(args),
      )

      const func = function_map[name]
      // Pass context_variables to agent functions if required
      const hasFunc = func.func.length
      const hasContextVars = (func as Record<string, any>).hasOwnProperty(
        CTX_VARS_NAME,
      )
      if (hasFunc && hasContextVars) args[CTX_VARS_NAME] = context_variables

      let validatedArgs: any
      try {
        validatedArgs = validateAgentFuncArgs(args, func.descriptor)
      } catch (e: any) {
        logger(
          debug,
          `Argument validation failed for function ${name}: ${e.message}`,
        )
        partialResponse.messages.push({
          role: 'tool',
          tool_call_id: tool_call.id,
          tool_name: name,
          content: `Error: ${e.message}`,
        })
        return
      }

      logger(
        debug,
        `Processing tool call: ${name} with arguments`,
        JSON.stringify(validatedArgs),
      )

      // Invoke the function with the validated arguments
      const raw_result = func.func(validatedArgs)
      logger(debug, 'Raw result:', raw_result)

      const result: Result = this.handleFunctionResult(raw_result, debug)
      partialResponse.messages.push({
        role: 'tool',
        tool_call_id: tool_call.id,
        tool_name: name,
        content: result.value,
      })
      partialResponse.context_variables = {
        ...partialResponse.context_variables,
        ...result.context_variables,
      }
      if (result.agent) {
        partialResponse.agent = result.agent
        this.emit('agentSwitch', result.agent)
      }
      this.emit('toolCall', { name, args: validatedArgs, result: result.value })
    })

    return partialResponse
  }

  async *runAndStream(options: SwarmRunOptions<true>): AsyncIterable<any> {
    const {
      agent,
      messages,
      context_variables = {},
      model_override,
      debug = false,
      max_turns = Infinity,
      execute_tools = true,
    } = options

    let active_agent = agent
    let ctx_vars = structuredClone(context_variables)
    const history = structuredClone(messages)
    const init_len = history.length

    while (history.length - init_len < max_turns && active_agent) {
      const message: any = {
        content: '',
        sender: agent.name,
        role: 'assistant',
        function_call: null,
        tool_calls: {},
      }

      // Update the getChatCompletion call
      const completion = await getChatCompletion(
        this.client,
        active_agent,
        history,
        ctx_vars,
        model_override,
        true,
        debug,
      )

      yield { delim: 'start' }
      for await (const chunk of completion) {
        logger(debug, 'Received chunk:', JSON.stringify(chunk))
        const delta: OpenAI.Chat.Completions.ChatCompletionChunk.Choice.Delta & {
          sender?: string
        } = chunk.choices[0].delta
        if (chunk.choices[0].delta.role === 'assistant') {
          delta.sender = active_agent.name
        }
        yield delta
        delete delta.role
        delete delta.sender
        mergeChunkAndToolCalls(message, delta)
      }
      yield { delim: 'end' }

      message.tool_calls = Object.values(message.tool_calls)
      if (message.tool_calls.length === 0) {
        message.tool_calls = null
      }
      logger(debug, 'Received completion:', message)
      history.push(message)

      if (!message.tool_calls || !execute_tools) {
        logger(debug, 'Ending turn.')
        break
      }

      // Convert tool_calls to objects
      const tool_calls: ChatCompletionMessageToolCall[] =
        message.tool_calls.map((tc: any) => {
          const func = createToolFunction({
            arguments: tc.function.arguments,
            name: tc.function.name,
          })
          return {
            id: tc.id,
            function: func,
            type: tc.type,
          }
        })

      // Handle function calls, updating context_variables and switching agents
      const partial_response = this.handleToolCalls(
        tool_calls,
        active_agent.functions,
        ctx_vars,
        debug,
      )
      history.push(...partial_response.messages)
      ctx_vars = { ...ctx_vars, ...partial_response.context_variables }
      if (partial_response.agent) {
        active_agent = partial_response.agent
      }
    }

    yield {
      response: createResponse({
        messages: history.slice(init_len),
        agent: active_agent,
        context_variables: ctx_vars,
      }),
    }
  }

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
    } = options

    if (stream) {
      return this.runAndStream({
        agent,
        messages,
        context_variables,
        model_override,
        debug,
        max_turns,
        execute_tools,
      }) as TStream extends true ? AsyncIterable<any> : never
    }

    let active_agent = agent
    let ctx_vars = structuredClone(context_variables)
    const history = structuredClone(messages)
    const initialMessageLength = history.length

    while (history.length - initialMessageLength < max_turns && active_agent) {
      // Update the getChatCompletion call
      const completion: ChatCompletion = await getChatCompletion(
        this.client,
        active_agent,
        history,
        ctx_vars,
        model_override,
        false,
        debug,
      )

      const messageData = completion.choices[0].message
      logger(debug, 'Received completion:', messageData)
      const message: any = { ...messageData, sender: active_agent.name }
      history.push(message) // Adjust as needed

      if (!message.tool_calls || !execute_tools) {
        logger(debug, 'Ending turn.')
        break
      }

      // Handle function calls, updating context_variables and switching agents
      const partial_response = this.handleToolCalls(
        message.tool_calls,
        active_agent.functions,
        ctx_vars,
        debug,
      )
      history.push(...partial_response.messages)
      ctx_vars = { ...ctx_vars, ...partial_response.context_variables }
      if (partial_response.agent) {
        active_agent = partial_response.agent
      }
    }
    const newMessages = history.slice(initialMessageLength)
    return createResponse({
      messages: newMessages,
      agent: active_agent,
      context_variables: ctx_vars,
    }) as TStream extends true ? never : Response
  }
}
