import { openai } from '@ai-sdk/openai';
import { createAgent } from '../../src/index';

export const triageAgent = createAgent({
  id: 'Triage_Agent',
  model: openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  system: `
    You are to answer the user's questions.
    If you are unable to answer the question, you should transfer responsibility to another agent to retrieve additional information to inform you answer.
  `,
});
