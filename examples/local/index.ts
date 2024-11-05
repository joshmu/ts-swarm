import { runDemoLoop } from '../run';
import { localAgent } from './localAgent';

runDemoLoop({
  initialAgentMessage: 'Would you like to know how many days are in a month?',
  initialAgent: localAgent,
});
