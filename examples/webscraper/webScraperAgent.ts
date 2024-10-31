import { tool } from 'ai';
import { z } from 'zod';
import { createAgent } from '../../src/index';
import clipboard from 'clipboardy';
import { openai } from '@ai-sdk/openai';

let lastScrapedContent: string | undefined;

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
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
  model: openai('gpt-4o-mini'),
  system: `
    You are a web scraping agent that can:
    1. Read URLs from the clipboard
    2. Fetch and extract text content from web pages
    3. Analyze and summarize the content
    4. Answer questions about the scraped content
    5. Perform web searches and analyze results

    When processing URLs or searches:
    - Verify if the input looks valid
    - Handle errors gracefully and provide clear feedback
    - Summarize content in a clear, structured way
    - Be mindful of content length in responses
    
    You can use your tools to:
    - Read from clipboard
    - Fetch web content
    - Get current scraped content
    - Clear the current content
    - Perform web searches
  `,
  tools: [
    {
      id: 'readClipboard',
      ...tool({
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
    },

    {
      id: 'fetchWebContent',
      ...tool({
        description: 'Fetches and extracts text content from a URL',
        parameters: z.object({
          url: z.string().describe('The URL to fetch content from'),
        }),
        execute: async ({ url }) => {
          try {
            const encodedUrl = encodeURIComponent(url);
            // @see https://jina.ai
            const jinaReaderUrl = `https://r.jina.ai/${encodedUrl}`;
            const response = await fetchWithTimeout(jinaReaderUrl, 20000);
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
    },

    {
      id: 'getScrapedContent',
      ...tool({
        description: 'Gets the currently stored scraped content',
        parameters: z.object({}),
        execute: async () => {
          if (!lastScrapedContent) {
            return 'No content has been scraped yet';
          }
          return lastScrapedContent;
        },
      }),
    },

    {
      id: 'clearScrapedContent',
      ...tool({
        description: 'Clears the currently stored scraped content',
        parameters: z.object({}),
        execute: async () => {
          lastScrapedContent = undefined;
          return 'Scraped content has been cleared';
        },
      }),
    },

    {
      id: 'performWebSearch',
      ...tool({
        description: 'Performs a web search and return the results',
        parameters: z.object({
          query: z.string().describe('The search query to look up'),
        }),
        execute: async ({ query }) => {
          try {
            // @see https://jina.ai
            const encodedQuery = encodeURIComponent(query);
            const jinaSearchUrl = `https://s.jina.ai/${encodedQuery}`;
            console.log('execute: > jinaSearchUrl:', jinaSearchUrl);

            const response = await fetchWithTimeout(jinaSearchUrl, 30000);
            if (!response.ok) {
              return `Failed to perform search: ${response.statusText}`;
            }

            const searchResults = await response.text();

            // Store in context for later use
            lastScrapedContent = searchResults;

            return `Successfully performed search. Preview of results:\n${searchResults.slice(0, 150)}...`;
          } catch (error: any) {
            return `Error performing search: ${error.message}`;
          }
        },
      }),
    },
  ],
});
