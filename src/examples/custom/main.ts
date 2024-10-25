import 'dotenv/config';
import { Swarm, Agent, createAgentFunction } from '../../index';
import { emailAgent } from './agents/email/agent';
import { weatherAgent } from './agents/weather/agent';

// Create agents
const triageAgent = new Agent({
  name: 'Triage Agent',
  instructions:
    "You are a helpful triage agent. Determine which agent is best suited to handle the user's request, and transfer the conversation to that agent. Only choose one agent at a time. After an agent completes its task, you will be called again to determine the next step.",
  functions: [],
  tool_choice: 'auto',
  parallel_tool_calls: false,
});

// Define transfer functions
const transferToWeather = createAgentFunction({
  name: 'transferToWeather',
  func: () => weatherAgent,
  descriptor: {
    name: 'transferToWeather',
    description: 'Transfer the conversation to the Weather Agent',
    parameters: {},
  },
});

const transferToEmail = createAgentFunction({
  name: 'transferToEmail',
  func: () => emailAgent,
  descriptor: {
    name: 'transferToEmail',
    description: 'Transfer the conversation to the Email Agent',
    parameters: {},
  },
});

const transferBackToTriage = createAgentFunction({
  name: 'transferBackToTriage',
  func: () => triageAgent,
  descriptor: {
    name: 'transferBackToTriage',
    description: 'Transfer the conversation back to the Triage Agent',
    parameters: {},
  },
});

// Assign transfer functions to agents
triageAgent.functions = [transferToWeather, transferToEmail];
weatherAgent.functions.push(transferBackToTriage);
emailAgent.functions.push(transferBackToTriage);

// Create swarm
const swarm = new Swarm({ apiKey: process.env.OPENAI_API_KEY });

// Add event listeners
swarm.on('agentSwitch', (newAgent: Agent) => {
  console.log(`Switched to Agent: ${newAgent.name}`);
});

swarm.on(
  'toolCall',
  (toolCall: { name: string; args: any; result: string }) => {
    console.log(
      `Tool(${toolCall.name}): Args: ${JSON.stringify(toolCall.args)}`,
    );
    console.log(`Tool(${toolCall.name}) Result: ${toolCall.result}`);
  },
);

// Example usage
async function runExample() {
  const initialMessage = {
    role: 'user',
    content: `
      I need to send an email to john@example.com. 
      Please include the weather temperature in New York in the body of the email.
      The subject should be "Weather Update".
    `,
  };

  let currentAgent = triageAgent;
  let messages = [initialMessage];
  let context_variables = {};

  while (true) {
    console.log(`\nCurrent Agent: ${currentAgent.name}`);
    console.log('Context Variables:', context_variables);

    const result = await swarm.run({
      agent: currentAgent,
      messages,
      context_variables,
    });

    console.log(
      `\nAgent(${currentAgent.name}) Response:`,
      result.messages[result.messages.length - 1].content,
    );

    messages = [...messages, ...result.messages];
    context_variables = { ...context_variables, ...result.context_variables };

    if (result.agent && result.agent !== currentAgent) {
      currentAgent = result.agent;
    } else if (currentAgent !== triageAgent) {
      // If no agent switch occurred and we're not on the triage agent,
      // switch back to triage agent
      currentAgent = triageAgent;
    } else {
      // If we're on the triage agent and no switch occurred, we're done
      break;
    }
  }
}

runExample();
