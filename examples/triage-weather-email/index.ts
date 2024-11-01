import 'dotenv/config';
import { runSwarmLoop } from '../run';
import { weatherAgent } from './weatherAgent';
import { emailAgent } from './emailAgent';
import { triageAgent } from './triageAgent';

// give the triage agent the ability to transfer to the weather and email agents
triageAgent.tools.push(weatherAgent);
triageAgent.tools.push(emailAgent);

// give the weather and email agents the ability to transfer back to the triage agent
weatherAgent.tools.push(triageAgent);
emailAgent.tools.push(triageAgent);

runSwarmLoop({
  initialAgentMessage:
    'Hey, would you like to know about the weather or send an email?',
  initialAgent: triageAgent,
});
