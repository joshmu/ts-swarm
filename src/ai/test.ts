import 'dotenv/config';
import { CoreMessage, tool } from 'ai';
import { z } from 'zod';
import { Swarm } from './swarm';
import { createAgent, transferToAgent } from './agent';

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
    system: `
      You are an email agent. You need to send an email.
      You can only use the email tool to send an email.
      Once an email has been sent you should end your turn by transferring back to the triage agent.
    `,
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

  const prompt =
    process.argv[2] ||
    'I would like to send an email to John Doe regarding the weather in Sydney.';
  console.log(`User: ${prompt}`);

  let messages: CoreMessage[] = [
    {
      role: 'user',
      content: prompt,
    },
  ];

  const swarm = new Swarm({
    agents: [weatherAgent, emailAgent, triageAgent],
  });

  const result = await swarm.run({
    agent: triageAgent,
    messages,
    debug: false,
  });

  console.log(
    `${result.agent.id} response: ${result.messages.at(-1)?.content}`,
  );
})();
