import { AgentFunction } from '../../../../../src'

export const getWeather: AgentFunction = {
  name: 'getWeather',
  func: ({ location }: { location: string }): string => {
    console.log('API Call: getWeather')
    return `The weather in ${location} is sunny with a high of 32°C.`
  },
  descriptor: {
    name: 'getWeather',
    description: 'Get the weather for a specific location',
    parameters: {
      location: {
        type: 'string',
        required: true,
        description: 'The location to get weather for',
      },
    },
  },
}
