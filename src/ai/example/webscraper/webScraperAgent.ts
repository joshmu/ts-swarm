import { tool } from 'ai';
import { z } from 'zod';
import { createAgent } from '../../agent';
import clipboard from 'clipboardy';

let lastScrapedContent: string | undefined;

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // @see https://jina.ai
    const jinaReaderUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaReaderUrl, {
      signal: controller.signal,
      headers: {
        Accept: 'text/plain',
      },
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export const webScraperAgent = createAgent({
  id: 'WebScraper_Agent',
  system: `
    You are a web scraping agent that can:
    1. Read URLs from the clipboard
    2. Fetch and extract text content from web pages
    3. Analyze and summarize the content
    4. Answer questions about the scraped content
    
    When processing URLs:
    - Verify if the input looks like a valid URL
    - Handle errors gracefully and provide clear feedback
    - Summarize content in a clear, structured way
    - Be mindful of content length in responses
    
    You can use your tools to:
    - Read from clipboard
    - Fetch web content
    - Get current scraped content
    - Clear the current content
  `,
  tools: {
    readClipboard: tool({
      description: 'Reads content from the clipboard',
      parameters: z.object({}),
      execute: async () => {
        try {
          const content = await clipboard.read();
          return content || 'Clipboard is empty';
        } catch (error: any) {
          return `Error reading clipboard: ${error.message}`;
        }
      },
    }),

    fetchWebContent: tool({
      description: 'Fetches and extracts text content from a URL',
      parameters: z.object({
        url: z.string().describe('The URL to fetch content from'),
      }),
      execute: async ({ url }) => {
        try {
          const response = await fetchWithTimeout(url);
          if (!response.ok) {
            return `Failed to fetch URL: ${response.statusText}`;
          }

          const textContent = await response.text();

          // Store in context for later use
          lastScrapedContent = textContent;

          return `Successfully fetched and processed content. Preview: First 100 characters:\n${textContent.slice(0, 100)}...`;
        } catch (error: any) {
          return `Error fetching content: ${error.message}`;
        }
      },
    }),

    getScrapedContent: tool({
      description: 'Gets the currently stored scraped content',
      parameters: z.object({}),
      execute: async () => {
        if (!lastScrapedContent) {
          return 'No content has been scraped yet';
        }
        return lastScrapedContent;
      },
    }),

    clearScrapedContent: tool({
      description: 'Clears the currently stored scraped content',
      parameters: z.object({}),
      execute: async () => {
        lastScrapedContent = undefined;
        return 'Scraped content has been cleared';
      },
    }),
  },
});
