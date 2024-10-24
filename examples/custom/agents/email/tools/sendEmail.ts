import { AgentFunction } from '../../../../../src'

export const sendEmail: AgentFunction = {
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
    return `Sending email to ${to} with subject: ${subject}`
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
