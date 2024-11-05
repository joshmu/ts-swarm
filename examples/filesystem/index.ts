import 'dotenv/config';
import { filesystemAgent } from './filesystemAgent';
import { runDemoLoop } from '../run';

runDemoLoop({
  initialAgentMessage:
    'Hello! I can help you manage files and folders in the scratchpad workspace. I can create, read, update, delete, rename, and move both files and folders. What would you like to do?',
  initialAgent: filesystemAgent,
});
