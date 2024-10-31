import readline from 'readline';
import { CoreMessage } from 'ai';
import { Agent, runSwarm } from '../src/index';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const colors = {
  reset: '\x1b[0m',
  blue: '\x1b[34m', // for agents
  green: '\x1b[32m', // for user
} as const;

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
  console.log(
    `${colors.blue}🤖 ${initialAgent.id}:${colors.reset} ${initialAgentMessage}`,
  );

  let messages: CoreMessage[] = [];

  let activeAgent = initialAgent;
  while (true) {
    const userInput = await promptUser();

    if (userInput.toLowerCase() === 'exit') {
      rl.close();
      break;
    }

    messages.push({
      role: 'user',
      content: userInput,
    });

    const result = await runSwarm({
      agent: activeAgent,
      messages,
    });

    activeAgent = result.agent;
    messages = [...messages, ...result.messages];

    console.log(
      `${colors.blue}🤖 ${result.agent.id}:${colors.reset} ${result.messages.at(-1)?.content}`,
    );
  }
}
