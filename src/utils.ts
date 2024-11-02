import { TextPart, ToolCallPart, ToolResultPart } from 'ai';
import { RunSwarmOptions, Message } from './types';

/**
 * Colors for logging
 */
export const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m', // for agents
  green: '\x1b[32m', // for user
  yellow: '\x1b[33m', // for tool calls
} as const;

/**
 * Pretty log message list
 * based on the message response object
 */
export function prettyLogMsgs(messages: Message[]) {
  messages.forEach((message) => {
    if (Array.isArray(message.content)) {
      message.content.forEach((content: Message['content'][number]) => {
        checkMessage(message, content);
      });
    } else {
      checkMessage(message, message.content);
    }
  });
}

function checkMessage(message: Message, content: Message['content'][number]) {
  userMessage(message);
  assistantMessage(message, content as TextPart | ToolCallPart);
  toolMessage(message, content as ToolResultPart);
}
function userMessage(message: Message) {
  if (message.role === 'user') {
    console.log(`${colors.green}👤 User:${colors.reset} ${message.content}`);
  }
}
function assistantMessage(message: Message, content: TextPart | ToolCallPart) {
  if (message.role === 'assistant') {
    if (typeof content === 'string' && content) {
      console.log(
        `${colors.blue}🤖 ${message.swarmMeta?.agentId}:${colors.reset} ${content}`,
      );
    } else if (content.type === 'text' && content.text) {
      console.log(
        `${colors.blue}🤖 ${message.swarmMeta?.agentId}:${colors.reset} ${content.text}`,
      );
    } else if (content.type === 'tool-call') {
      console.log(
        `${colors.blue}🤖 ${message.swarmMeta?.agentId} ${colors.yellow} (TOOL CALL - ${content.toolName}):${colors.reset} ${JSON.stringify(content.args)}`,
      );
    }
  }
}
function toolMessage(message: Message, content: ToolResultPart) {
  if (message.role === 'tool') {
    if (content.type === 'tool-result') {
      console.log(
        `${colors.blue}🤖 ${message.swarmMeta?.agentId} ${colors.yellow} (TOOL RESULT - ${content.toolName}):${colors.reset} ${JSON.stringify(content.result)}`,
      );
    }
  }
}

/**
 * Debug log
 */
export function debugLog(
  debug: RunSwarmOptions['debug'],
  args: Parameters<typeof console.dir>[0],
) {
  if (debug) console.dir(args, { depth: Infinity });
}
