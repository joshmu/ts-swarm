import { mergeDeep } from './mergeDeep'

/**
 * Merges a delta chunk into the final response.
 * Support for tool calls
 */
export function mergeChunkAndToolCalls(
  finalResponse: Record<string, any>,
  delta: Record<string, any>,
): Record<string, any> {
  // Destructure the delta object, separating tool_calls for special handling
  const { role, tool_calls, ...rest } = delta

  // Handle merging of tool_calls
  const mergedToolCalls = tool_calls
    ? tool_calls.reduce((acc: any[], deltaToolCall: any) => {
        // Extract properties from the current tool call
        const { index, id, type, function: func } = deltaToolCall
        // Initialize the accumulator at the current index if it doesn't exist
        if (!acc[index]) acc[index] = {}
        // Merge properties into the accumulator
        if (id) acc[index].id = id
        if (type) acc[index].type = type
        if (func) {
          // Deep merge the function property
          acc[index].function = mergeDeep(acc[index].function || {}, func)
        }
        return acc
      }, finalResponse.tool_calls || [])
    : finalResponse.tool_calls

  return {
    ...(mergedToolCalls && { tool_calls: mergedToolCalls }),
    ...mergeDeep(finalResponse, rest),
  }
}
