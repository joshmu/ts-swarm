import { CoreTool, generateText, CoreMessage } from 'ai';

type GenerateText = typeof generateText;
export type GenerateTextParams = Parameters<GenerateText>[0];
type CustomCoreTool = CoreTool & { id: string };
export type SwarmTool = Agent | CustomCoreTool;
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
   * generate a raw vercel ai sdk generateText response
   */
  generate: (options: Partial<GenerateTextParams>) => ReturnType<GenerateText>;
  /**
   * run the agent with swarm orchestration
   */
  run: (
    options: Partial<Omit<RunSwarmOptions, 'messages'>> & {
      messages: Message[];
    },
  ) => Promise<SwarmResult>;
  /**
   * tools available to the agent
   */
  tools: SwarmTool[];
};
export type SwarmMessageMeta = {
  swarmMeta?: {
    agentId: string;
  };
};
export type SwarmResult = {
  messages: Message[];
  /**
   * The current active agent
   */
  agent: Agent;
  contextVariables: Record<string, any>;
};
export type RunSwarmOptions = {
  agent: Agent;
  /**
   * Messages could be CoreMessage[] with additional swarm meta fields
   */
  messages: Message[];
  contextVariables?: Record<string, any>;
  modelOverride?: string;
  debug?: boolean;
  maxTurns?: number;
};
export type ReturnGenerateText = Awaited<ReturnType<typeof generateText>>;
export type Tools = ReturnGenerateText['toolCalls'];
export type ToolResults = ReturnGenerateText['toolResults'];
export type Message = CoreMessage & SwarmMessageMeta;
