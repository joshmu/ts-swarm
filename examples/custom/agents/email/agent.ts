import { Agent } from '../../../../src'
import { sendEmail } from './tools/sendEmail'

export const emailAgent = new Agent({
  name: 'Email Agent',
  instructions:
    'You are an email assistant. Help users send emails when requested.',
  functions: [sendEmail],
})
