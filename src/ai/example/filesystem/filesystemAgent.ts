import { tool } from 'ai';
import { z } from 'zod';
import { createAgent } from '../../agent';
import fs from 'fs/promises';
import path from 'path';

const SCRATCHPAD_DIR = path.join(process.cwd(), 'src/ai/example/scratchpad');

// Ensure scratchpad directory exists
await fs.mkdir(SCRATCHPAD_DIR, { recursive: true });

export const filesystemAgent = createAgent({
  id: 'Filesystem_Agent',
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
  tools: {
    // File operations
    createFile: tool({
      description: 'Creates a new file in the scratchpad directory',
      parameters: z.object({
        filename: z.string(),
        content: z.string(),
      }),
      execute: async ({ filename, content }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          await fs.writeFile(filepath, content, 'utf-8');
          return `Successfully created file: ${filename}`;
        } catch (error: any) {
          return `Error creating file: ${error.message}`;
        }
      },
    }),

    readFile: tool({
      description: 'Reads the content of a file from the scratchpad directory',
      parameters: z.object({
        filename: z.string(),
      }),
      execute: async ({ filename }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          const content = await fs.readFile(filepath, 'utf-8');
          return `Content of ${filename}:\n${content}`;
        } catch (error: any) {
          return `Error reading file: ${error.message}`;
        }
      },
    }),

    updateFile: tool({
      description:
        'Updates the content of an existing file in the scratchpad directory',
      parameters: z.object({
        filename: z.string(),
        content: z.string(),
      }),
      execute: async ({ filename, content }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          await fs.access(filepath);
          await fs.writeFile(filepath, content, 'utf-8');
          return `Successfully updated file: ${filename}`;
        } catch (error: any) {
          return `Error updating file: ${error.message}`;
        }
      },
    }),

    deleteFile: tool({
      description: 'Deletes a file from the scratchpad directory',
      parameters: z.object({
        filename: z.string(),
      }),
      execute: async ({ filename }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          await fs.unlink(filepath);
          return `Successfully deleted file: ${filename}`;
        } catch (error: any) {
          return `Error deleting file: ${error.message}`;
        }
      },
    }),

    appendToFile: tool({
      description: 'Appends content to an existing file',
      parameters: z.object({
        filename: z.string(),
        content: z.string(),
      }),
      execute: async ({ filename, content }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          await fs.appendFile(filepath, '\n' + content, 'utf-8');
          return `Successfully appended content to ${filename}`;
        } catch (error: any) {
          return `Error appending to file: ${error.message}`;
        }
      },
    }),

    getFileInfo: tool({
      description: 'Gets information about a file (size, creation date, etc)',
      parameters: z.object({
        filename: z.string(),
      }),
      execute: async ({ filename }) => {
        const filepath = path.join(SCRATCHPAD_DIR, filename);
        try {
          const stats = await fs.stat(filepath);
          return `File information for ${filename}:
          Size: ${stats.size} bytes
          Created: ${stats.birthtime}
          Last modified: ${stats.mtime}
          Last accessed: ${stats.atime}`;
        } catch (error: any) {
          return `Error getting file info: ${error.message}`;
        }
      },
    }),

    // Folder operations
    createFolder: tool({
      description: 'Creates a new folder in the scratchpad directory',
      parameters: z.object({
        folderPath: z.string(),
      }),
      execute: async ({ folderPath }) => {
        const fullPath = path.join(SCRATCHPAD_DIR, folderPath);
        try {
          await fs.mkdir(fullPath, { recursive: true });
          return `Successfully created folder: ${folderPath}`;
        } catch (error: any) {
          return `Error creating folder: ${error.message}`;
        }
      },
    }),

    removeFolder: tool({
      description:
        'Removes a folder and all its contents from the scratchpad directory',
      parameters: z.object({
        folderPath: z.string(),
      }),
      execute: async ({ folderPath }) => {
        const fullPath = path.join(SCRATCHPAD_DIR, folderPath);
        try {
          await fs.rm(fullPath, { recursive: true, force: true });
          return `Successfully removed folder: ${folderPath}`;
        } catch (error: any) {
          return `Error removing folder: ${error.message}`;
        }
      },
    }),

    listFolder: tool({
      description:
        'Lists all files and folders in the specified directory. Use "" or "." for root directory.',
      parameters: z.object({
        folderPath: z.string(),
      }),
      execute: async ({ folderPath }) => {
        const fullPath = path.join(SCRATCHPAD_DIR, folderPath);
        try {
          const items = await fs.readdir(fullPath, { withFileTypes: true });
          const files = items
            .filter((item) => item.isFile())
            .map((item) => `📄 ${item.name}`);
          const folders = items
            .filter((item) => item.isDirectory())
            .map((item) => `📁 ${item.name}`);

          if (items.length === 0) {
            return `Folder '${folderPath || 'root'}' is empty.`;
          }

          return `Contents of '${folderPath || 'root'}':\n\n${folders.join('\n')}\n${files.join('\n')}`;
        } catch (error: any) {
          return `Error listing folder contents: ${error.message}`;
        }
      },
    }),

    moveItem: tool({
      description: 'Moves a file or folder to a new location within scratchpad',
      parameters: z.object({
        sourcePath: z.string(),
        destinationPath: z.string(),
      }),
      execute: async ({ sourcePath, destinationPath }) => {
        const fullSourcePath = path.join(SCRATCHPAD_DIR, sourcePath);
        const fullDestPath = path.join(SCRATCHPAD_DIR, destinationPath);
        try {
          await fs.rename(fullSourcePath, fullDestPath);
          return `Successfully moved ${sourcePath} to ${destinationPath}`;
        } catch (error: any) {
          return `Error moving item: ${error.message}`;
        }
      },
    }),

    getFolderInfo: tool({
      description:
        'Gets information about a folder (size, item count, etc). Use "" or "." for root directory.',
      parameters: z.object({
        folderPath: z.string(),
      }),
      execute: async ({ folderPath }) => {
        const fullPath = path.join(SCRATCHPAD_DIR, folderPath);
        try {
          const stats = await fs.stat(fullPath);
          const items = await fs.readdir(fullPath, { withFileTypes: true });
          const fileCount = items.filter((item) => item.isFile()).length;
          const folderCount = items.filter((item) => item.isDirectory()).length;

          return `Folder information for '${folderPath || 'root'}':
          Total items: ${items.length}
          Files: ${fileCount}
          Folders: ${folderCount}
          Created: ${stats.birthtime}
          Last modified: ${stats.mtime}
          Last accessed: ${stats.atime}`;
        } catch (error: any) {
          return `Error getting folder info: ${error.message}`;
        }
      },
    }),
  },
});
