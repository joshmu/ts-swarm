import { CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';

type GenerateText = typeof generateText;
type GenerateTextParams = Parameters<GenerateText>[0];

type CustomCoreTool = CoreTool & { id: string };
type SwarmTool = Agent | CustomCoreTool;

export type Agent = {
  /**
   * @internal
   * Used to determine if an object is an agent
   */
  _type: 'agent';
  /**
   * unique identifier for the agent - must not include spaces
   */
  id: string;
  /**
   * logic to initialize the agent
   */
  init: (options: Partial<GenerateTextParams>) => ReturnType<GenerateText>;
  /**
   * tools available to the agent
   */
  tools: SwarmTool[];
};

/**
 * Creates an agent based on the vercel ai sdk interface
 *
 * Will place some sane defaults to begin with and then will override
 */
export function createAgent({
  id,
  model,
  tools = [],
  ...createConfig
}: Omit<Partial<GenerateTextParams>, 'tools'> & {
  id: string;
  model: GenerateTextParams['model'];
  tools?: SwarmTool[];
}): Agent {
  /**
   * We need to ensure the agent ID is a valid property key for the ai sdk
   */
  if (!id.match(/^[a-zA-Z0-9_-]+$/)) {
    throw new Error(
      `Invalid agent ID: ${id}, must be in the format of [a-zA-Z0-9_-]`,
    );
  }

  const agent: Agent = {
    _type: 'agent',
    id,
    init,
    tools,
  };

  async function init(initConfig: Partial<Parameters<typeof generateText>[0]>) {
    return generateText({
      model,
      tools: createToolMap(agent.tools),
      ...createConfig,
      ...initConfig,
      /**
       * ! set the limit to 1 to allow the swarm to determine the orchestration
       * If we don't do this then internal orchestration will be triggered at the agent level which currently has undesired behavior
       */
      maxSteps: 1,
    });
  }

  return agent;
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
 * Determine if the tool is an agent
 */
function isTransferToAgentTool(tool: SwarmTool): tool is Agent {
  return (tool as Record<string, any>)?._type === 'agent';
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
