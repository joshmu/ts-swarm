import {
  ChatCompletionToolChoiceOption,
  ChatCompletionCreateParams,
} from 'openai/resources';

export class Agent {
  name: string;
  model: ChatCompletionCreateParams['model'];
  instructions: string | ((contextVariables: Record<string, any>) => string);
  functions: AgentFunction[];
  tool_choice?: ChatCompletionToolChoiceOption;
  parallel_tool_calls: ChatCompletionCreateParams['parallel_tool_calls'];

  constructor(params: Partial<Agent> = {}) {
    this.name = params.name ?? 'Agent';
    this.model = params.model ?? 'gpt-4o-mini';
    this.instructions = params.instructions ?? 'You are a helpful agent.';
    this.functions = params.functions ?? [];
    this.tool_choice = params.tool_choice;
    this.parallel_tool_calls = params.parallel_tool_calls ?? true;
  }
}

export interface AgentFunctionDescriptor {
  name: string;
  description: string;
  parameters: Record<
    string,
    { type: string; required: boolean; description: string }
  >;
}

export interface AgentFunction {
  name: string;
  /**
   * The function that the agent will execute.
   */
  func: (args: any) => string | Agent | Record<string, any>;
  descriptor: AgentFunctionDescriptor;
}
