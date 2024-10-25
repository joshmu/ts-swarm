# TS-SWARM 🐝

[![npm version](https://img.shields.io/npm/v/ts-swarm.svg)](https://www.npmjs.com/package/ts-swarm)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-green.svg)](https://openai.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

TS-SWARM is a minimal TypeScript Agentic library inspired by the [OpenAI Swarm API](https://github.com/openai/swarm). It provides a flexible and extensible system for creating and managing AI agents that can collaborate, communicate, and solve complex tasks.

> [!TIP]
> Initially ported to Typescript from the [original Python codebase](https://github.com/openai/swarm), TS-SWARM diverges with a more functional typesafe approach and sprinkles in some additional features such as Event Emitter. Future plans are to add zod validation and a more generic adapter for the chat completions so that other LLMs can be leveraged. ⚡

## Features

- **Multi-Agent System**: Create and manage multiple AI agents with different roles and capabilities.
- **Flexible Agent Configuration**: Easily define agent behaviors, instructions, and available functions.
- **Task Delegation**: Agents can transfer tasks to other specialized agents.
- **Streaming Responses**: Support for real-time streaming of agent responses.
- **Context Management**: Maintain and update context variables across agent interactions.
- **Event System**: Built-in event emitter for tracking agent switches and tool calls.
- **TypeScript Support**: Fully typed for better development experience and code quality.

## Installation

You will need Node.js 18+ and pnpm installed on your local development machine.

```bash
pnpm add ts-swarm
```

## Usage

```typescript
import { Swarm, Agent, createAgentFunction } from 'ts-swarm';

const getWeather = createAgentFunction({
  name: 'getWeather',
  func: ({ location }: { location: string }): string => {
    // mock API call...
    return `The weather in ${location} is sunny with a high of 67°F.`;
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
// result: The weather in New York is sunny with a high of 67°F.
```

The usage example demonstrates a simple multi-agent system that allows for delegation of tasks to specialized agents.

![Swarm Diagram](assets/swarm_diagram.png)

To see more examples, check out the [examples](./src/examples) directory.
Otherwise, for more examples refer to the original port from Python: [swarm](https://github.com/openai/swarm)
The primary goal of Swarm is to showcase the handoff & routines patterns explored in the [Orchestrating Agents: Handoffs & Routines cookbook](https://cookbook.openai.com/examples/orchestrating_agents)

For more information on the architecture, see our [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contributing

We welcome contributions to TS-SWARM! If you'd like to contribute, please see our [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

## Troubleshooting

If you encounter any issues while using TS-SWARM, try the following:

1. **Runtime Errors**: Enable debug mode by setting `debug: true` in the `swarm.run()` options to get more detailed logs.

If you're still experiencing issues, please [open an issue](https://github.com/joshmu/ts-swarm/issues) on the GitHub repository with a detailed description of the problem and steps to reproduce it.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
