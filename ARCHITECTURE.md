# Architecture

Swarm focuses on making agent coordination and execution lightweight, highly controllable, and easily testable.

![Swarm Diagram](assets/swarm_diagram.png)

## Core Components

1. **Swarm**: The main orchestrator that manages agents and their interactions.
2. **Agent**: Represents an AI agent with specific capabilities and instructions.
3. **AgentFunction**: Defines the structure and behavior of functions that agents can use.

## High-Level Overview

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

## Example Sequence Flow

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
