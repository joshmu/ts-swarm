import 'dotenv/config';
import { pokemonAgent } from './pokemonAgent';
import { runDemoLoop } from '../run';

runDemoLoop({
  initialAgentMessage: 'What Pokémon would you like to know about?',
  initialAgent: pokemonAgent,
});
