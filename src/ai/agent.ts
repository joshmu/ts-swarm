import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';

export type Agent = {
  /**
   * leverage to determine when we are dealing with an agent
   */
  _type: 'agent';
  /**
   * unique identifier for the agent - must not include spaces
   */
  id: string;
  /**
   * logic to initialize the agent
   */
  init: (
    options: Partial<Parameters<typeof generateText>[0]>,
  ) => ReturnType<typeof generateText>;
  /**
   * tools available to the agent
   */
  tools: Record<string, CoreTool>;
};

/**
 * Creates an agent based on the vercel ai sdk interface
 *
 * Will place some sane defaults to begin with and then will override
 */
export function createAgent({
  id,
  model = openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  tools,
  ...createConfig
}: Partial<Parameters<typeof generateText>[0]> & {
  id: string;
  tools: CoreTool[] | Record<string, CoreTool>;
}): Agent {
  /**
   * We need to ensure the agent ID is a valid property key for the ai sdk
   */
  if (!id.match(/^[a-zA-Z0-9_]+$/)) {
    throw new Error(
      `Invalid agent ID: ${id}, must be in the format of [a-zA-Z0-9_]`,
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
      tools: agent.tools,
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
 * Util to create the agent transfer tools
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/agents#example-1
 */
export function transferToAgent(agent: Agent): Record<string, CoreTool> {
  return {
    [`transferTo${agent.id}`]: tool({
      description: `A tool to transfer responsibility to the ${agent.id} agent.`,
      parameters: z.object({
        agentId: z
          .literal(agent.id)
          .describe(`The id of the ${agent.id} agent.`),
      }),
      execute: async ({ agentId }) => {
        return `Transferring to agent: ${agentId}.`;
      },
    }),
  };
}
