import readline from 'readline';
import { colors, prettyLogMsgs } from '../src/utils';
import { Agent, Message } from '../src/index';

/**
 * Create a readline interface so we can capture user input in the terminal
 */
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptUser(): Promise<string> {
  return new Promise((resolve) => {
    rl.question(`${colors.green}👤 User:${colors.reset} `, (input) => {
      resolve(input);
    });
  });
}

export async function runSwarmLoop({
  initialAgentMessage = 'Hey, how can I help you today?',
  initialAgent,
}: {
  initialAgentMessage?: string;
  initialAgent: Agent;
}) {
  prettyLogMsgs([
    {
      role: 'assistant',
      content: initialAgentMessage,
      swarmMeta: { agentId: initialAgent.id },
    },
  ]);

  let messages: Message[] = [];

  let activeAgent = initialAgent;
  while (true) {
    const userInput = await promptUser();

    // option for user to exit the conversation
    if (userInput.toLowerCase() === 'exit') {
      rl.close();
      break;
    }

    // add the user message to the messages array
    messages.push({
      role: 'user',
      content: userInput,
    });

    // run the agent with swarm orchestration
    const result = await activeAgent.run({
      messages,
      // using a callback to log the messages so we can get logs within each loop
      onMessages: prettyLogMsgs,
    });

    // Or we could just log all the new messages after running the swarm loop
    // prettyLogMsgs(result.messages);

    // update the state
    activeAgent = result.activeAgent;
    messages = [...messages, ...result.messages];
  }
}
