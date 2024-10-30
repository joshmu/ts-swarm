import { createAgent } from '../../src/index';
import { tool } from 'ai';
import { z } from 'zod';

export const weatherAgent = createAgent({
  id: 'Weather_Agent',
  system: `
    You are a weather agent. You need to provide the weather.
    You can only use the weather tool to answer the question.
    You should attempt to resolve the user's request based on the tools you have available.
    After which, if you are still unable to fulfil the user's request you should transfer responsibility to another agent.
  `,
  tools: {
    weather: tool({
      description: 'A tool for providing the weather.',
      parameters: z.object({
        location: z.string().describe('The location to get weather for'),
      }),
      execute: async ({ location }) => {
        return `The weather in ${location} is sunny.`;
      },
    }),
  },
});
