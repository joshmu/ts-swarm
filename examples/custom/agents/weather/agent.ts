import { Agent } from '../../../../src'
import { getWeather } from './tools/getWeather'

export const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions:
    'You are a weather assistant. Get weather information for the specified location, then transfer back to the Triage Agent with the result.',
  functions: [getWeather],
})
