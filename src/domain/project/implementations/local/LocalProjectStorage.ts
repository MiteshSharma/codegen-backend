import * as fs from 'fs/promises';
import * as path from 'path';
import { ProjectStorage } from '../../interfaces/ProjectStorage';
import { logger } from '../../../../utils/logger/winston-logger';

export class LocalProjectStorage implements ProjectStorage {
  private baseProjectPath: string;
  private generatedProjectsPath: string;

  constructor(
    baseProjectPath: string = path.join(process.cwd(), 'base_project'),
    generatedProjectsPath: string = path.join(process.cwd(), 'generated-projects')
  ) {
    this.baseProjectPath = baseProjectPath;
    this.generatedProjectsPath = generatedProjectsPath;
  }

  async initializeProject(conversationId: string): Promise<void> {
    const targetPath = path.join(this.generatedProjectsPath, conversationId);
    
    try {
      await fs.mkdir(this.generatedProjectsPath, { recursive: true });
      await this.copyDirectory(this.baseProjectPath, targetPath);
      logger.info(`Initialized project for conversation ${conversationId}`);
    } catch (error) {
      logger.error('Error initializing project:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId
      });
      throw error;
    }
  }

  async projectExists(conversationId: string): Promise<boolean> {
    try {
      await fs.access(path.join(this.generatedProjectsPath, conversationId));
      return true;
    } catch {
      return false;
    }
  }

  async getProjectPath(conversationId: string): Promise<string> {
    return path.join(this.generatedProjectsPath, conversationId);
  }

  async downloadProject(): Promise<void> {
    // No-op for local implementation
  }

  async uploadProject(): Promise<void> {
    // No-op for local implementation
  }

  private async copyDirectory(src: string, dest: string): Promise<void> {
    await fs.mkdir(dest, { recursive: true });
    const entries = await fs.readdir(src, { withFileTypes: true });

    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);

      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }
}