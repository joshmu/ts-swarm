import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';
import { Swarm } from './swarm';

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
  /**
   * tools available to the agent
   */
  tools: Record<string, CoreTool>;
};

/**
 * Creates an agent based on the vercel ai sdk interface
 *
 * Will place some sane defaults to begin with and then will override
 */
export function createAgent({
  id,
  model = openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  maxSteps = 1,
  tools,
  ...createConfig
}: Partial<Parameters<typeof generateText>[0]> & {
  id: string;
  tools: CoreTool[] | Record<string, CoreTool>;
}): Agent {
  const agent: Agent = {
    _type: 'agent',
    id,
    init,
    tools,
  };

  async function init(initConfig: Partial<Parameters<typeof generateText>[0]>) {
    return generateText({
      model,
      maxSteps,
      tools: agent.tools,
      ...createConfig,
      ...initConfig,
    });
  }

  return agent;
}

/**
 * Util to create the agent transfer tools
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/agents#example-1
 */
export function transferToAgent(agent: Agent): Record<string, CoreTool> {
  return {
    [`transferTo${agent.id}`]: tool({
      description: `A tool to transfer responsibility to the ${agent.id} agent.`,
      parameters: z.object({
        agentId: z
          .literal(agent.id)
          .describe(`The id of the ${agent.id} agent.`),
      }),
    }),
    [`transferTo${agent.id}Answer`]: tool({
      // answer tool: the LLM will provide a structured answer which can be leveraged
      description: `A tool for providing the final answer of which agent id to transfer to.`,
      parameters: z.object({
        agentId: z
          .literal(agent.id)
          .describe(`The id of the ${agent.id} agent.`),
      }),
      // no execute function - invoking it will terminate the agent
    }),
  };
}

(async () => {
  const weatherAgent = createAgent({
    id: 'Weather_Agent',
    system: `
      You are a weather agent. You need to provide the weather.
      You can only use the weather tool to answer the question.
      Once a tool has been used to access the whether you should end your turn by transferring back to the triage agent.
    `,
    toolChoice: 'auto',
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
    system: `
      You are to answer the user's questions.
      If you are unable to answer the question, you should transfer responsibility to another agent to retrieve additional information to inform you answer.
    `,
    tools: {
      ...transferToAgent(weatherAgent),
      ...transferToAgent(emailAgent),
    },
    /**
     * tool choice is auto for the triage agent since we want to acquire context from other agents
     * and get to a point where it can provide a final answer
     * after which there will be no transfer requests and thus the loop will end
     */
    toolChoice: 'auto',
  });

  // give the agents the ability to transfer back to the triage agent
  weatherAgent.tools = {
    ...weatherAgent.tools,
    ...transferToAgent(triageAgent),
  };
  emailAgent.tools = {
    ...emailAgent.tools,
    ...transferToAgent(triageAgent),
  };

  let messages: CoreMessage[] = [
    {
      role: 'user',
      content: process.argv[2] || 'What is the weather in Tokyo?',
    },
  ];

  const swarm = new Swarm({
    agents: [weatherAgent, emailAgent, triageAgent],
  });

  const result = await swarm.run({
    agent: triageAgent,
    messages,
    debug: true,
  });

  // console.dir(result, { depth: Infinity });
  console.log('--------------------------------');
  console.dir(result.messages, { depth: Infinity });
  console.log('--------------------------------');
})();
