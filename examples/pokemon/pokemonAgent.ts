import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { createAgent, Agent } from '../../src/index';

const pokemonTools: Agent['tools'] = [
  {
    id: 'pokemon',
    description: 'A tool for providing basic Pokémon details.',
    parameters: z.object({
      name: z.string().describe('The name of the Pokémon'),
    }),
    execute: async ({ name }) => {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${name?.toLowerCase()}`,
      );
      if (!response.ok) {
        return `Could not find details for Pokémon: ${name}.`;
      }
      const data: any = await response.json();
      return `Pokémon ${data.name} has a height of ${data.height} and a weight of ${data.weight}.`;
    },
  },
  {
    id: 'abilities',
    description: 'A tool for providing Pokémon abilities.',
    parameters: z.object({
      name: z.string().describe('The name of the Pokémon'),
    }),
    execute: async ({ name }) => {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${name?.toLowerCase()}`,
      );
      if (!response.ok) {
        return `Could not find abilities for Pokémon: ${name}.`;
      }
      const data: any = await response.json();
      const abilities = data.abilities
        .map((ability: any) => ability.ability.name)
        .join(', ');
      return `Pokémon ${data.name} has the following abilities: ${abilities}.`;
    },
  },
  {
    id: 'types',
    description: 'A tool for providing Pokémon types.',
    parameters: z.object({
      name: z.string().describe('The name of the Pokémon'),
    }),
    execute: async ({ name }) => {
      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${name?.toLowerCase()}`,
      );
      if (!response.ok) {
        return `Could not find types for Pokémon: ${name}.`;
      }
      const data: any = await response.json();
      const types = data.types.map((type: any) => type.type.name).join(', ');
      return `Pokémon ${data.name} is of type(s): ${types}.`;
    },
  },
];

export const pokemonAgent = createAgent({
  id: 'Pokemon_Agent',
  model: openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  system: `
    You are a Pokémon agent. You need to provide details about a Pokémon.
    You can use the Pokémon tools to answer the question.
    You should attempt to resolve the user's request based on the tools you have available.
    If the customer is unsure, you could provide them a list of Pokémon to choose from.
  `,
  tools: pokemonTools,
});
