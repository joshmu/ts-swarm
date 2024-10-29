import readline from 'readline';
import { CoreMessage } from 'ai';
import { Agent } from '../agent';
import { Swarm } from '../swarm';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function promptUser(): Promise<string> {
  return new Promise((resolve) => {
    rl.question('User: ', (input) => {
      resolve(input);
    });
  });
}

export async function runSwarmLoop({
  initialAgentMessage = 'Hey, how can I help you today?',
  initialAgent,
  agents,
}: {
  initialAgentMessage?: string;
  initialAgent: Agent;
  agents: Agent[];
}) {
  console.log(`${initialAgent.id}: ${initialAgentMessage}`);

  const swarm = new Swarm({
    agents,
  });

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

    const result = await swarm.run({
      agent: activeAgent,
      messages,
    });

    activeAgent = result.agent;
    messages = result.messages;

    console.log(`${result.agent.id}: ${result.messages.at(-1)?.content}`);
  }
}
