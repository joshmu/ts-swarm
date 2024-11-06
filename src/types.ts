import { CoreTool, generateText, CoreMessage } from 'ai';
import { type Agent } from './agent';

type GenerateText = typeof generateText;
export type GenerateTextParams = Parameters<GenerateText>[0];
type CustomCoreTool = CoreTool & { id: string };
export type SwarmTool = Agent | CustomCoreTool;
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
  activeAgent: Agent;
  contextVariables: Record<string, any>;
};
export type RunSwarmOptions = {
  activeAgent: Agent;
  /**
   * Messages could be CoreMessage[] with additional swarm meta fields
   */
  messages: Message[];
  contextVariables?: Record<string, any>;
  modelOverride?: string;
  debug?: boolean;
  maxTurns?: number;
  /**
   * Callback when new messages are received
   */
  onMessages?: (messages: Message[]) => void;
};
export type ReturnGenerateText = Awaited<ReturnType<typeof generateText>>;
export type Tools = ReturnGenerateText['toolCalls'];
export type ToolResults = ReturnGenerateText['toolResults'];
export type Message = CoreMessage & SwarmMessageMeta;
