import { OpenAI } from 'openai';
import { Agent } from '../agent';
import { logger } from '../utils/logger';
import { ChatCompletion, ChatCompletionChunk } from 'openai/resources';
import { Stream } from 'openai/streaming';
import { agentFuncDescToJSON } from '../utils/agentFuncDescToJson';

/**
 * @todo: this should eventually be an adapter for other ai services...
 */

const CTX_VARS_NAME = 'context_variables';

export function getChatCompletion(
  client: OpenAI,
  agent: Agent,
  history: Array<any>,
  context_variables: Record<string, any>,
  model_override?: string,
  stream?: false,
  debug?: boolean,
): Promise<ChatCompletion>;

export function getChatCompletion(
  client: OpenAI,
  agent: Agent,
  history: Array<any>,
  context_variables: Record<string, any>,
  model_override?: string,
  stream?: true,
  debug?: boolean,
): Promise<Stream<ChatCompletionChunk>>;

export function getChatCompletion(
  client: OpenAI,
  agent: Agent,
  history: Array<any>,
  context_variables: Record<string, any>,
  model_override = '',
  stream = false,
  debug = false,
): Promise<ChatCompletion | Stream<ChatCompletionChunk>> {
  const ctxVars = structuredClone(context_variables);
  const instructions =
    typeof agent.instructions === 'function'
      ? agent.instructions(ctxVars)
      : agent.instructions;
  const messages = [{ role: 'system', content: instructions }, ...history];
  logger(debug, 'Getting chat completion for...', messages);

  const tools = agent.functions.map((func) =>
    agentFuncDescToJSON(func.descriptor),
  );
  // Hide context_variables from model
  tools.forEach((tool) => {
    delete (tool.function.parameters as any).properties?.[CTX_VARS_NAME];
    const requiredIndex = (tool.function.parameters as any).required.indexOf(
      CTX_VARS_NAME,
    );
    if (requiredIndex !== -1) {
      (tool.function.parameters as any).required.splice(requiredIndex, 1);
    }
  });

  const createParams: OpenAI.Chat.Completions.ChatCompletionCreateParams = {
    model: model_override || agent.model,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    tool_choice: agent.tool_choice,
    stream,
  };

  if (tools.length > 0) {
    createParams.parallel_tool_calls = agent.parallel_tool_calls;
  }

  return client.chat.completions.create(createParams);
}
