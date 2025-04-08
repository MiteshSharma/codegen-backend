import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from "../utils/logger/winston-logger";

const GENERATED_PROJECTS_PATH = path.join(process.cwd(), 'generated-projects');

export class StorageService {
  constructor() {
    // Ensure projects directory exists
    fs.mkdir(GENERATED_PROJECTS_PATH, { recursive: true }).catch(error => {
      logger.error('Failed to create projects directory', { error });
    });
  }
  
  /**
   * Saves a file to local filesystem
   */
  async saveFile(
    conversationId: string,
    branch: string,
    filepath: string,
    content: string
  ): Promise<void> {
    // Remove any leading slashes to ensure proper path joining
    const normalizedPath = filepath.replace(/^\/+/, '');
    const fullPath = this.getStoragePath(conversationId, branch, normalizedPath);
    
    try {
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      
      // Write file
      await fs.writeFile(fullPath, content, 'utf-8');
      
      logger.info(`Saved file locally`, {
        conversationId,
        branch,
        filepath: normalizedPath,
        fullPath
      });
    } catch (error) {
      logger.error(`Error saving file`, {
        error: (error as Error).message,
        conversationId,
        branch,
        filepath: normalizedPath
      });
      throw new Error(`Storage error: ${(error as Error).message}`);
    }
  }
  
  /**
   * Gets the local file path
   */
  getFileUrl(
    conversationId: string,
    branch: string,
    filepath: string
  ): string {
    // Remove any leading slashes to ensure proper path joining
    const normalizedPath = filepath.replace(/^\/+/, '');
    return this.getStoragePath(conversationId, branch, normalizedPath);
  }
  
  /**
   * Generates the storage path for a file
   */
  private getStoragePath(
    conversationId: string,
    branch: string,
    filepath: string
  ): string {
    return path.join(GENERATED_PROJECTS_PATH, conversationId, branch, filepath);
  }
} 