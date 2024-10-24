import 'dotenv/config'
import { Swarm, Agent, AgentFunction } from '../../src'

const getWeather: AgentFunction = {
  name: 'getWeather',
  func: ({ location }: { location: string }): string => {
    // This is a mock function, in a real scenario, you'd call an API
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

const sendEmail: AgentFunction = {
  name: 'sendEmail',
  func: ({
    to,
    subject,
    body,
  }: {
    to: string
    subject: string
    body: string
  }): string => {
    // This is a mock function, in a real scenario, you'd use an email service
    console.log(`Sending email to ${to} with subject: ${subject}`)
    return 'Email sent successfully!'
  },
  descriptor: {
    name: 'sendEmail',
    description: 'Send an email',
    parameters: {
      to: {
        type: 'string',
        required: true,
        description: 'Email recipient',
      },
      subject: {
        type: 'string',
        required: true,
        description: 'Email subject',
      },
      body: {
        type: 'string',
        required: true,
        description: 'Email body',
      },
    },
  },
}

// Create agents
const weatherAgent = new Agent({
  name: 'Weather Agent',
  instructions:
    'You are a helpful weather agent. Provide weather information when asked.',
  functions: [getWeather],
})

const emailAgent = new Agent({
  name: 'Email Agent',
  instructions:
    'You are an email assistant. Help users send emails when requested.',
  functions: [sendEmail],
})

// Create swarm
const swarm = new Swarm(process.env.OPENAI_API_KEY)

// Example usage
async function runExample() {
  const weatherResult = await swarm.run({
    agent: weatherAgent,
    messages: [
      { role: 'user', content: "What's the weather like in New York?" },
    ],
  })
  console.log(
    'Weather:',
    // @ts-ignore
    weatherResult.messages[weatherResult.messages.length - 1].content,
  )

  const emailResult = await swarm.run({
    agent: emailAgent,
    messages: [
      {
        role: 'user',
        content: 'Send an email to john@example.com about the weather.',
      },
    ],
  })
  console.log(
    'Email:',
    // @ts-ignore
    emailResult.messages[emailResult.messages.length - 1].content,
  )
}

runExample()
