import readline from 'readline';
import { colors } from '../src/utils';
import { Agent, Message } from '../src/index';

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
  console.log(
    `${colors.blue}🤖 ${initialAgent.id}:${colors.reset} ${initialAgentMessage}`,
  );

  let messages: Message[] = [];

  let activeAgent = initialAgent;
  while (true) {
    const userInput = await promptUser();

    // option for user to quit
    if (userInput.toLowerCase() === 'exit') {
      rl.close();
      break;
    }

    messages.push({
      role: 'user',
      content: userInput,
    });

    const result = await activeAgent.run({ messages });

    activeAgent = result.agent;
    messages = [...messages, ...result.messages];

    console.log(
      `${colors.blue}🤖 ${result.agent.id}:${colors.reset} ${result.messages.at(-1)?.content}`,
    );
  }
}
