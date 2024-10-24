# TS-SWARM

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6.3-blue.svg)](https://www.typescriptlang.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-API-green.svg)](https://openai.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

TS-SWARM is a minimal TypeScript Agentic library inspired by the OpenAI Swarm API. It provides a flexible and extensible system for creating and managing AI agents that can collaborate, communicate, and solve complex tasks.

## Table of Contents

- [TS-SWARM](#ts-swarm)
  - [Overview](#overview)
  - [Table of Contents](#table-of-contents)
  - [Features](#features)
  - [Installation](#installation)
  - [Usage](#usage)
  - [Examples](#examples)
  - [Architecture](#architecture)
    - [Core Components](#core-components)
    - [High-Level Overview](#high-level-overview)
    - [Example Sequence Flow](#example-sequence-flow)
  - [Contributing](#contributing)
  - [Troubleshooting](#troubleshooting)
  - [License](#license)

## Features

- **Multi-Agent System**: Create and manage multiple AI agents with different roles and capabilities.
- **Flexible Agent Configuration**: Easily define agent behaviors, instructions, and available functions.
- **Task Delegation**: Agents can transfer tasks to other specialized agents.
- **Streaming Responses**: Support for real-time streaming of agent responses.
- **Context Management**: Maintain and update context variables across agent interactions.
- **Event System**: Built-in event emitter for tracking agent switches and tool calls.
- **TypeScript Support**: Fully typed for better development experience and code quality.

## Installation

TS-SWARM uses pnpm as its package manager. To install the project dependencies, follow these steps:

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/ts-swarm.git
   cd ts-swarm
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Add your OpenAI API key:

   1. create an `.env` file by copying `.env.example`

   ```bash
   cp .env.example .env
   ```

   2. In your `.env` file, replace `your_api_key_here` with your actual OpenAI API key.

   ```bash
   OPENAI_API_KEY=your_api_key_here
   ```

## Usage

To use TS-SWARM in your project, import the necessary components:

```typescript
import { Swarm, Agent, AgentFunction } from 'ts-swarm'
```

Then, create agents and define their functions:

```typescript
const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions: 'You are a weather assistant.',
  functions: [getWeather],
})

const swarm = new Swarm(process.env.OPENAI_API_KEY)

// Run the swarm
const result = await swarm.run({
  agent: weatherAgent,
  messages: [{ role: 'user', content: "What's the weather like in New York?" }],
})
```

## Examples

TS-SWARM comes with two example implementations:

1. Basic Example:

   ```bash
   pnpm run example:basic
   ```

2. Custom Example:

   ```bash
   pnpm run example:custom
   ```

Make sure to set up your OpenAI API key in a `.env` file before running the examples:

```bash
OPENAI_API_KEY=your_api_key_here
```

## Architecture

TS-SWARM follows a modular architecture that allows for easy extension and customization.

### Core Components

1. **Swarm**: The main orchestrator that manages agents and their interactions.
2. **Agent**: Represents an AI agent with specific capabilities and instructions.
3. **AgentFunction**: Defines the structure and behavior of functions that agents can use.

### High-Level Overview

TS-SWARM follows a modular architecture that allows for easy extension and customization. The project is structured as follows:

```mermaid
graph TD
A((Swarm)) --> B[Agent]
A --> C[EventEmitter]
B --> D[AgentFunction]
B --> E[Instructions]
A --> F[OpenAI API]
A --> G[Context Management]
A --> H[Tool Calls]
I[Utils] --> A
I --> B
J[Types] --> A
J --> B
```

### Example Sequence Flow

Here's a simplified sequence diagram showing how the components interact in a typical scenario:

```mermaid
sequenceDiagram
participant User
participant Swarm
participant Agent
participant AgentFunction
participant OpenAI API
User->>Swarm: Run with initial message
Swarm->>Agent: Process message
Agent->>OpenAI API: Generate response
OpenAI API-->>Agent: Response with tool calls
Agent->>AgentFunction: Execute tool call
AgentFunction-->>Agent: Tool call result
Agent->>Swarm: Updated response and context
Swarm->>User: Final result
```

1. The user initiates a request to the Swarm with an initial message.
2. The Swarm passes the message to the appropriate Agent.
3. The Agent processes the message and uses the OpenAI API to generate a response.
4. If the response includes tool calls, the Agent executes the corresponding AgentFunctions.
5. The Agent updates its response and context based on the tool call results.
6. The Swarm returns the final result to the user.

This process can repeat multiple times, with the Swarm managing context and potentially switching between different specialized Agents as needed.

## Contributing

We welcome contributions to TS-SWARM! If you'd like to contribute, please follow these steps:

1. Fork the repository
2. Create a new branch for your feature or bug fix
3. Make your changes and commit them with a clear commit message
4. Push your changes to your fork
5. Create a pull request to the main repository

## Troubleshooting

If you encounter any issues while using TS-SWARM, try the following:

1. **API Key Issues**: Ensure your OpenAI API key is correctly set in the `.env` file.
2. **Dependency Issues**: If you encounter any dependency-related errors, try removing the `node_modules` folder and `pnpm-lock.yaml` file, then run `pnpm install` again.
3. **TypeScript Errors**: Make sure you're using a compatible TypeScript version (check `package.json` for the recommended version). Run `pnpm tsc` to check for any type errors.
4. **Runtime Errors**: Enable debug mode by setting `debug: true` in the `swarm.run()` options to get more detailed logs.
5. **Agent Function Errors**: Verify that your agent functions are correctly defined and match the expected interface.

If you're still experiencing issues, please [open an issue](https://github.com/joshmu/ts-swarm/issues) on the GitHub repository with a detailed description of the problem and steps to reproduce it.

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
