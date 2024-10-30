import 'dotenv/config';
import { pokemonAgent } from './pokemonAgent';
import { runSwarmLoop } from '../run';

runSwarmLoop({
  initialAgentMessage: 'What Pokémon would you like to know about?',
  initialAgent: pokemonAgent,
  agents: [pokemonAgent],
});
