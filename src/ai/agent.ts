import 'dotenv/config';
import { openai } from '@ai-sdk/openai';
import { CoreMessage, CoreTool, generateText, tool } from 'ai';
import { z } from 'zod';
import { Swarm } from './swarm';

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
  maxSteps = 1,
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
      maxSteps,
      tools: agent.tools,
      ...createConfig,
      ...initConfig,
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
    }),
    [`transferTo${agent.id}Answer`]: tool({
      // answer tool: the LLM will provide a structured answer which can be leveraged
      description: `A tool for providing the final answer of which agent id to transfer to.`,
      parameters: z.object({
        agentId: z
          .literal(agent.id)
          .describe(`The id of the ${agent.id} agent.`),
      }),
      // no execute function - invoking it will terminate the agent
    }),
  };
}
