import { Agent, RunSwarmOptions } from './types';

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
 * Log a message
 */
export function log(agent: Agent, message: string) {
  console.log(`${colors.blue}🤖 ${agent.id}:${colors.reset} ${message}`);
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

/**
 * Check if the last items are duplicates
 */
export function isLastDuplicates(items: any[], threshold = 2) {
  if (items.length < threshold) return false;
  const lastItems = items.slice(-threshold);
  const isDuplicate = lastItems.every(
    (m, i) => JSON.stringify(m) === JSON.stringify(lastItems[i + 1]),
  );
  return isDuplicate;
}
