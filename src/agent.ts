import { CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';
import {
  SwarmTool,
  GenerateTextParams,
  Message,
  RunSwarmOptions,
} from './types';
import { runSwarm } from './swarm';

/**
 * Declarative helper to create an agent instance
 */
export function createAgent({
  id,
  model,
  tools = [],
  ...config
}: Omit<Partial<GenerateTextParams>, 'tools'> & {
  id: string;
  model: GenerateTextParams['model'];
  tools?: SwarmTool[];
}): Agent {
  return new Agent({ id, model, tools, ...config });
}

/**
 * Agent class
 */
export class Agent {
  readonly id: string;
  model: GenerateTextParams['model'];
  tools: SwarmTool[];
  baseConfig: Omit<Partial<GenerateTextParams>, 'tools'>;

  constructor({
    id,
    model,
    tools = [],
    ...createConfig
  }: Omit<Partial<GenerateTextParams>, 'tools'> & {
    id: string;
    model: GenerateTextParams['model'];
    tools?: SwarmTool[];
  }) {
    const AI_SDK_VALID_ID_REGEX = /^[a-zA-Z0-9_-]+$/;
    if (!RegExp(AI_SDK_VALID_ID_REGEX).exec(id)) {
      throw new Error(
        `Invalid agent ID: "${id}", must be in the format of [a-zA-Z0-9_-]`,
      );
    }

    this.id = id;
    this.model = model;
    this.tools = tools;
    this.baseConfig = createConfig;
  }

  /**
   * Generate a raw vercel ai sdk generateText response
   */
  generate(config: Partial<GenerateTextParams>) {
    return generateText({
      model: this.model,
      tools: createToolMap(this.tools),
      ...this.baseConfig,
      ...config,
      /**
       * ! set the limit to 1 to allow the swarm to determine the orchestration
       * If we don't do this then internal orchestration will be triggered at the agent level which currently has undesired behavior
       */
      maxSteps: 1,
    });
  }

  /**
   * Run the agent and allow agent tool handoffs with swarm orchestration
   */
  run(
    options: Partial<Omit<RunSwarmOptions, 'messages'>> & {
      messages: Message[];
    },
  ) {
    return runSwarm({
      activeAgent: this,
      ...options,
    });
  }
}

/**
 * Create a tool map valid for the ai sdk
 */
function createToolMap(tools: SwarmTool[]) {
  return tools.reduce((acc, tool) => {
    return {
      ...acc,
      ...normalizeSwarmTool(tool),
    };
  }, {});
}

/**
 * Determine if the tool is an agent instance
 */
function isTransferToAgentTool(tool: SwarmTool): tool is Agent {
  return (tool as Record<string, any>) instanceof Agent;
}

/**
 * Util to create the agent transfer tools
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/agents#example-1
 */
function transferToAgent(agent: Agent): Record<string, CoreTool> {
  return {
    [`transferTo${agent.id}`]: tool({
      description: `
        A tool to transfer responsibility to the ${agent.id} agent.
      `,
      parameters: z.object({}),
      execute: async () => () => agent,
    }),
  };
}

/**
 * Normalize the swarm tool to a core tool
 */
function normalizeSwarmTool(swarmTool: SwarmTool): Record<string, CoreTool> {
  if (isTransferToAgentTool(swarmTool)) {
    return transferToAgent(swarmTool);
  }

  // otherwise, it's a core tool
  const { id, ...toolConfig } = swarmTool;
  return { [id]: tool(toolConfig as Parameters<typeof tool>[0]) } as Record<
    string,
    CoreTool
  >;
}
