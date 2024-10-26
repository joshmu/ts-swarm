import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';

export type Agent = {
  /**
   * leverage to determine when we are dealing with an agent
   */
  _type: 'agent';
  /**
   * unique identifier for the agent - must not include spaces
   */
  id: string;
  /**
   * logic to initialize the agent
   */
  init: (
    options: Partial<Parameters<typeof generateText>[0]>,
  ) => ReturnType<typeof generateText>;
};

/**
 * Creates an agent based on the vercel ai sdk interface
 *
 * Will place some sane defaults to begin with and then will override
 */
export function createAgent({
  id,
  model = openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  maxSteps = 5,
  tools = {},
  ...createConfig
}: Partial<Parameters<typeof generateText>[0]> & { id: string }): Agent {
  const agent: Agent = {
    _type: 'agent',
    id: id.replace(/\s/g, '_'),
    init,
  };

  async function init(initConfig: Partial<Parameters<typeof generateText>[0]>) {
    return generateText({
      model,
      tools,
      maxSteps,
      ...createConfig,
      ...initConfig,
    });
  }

  return agent;
}

/**
 * Swarm logic to allow for multiple agents to work together
 */
export function createSwarm() {}

export function transferToAgent(agent: Agent): Record<string, CoreTool> {
  return {
    [`transferTo${agent.id}`]: tool({
      description: `A tool to transfer to the ${agent.id} agent.`,
      parameters: z.object({}),
      execute: async () => {
        console.log(`Transferring to ${agent.id}...`);
        return {
          agentId: agent.id,
        };
      },
    }),
  };
}

(async () => {
  const weatherAgent = createAgent({
    id: 'Weather_Agent',
    system: 'You are a weather agent. You need to provide the weather.',
    toolChoice: 'required',
    tools: {
      weather: tool({
        description: 'A tool for providing the weather.',
        parameters: z.object({ location: z.string() }),
        execute: async ({ location }) => {
          return `The weather in ${location} is sunny.`;
        },
      }),
    },
  });

  const emailAgent = createAgent({
    id: 'Email_Agent',
    system: 'You are an email agent. You need to send an email.',
    toolChoice: 'required',
    tools: {
      email: tool({
        description: 'A tool for sending an email.',
        parameters: z.object({
          to: z.string(),
          subject: z.string(),
          body: z.string(),
        }),
        execute: async ({ to, subject, body }) => {
          return `Email sent to ${to} with subject "${subject}" and body "${body}".`;
        },
      }),
    },
  });

  const triageAgent = createAgent({
    id: 'Triage_Agent',
    system:
      'You are a triage agent. You need to determine which type of agent to transfer to based on the user query.',
    tools: {
      ...transferToAgent(weatherAgent),
      ...transferToAgent(emailAgent),
    },
  });

  const agents = [weatherAgent, emailAgent, triageAgent];

  /**
   * Loop until we have a response which does not include a transfer request
   */
  let activeAgent = triageAgent;
  let query: string = 'What is the weather in Tokyo?';
  while (activeAgent) {
    const result = await activeAgent.init({
      prompt: query,
    });

    const messages = result.response.messages.flatMap((m: any) => m.content);
    const textMessages = messages.filter((m: any) => m.type === 'text');
    const toolCalls = messages.filter((m: any) => m.type === 'tool-call');
    const toolResults = messages.filter((m: any) => m.type === 'tool-result');
    const lastMessage = messages.at(-1);
    const lastTextMessage = textMessages.at(-1);
    const lastToolResult = toolResults.at(-1);
    const transferAgentId = lastToolResult?.result?.agentId;

    console.log('--------------------------------');
    console.log(
      `${activeAgent.id}: ${lastMessage?.text || lastMessage?.result}`,
    );

    if (transferAgentId) {
      const nextAgent = agents.find((a) => a.id === transferAgentId);
      if (nextAgent) {
        activeAgent = nextAgent;
        query =
          (lastTextMessage as any)?.text ||
          ((lastMessage as any)?.result as string);
      } else {
        console.error('No next agent found');
        break;
      }
    } else {
      console.log('--------------------------------');
      console.log('done.');
      break;
    }
  }
})();
