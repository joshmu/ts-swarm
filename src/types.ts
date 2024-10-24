import { Agent } from './agent'

/**
 * Represents the response from the Swarm.
 */
export interface Response {
  messages: Array<any>
  agent?: Agent
  context_variables: Record<string, any>
}

export const createResponse = (params: Partial<Response> = {}): Response => ({
  messages: params.messages ?? [],
  agent: params.agent,
  context_variables: params.context_variables ?? {},
})

/**
 * Represents the result of a function executed by an agent.
 */
export interface Result {
  value: string
  agent?: Agent
  context_variables: Record<string, any>
}

export const createResult = (params: Partial<Result> = {}): Result => ({
  value: params.value ?? '',
  agent: params.agent,
  context_variables: params.context_variables ?? {},
})

/**
 * Represents a function callable by the agent.
 */
export interface ToolFunction {
  arguments: string
  name: string
}

export const createToolFunction = (
  params: Partial<ToolFunction> = {},
): ToolFunction => ({
  arguments: params.arguments ?? '',
  name: params.name ?? '',
})
