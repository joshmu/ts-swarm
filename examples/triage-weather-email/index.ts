import 'dotenv/config';
import { transferToAgent } from '../../src/index';
import { runSwarmLoop } from '../run';
import { weatherAgent } from './weatherAgent';
import { emailAgent } from './emailAgent';
import { triageAgent } from './triageAgent';

// give the triage agent the ability to transfer to the weather and email agents
triageAgent.tools = {
  ...triageAgent.tools,
  ...transferToAgent(weatherAgent),
  ...transferToAgent(emailAgent),
};

// give the weather and email agents the ability to transfer back to the triage agent
weatherAgent.tools = {
  ...weatherAgent.tools,
  ...transferToAgent(triageAgent),
};
emailAgent.tools = {
  ...emailAgent.tools,
  ...transferToAgent(triageAgent),
};

runSwarmLoop({
  initialAgentMessage:
    'Hey, would you like to know about the weather or send an email?',
  initialAgent: triageAgent,
  agents: [weatherAgent, emailAgent, triageAgent],
});
