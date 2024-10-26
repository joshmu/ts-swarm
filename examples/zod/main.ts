import { Swarm, Agent, createAgentFunction } from '../../src/index';

const getWeather = createAgentFunction({
  name: 'getWeather',
  func: ({ location }: { location: string }): string => {
    // mock API call...
    return `The weather in ${location} is sunny with a high of 32°C.`;
  },
  descriptor: {
    name: 'getWeather',
    description: 'Get the weather for a specific location',
    parameters: {
      location: {
        type: 'string',
        required: true,
        description: 'The location to get weather for',
      },
    },
  },
});

const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: 'You are a weather assistant.',
  functions: [getWeather],
});

const transferToWeatherAgent = createAgentFunction({
  name: 'transferToWeatherAgent',
  func: () => weatherAgent,
  descriptor: {
    name: 'transferToWeatherAgent',
    description: 'Transfer the conversation to the Weather Agent',
    parameters: {},
  },
});

const triageAgent = new Agent({
  name: 'Triage Agent',
  instructions:
    "You are a helpful triage agent. Determine which agent is best suited to handle the user's request, and transfer the conversation to that agent.",
  functions: [transferToWeatherAgent],
  tool_choice: 'auto',
  parallel_tool_calls: false,
});

const swarm = new Swarm({ apiKey: process.env.OPENAI_API_KEY });

// Run the swarm
const result = await swarm.run({
  agent: triageAgent,
  messages: [{ role: 'user', content: "What's the weather like in New York?" }],
});

const lastMessage = result.messages.at(-1);
console.log(lastMessage.content);
// result: The weather in New York is sunny with a high of 32°C.
