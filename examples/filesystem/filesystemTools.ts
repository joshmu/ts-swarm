import { z } from 'zod';
import { Agent } from '../../src/types';
import path from 'path';
import fs from 'fs/promises';

const SCRATCHPAD_DIR = path.join(process.cwd(), 'examples/scratchpad');

// Ensure scratchpad directory exists
await fs.mkdir(SCRATCHPAD_DIR, { recursive: true });

export const fileSystemTools: Agent['tools'] = [
  // File operations
  {
    id: 'createFile',
    description: 'Creates a new file in the scratchpad directory',
    parameters: z.object({
      filename: z
        .string()
        .describe(
          'The name of the file to create including the file extension otherwise use .txt',
        ),
      content: z.string().describe('The content of the file to create'),
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
  },

  {
    id: 'readFile',
    description: 'Reads the content of a file from the scratchpad directory',
    parameters: z.object({
      filename: z.string().describe('The name of the file to read'),
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
  },

  {
    id: 'updateFile',
    description:
      'Updates the content of an existing file in the scratchpad directory',
    parameters: z.object({
      filename: z.string().describe('The name of the file to update'),
      content: z.string().describe('The content of the file to update'),
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
  },

  {
    id: 'deleteFile',
    description: 'Deletes a file from the scratchpad directory',
    parameters: z.object({
      filename: z.string().describe('The name of the file to delete'),
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
  },

  {
    id: 'appendToFile',
    description: 'Appends content to an existing file',
    parameters: z.object({
      filename: z.string().describe('The name of the file to append to'),
      content: z.string().describe('The content to append to the file'),
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
  },

  {
    id: 'getFileInfo',
    description: 'Gets information about a file (size, creation date, etc)',
    parameters: z.object({
      filename: z
        .string()
        .describe('The name of the file to get information about'),
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
  },

  // Folder operations
  {
    id: 'createFolder',
    description: 'Creates a new folder in the scratchpad directory',
    parameters: z.object({
      folderPath: z.string().describe('The name of the folder path to create'),
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
  },

  {
    id: 'removeFolder',
    description:
      'Removes a folder and all its contents from the scratchpad directory',
    parameters: z.object({
      folderPath: z.string().describe('The name of the folder path to remove'),
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
  },

  {
    id: 'listFolder',
    description:
      'Lists all files and folders in the specified directory. Use "" or "." for root directory.',
    parameters: z.object({
      folderPath: z
        .string()
        .describe('The folder path to retrieve the list of files and folders'),
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
  },

  {
    id: 'moveItem',
    description: 'Moves a file or folder to a new location within scratchpad',
    parameters: z.object({
      sourcePath: z.string().describe('The path of the item to move'),
      destinationPath: z
        .string()
        .describe('The new path for the item to move to'),
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
  },

  {
    id: 'getFolderInfo',
    description:
      'Gets information about a folder (size, item count, etc). Use "" or "." for root directory.',
    parameters: z.object({
      folderPath: z
        .string()
        .describe('The folder path to retrieve the information about'),
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
  },
];
