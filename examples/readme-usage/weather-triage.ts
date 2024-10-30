/**
 * This is the usage example for the README.md file.
 */

import 'dotenv/config';
import { createAgent, Swarm, transferToAgent } from '../../src';
import { openai } from '@ai-sdk/openai'; // Ensure OPENAI_API_KEY environment variable is set
import { tool } from 'ai';
import { z } from 'zod';

// Create the Weather Agent
const weatherAgent = createAgent({
  id: 'Weather_Agent',
  model: openai('gpt-4o-mini'),
  system: `You are a weather assistant. Your role is to:
- Provide weather information for requested locations
- Use the weather tool to fetch weather data
- Respond in a friendly, conversational manner`,
  tools: {
    weather: tool({
      description: 'Get the weather for a specific location',
      parameters: z.object({
        location: z.string().describe('The location to get weather for'),
      }),
      execute: async ({ location }) => {
        // Mock weather API call
        return `The weather in ${location} is sunny with a high of 67°F.`;
      },
    }),
  },
});

// Create the Triage Agent
const triageAgent = createAgent({
  id: 'Triage_Agent',
  model: openai('gpt-4o-mini'),
  system: `You are a helpful triage agent. Your role is to:
- Determine if the user's request is weather-related
- If weather-related, use transferToWeather_Agent to hand off the conversation
- For non-weather queries, explain that you can only help with weather information`,
  tools: {
    // Add ability to transfer to weather agent
    ...transferToAgent(weatherAgent),
  },
});

async function demo() {
  // Initialize swarm with our agents
  const swarm = new Swarm({
    agents: [triageAgent, weatherAgent],
  });

  // Example conversation
  const messages = [
    { role: 'user' as const, content: "What's the weather like in New York?" },
  ];

  // Run the swarm
  const result = await swarm.run({
    agent: triageAgent,
    messages,
  });

  // Log the last message (or the entire conversation if you prefer)
  const lastMessage = result.messages[result.messages.length - 1];
  console.log(
    `${lastMessage.swarmMeta?.agentId || 'User'}: ${lastMessage.content}`,
  );
}

demo();
