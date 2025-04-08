import { FileOperations } from '../../interfaces/FileOperations';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../../../utils/logger/winston-logger';

const GENERATED_PROJECTS_PATH = path.join(process.cwd(), 'generated-projects');

export class LocalFileOperations implements FileOperations {
  constructor() {
    // Ensure generated-projects directory exists
    fs.mkdir(GENERATED_PROJECTS_PATH, { recursive: true }).catch(error => {
      logger.error('Failed to create generated-projects directory', { error });
    });
  }

  async writeFile(projectId: string, filePath: string, content: string): Promise<void> {
    try {
      const fullPath = path.join(GENERATED_PROJECTS_PATH, projectId, filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      logger.info(`Written file ${filePath} for project ${projectId}`);
    } catch (error) {
      logger.error('Error writing file:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        filePath
      });
      throw error;
    }
  }

  async readFile(projectId: string, filePath: string): Promise<string> {
    const fullPath = path.join(GENERATED_PROJECTS_PATH, projectId, filePath);
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      logger.error('Error reading file:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        filePath
      });
      throw error;
    }
  }

  async deleteFile(projectId: string, filePath: string): Promise<void> {
    const fullPath = path.join(GENERATED_PROJECTS_PATH, projectId, filePath);
    try {
      await fs.unlink(fullPath);
      logger.info(`Deleted file ${filePath} for project ${projectId}`);
    } catch (error) {
      logger.error('Error deleting file:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId,
        filePath
      });
      throw error;
    }
  }

  async listFiles(projectId: string): Promise<string[]> {
    const projectPath = path.join(GENERATED_PROJECTS_PATH, projectId);
    try {
      const files = await fs.readdir(projectPath, { recursive: true });
      return files.filter(file => typeof file === 'string') as string[];
    } catch (error) {
      logger.error('Error listing files:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId
      });
      throw error;
    }
  }
}