import 'dotenv/config';
import { tool } from 'ai';
import { z } from 'zod';
import { createAgent, transferToAgent } from '../agent';
import { runSwarmLoop } from './run';

const weatherAgent = createAgent({
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
      parameters: z.object({ location: z.string() }),
      execute: async ({ location }) => {
        return `The weather in ${location} is sunny.`;
      },
    }),
  },
});

const emailAgent = createAgent({
  id: 'Email_Agent',
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

runSwarmLoop({
  initialAgentMessage:
    'Hey, would you like to know about the weather or send an email?',
  initialAgent: triageAgent,
  agents: [weatherAgent, emailAgent, triageAgent],
});
