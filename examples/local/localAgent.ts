import { createAgent } from '../../src/index';
import { ollama } from 'ollama-ai-provider';
import { z } from 'zod';

type OllamaModel = Parameters<typeof ollama>[0];
// Must ensure we use a model that supports tool calling
const LOCAL_MODEL: OllamaModel = 'llama3.1';

export const localAgent = createAgent({
  id: 'Local-Agent',
  model: ollama(LOCAL_MODEL),
  system: `
    You are a helpful assistant that can answer questions and help with tasks.
    Always respond by mentioning you are running on a local machine with model "${LOCAL_MODEL}".

    The tools you have access to are:
    - get-days-in-month: Get the number of days in a month

    NEVER make up your own parameter values as tool function arguments, you must retrieve this from the user! 
    NEVER use tool functions if not asked, instead revert to normal chat!
  `,
  tools: [
    // tool to return number of days in a month
    {
      id: 'get-days-in-month',
      description: 'Get the number of days in a month',
      parameters: z.object({
        month: z
          .number()
          .describe('The month number to get the number of days for'),
        year: z.number().describe('The year to get the number of days for'),
      }),
      execute: async ({ month, year }) => {
        return new Date(year, month, 0).getDate();
      },
    },
  ],
});
