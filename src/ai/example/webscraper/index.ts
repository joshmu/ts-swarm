import { webScraperAgent } from './webScraperAgent';
import { runSwarmLoop } from '../run';

runSwarmLoop({
  initialAgentMessage: `Hello! I can help you analyze web content. I can:
1. Read URLs from your clipboard
2. Fetch and extract text from web pages
3. Answer questions about the content
4. Perform web searches
Would you like me to check what URL is in your clipboard?`,
  initialAgent: webScraperAgent,
  agents: [webScraperAgent],
});
