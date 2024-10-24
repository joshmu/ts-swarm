import { AgentFunctionDescriptor } from '../agent'

/**
 * Validates the arguments against the function descriptor.
 * Throws an error if validation fails.
 */
export function validateAgentFuncArgs(
  args: any,
  descriptor: AgentFunctionDescriptor,
): Record<string, any> {
  const validateParam = (key: string, param: any) => {
    if (param.required && !(key in args)) {
      throw new Error(`Missing required parameter: ${key}`)
    }
    if (key in args) {
      const expectedType = param.type.toLowerCase()
      const actualType = typeof args[key]
      if (actualType !== expectedType) {
        throw new Error(
          `Invalid type for parameter '${key}': expected '${expectedType}', got '${actualType}'`,
        )
      }
      return { [key]: args[key] }
    }
    return {}
  }

  return Object.entries(descriptor.parameters).reduce(
    (acc, [key, param]) => ({ ...acc, ...validateParam(key, param) }),
    {},
  )
}
