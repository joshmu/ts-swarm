import type { ChatCompletionTool } from 'openai/resources';
import { AgentFunctionDescriptor } from '../agent';

/**
 * Converts an agent function descriptor to JSON.
 */
export function agentFuncDescToJSON(
  descriptor: AgentFunctionDescriptor,
): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: descriptor.name,
      description: descriptor.description,
      parameters: {
        type: 'object',
        properties: Object.entries(descriptor.parameters).reduce(
          (acc, [key, { type, description }]) => ({
            ...acc,
            [key]: { type, description },
          }),
          {},
        ),
        required: Object.entries(descriptor.parameters)
          .filter(([, { required }]) => required)
          .map(([key]) => key),
      },
    },
  };
}
