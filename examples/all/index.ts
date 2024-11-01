import 'dotenv/config';
import { triageAgent } from '../triage-weather-email/triageAgent';
import { weatherAgent } from '../triage-weather-email/weatherAgent';
import { emailAgent } from '../triage-weather-email/emailAgent';
import { pokemonAgent } from '../pokemon/pokemonAgent';
import { filesystemAgent } from '../filesystem/filesystemAgent';
import { webScraperAgent } from '../webscraper/webScraperAgent';
import { localAgent } from '../local/localAgent';
import { runSwarmLoop } from '../run';

const allAgents = [
  triageAgent,
  weatherAgent,
  emailAgent,
  pokemonAgent,
  filesystemAgent,
  webScraperAgent,
  localAgent,
];

// Let all agents transfer to each other
allAgents.forEach((agent) => {
  const otherAgents = allAgents.filter((a) => a.id !== agent.id);
  agent.tools.push(...otherAgents);
});

runSwarmLoop({
  initialAgent: triageAgent,
});
