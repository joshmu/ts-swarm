import { createAgent } from '../../src/index';

export const triageAgent = createAgent({
  id: 'Triage_Agent',
  system: `
    You are to answer the user's questions.
    If you are unable to answer the question, you should transfer responsibility to another agent to retrieve additional information to inform you answer.
  `,
  tools: {},
});
