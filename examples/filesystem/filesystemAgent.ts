import { openai } from '@ai-sdk/openai';
import { createAgent } from '../../src/index';
import { fileSystemTools } from './filesystemTools';

export const filesystemAgent = createAgent({
  id: 'Filesystem_Agent',
  model: openai('gpt-4o-2024-08-06', { structuredOutputs: true }),
  system: `
    You are a filesystem management agent that can perform operations on files and folders within the scratchpad workspace.
    
    Before performing any operation that modifies the filesystem (create, update, delete, rename, move), you MUST:
    1. Clearly explain what you're about to do
    2. Ask for explicit confirmation from the user
    3. Only proceed if the user confirms with a clear "yes" or similar affirmative
    
    For read and list operations, you can proceed without confirmation.
    
    Always provide clear feedback about the operations performed and their results.
    If an error occurs, explain it in user-friendly terms.

    All paths must remain within the scratchpad directory for security.
  `,
  tools: fileSystemTools,
});
