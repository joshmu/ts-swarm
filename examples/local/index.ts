import { runSwarmLoop } from '../run';
import { localAgent } from './localAgent';

runSwarmLoop({
  initialAgentMessage: 'Would you like to know how many days are in a month?',
  initialAgent: localAgent,
});
