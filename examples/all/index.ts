import { triageAgent } from '../triage-weather-email/triageAgent';
import { weatherAgent } from '../triage-weather-email/weatherAgent';
import { emailAgent } from '../triage-weather-email/emailAgent';
import { pokemonAgent } from '../pokemon/pokemonAgent';
import { filesystemAgent } from '../filesystem/filesystemAgent';
import { webScraperAgent } from '../webscraper/webScraperAgent';
import { Agent, transferToAgent } from '../../src/index';
import { runSwarmLoop } from '../run';

const allAgents = [
  triageAgent,
  weatherAgent,
  emailAgent,
  pokemonAgent,
  filesystemAgent,
  webScraperAgent,
];

// Util to be able to provide transferToAgent to all agents
function transferToAllAgents(agent: Agent) {
  const otherAgents = allAgents.filter((a) => a.id !== agent.id);
  agent.tools = {
    ...agent.tools,
    ...otherAgents.reduce((acc, a) => ({ ...acc, ...transferToAgent(a) }), {}),
  };
}

// Add transferToAgent to all agents
allAgents.forEach(transferToAllAgents);

runSwarmLoop({
  initialAgent: triageAgent,
  agents: allAgents,
});
