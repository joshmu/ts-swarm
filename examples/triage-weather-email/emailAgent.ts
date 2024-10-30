import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { createAgent } from '../../src/index';

export const emailAgent = createAgent({
  id: 'Email_Agent',
  model: openai('gpt-4o-mini'),
  system: `
    You are an email agent. You need to send an email.
    Once you have enough information you should request for the user to confirm the email details.
    You should attempt to resolve the user's request based on the tools you have available.
    After which, if you are still unable to fulfil the user's request you should transfer responsibility to another agent.
  `,
  tools: {
    email: tool({
      description: 'A tool for sending an email.',
      parameters: z.object({
        to: z.string().describe('The email address of the recipient'),
        subject: z.string().describe('The subject of the email'),
        body: z.string().describe('The body of the email'),
      }),
      execute: async ({ to, subject, body }) => {
        return `Email sent to ${to} with subject "${subject}" and body "${body}".`;
      },
    }),
  },
});
