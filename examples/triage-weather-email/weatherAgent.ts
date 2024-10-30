import { tool } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';
import { createAgent } from '../../src/index';

// Helper function to fetch weather data
async function fetchWeather(location: string) {
  try {
    // Format parameters:
    // %c - Weather condition symbol
    // %C - Weather condition text
    // %t - Temperature (Celsius)
    // %h - Humidity
    // %w - Wind
    // %p - Precipitation (mm)
    // %m - Moonphase 🌑🌒🌓🌔🌕🌖🌗🌘
    const response = await fetch(
      `https://wttr.in/${encodeURIComponent(location)}?format=%c+%C+%t(%f)+%h+%w+%p+%m`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const data = await response.text();
    return data;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return 'Unable to fetch weather data at this time.';
  }
}

export const weatherAgent = createAgent({
  id: 'Weather_Agent',
  model: openai('gpt-4o-mini'),
  system: `
    You are a weather agent that provides accurate weather information using real-time data.
    You should interpret the weather symbols and data provided by the weather tool and present it in a clear, 
    natural way to the user.
    
    The weather data includes:
    - Weather condition (symbol and text)
    - Temperature
    - Humidity
    - Wind conditions
    - Precipitation
    - Moon phase
    
    Present this information in a friendly, conversational manner.
    If you cannot fulfill the user's request, transfer responsibility to another agent.
  `,
  tools: {
    weather: tool({
      description: 'Get real-time weather information for a specific location',
      parameters: z.object({
        location: z.string().describe('The location to get weather for'),
      }),
      execute: async ({ location }) => {
        const weatherData = await fetchWeather(location.toLowerCase());
        return weatherData;
      },
    }),
  },
});
