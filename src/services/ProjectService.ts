import { FileOperations } from "../domain/project/interfaces/FileOperations";
import { ProjectStorage } from "../domain/project/interfaces/ProjectStorage";
import { ProjectBuilder } from "../domain/project/interfaces/ProjectBuilder";
import { Deployment } from "../domain/project/interfaces/Deployment";
import { BuildLog, BuildResult } from "../domain/project/types/BuildTypes";
import { DeploymentResult } from "../domain/project/types/DeploymentTypes";
import { EventEmitter } from "events";
import { logger } from "../utils/logger/winston-logger";

export class ProjectService {
  constructor(
    private projectStorage: ProjectStorage,
    private fileOperations: FileOperations,
    private projectBuilder: ProjectBuilder,
    private deployment: Deployment
  ) {}

  async handleFirstMessage(conversationId: string): Promise<{
    success: boolean;
    projectId: string;
    eventEmitter: EventEmitter;
  }> {
    const projectId = conversationId;
    const emitter = new EventEmitter();

    try {
      // Initialize project from base template
      await this.projectStorage.initializeProject(projectId);
      
      emitter.emit('status', { 
        type: 'info', 
        message: 'Project initialized' 
      });

      return {
        success: true,
        projectId,
        eventEmitter: emitter
      };

    } catch (error) {
      logger.error('Failed to handle first message:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        projectId
      });
      
      emitter.emit('error', error);
      return {
        success: false,
        projectId,
        eventEmitter: emitter
      };
    }
  }

  async updateProjectFiles(
    projectId: string, 
    files: Array<{ path: string; content: string }>,
    emitter: EventEmitter
  ): Promise<boolean> {
    try {
      for (const file of files) {
        // Remove any leading slashes to ensure proper path joining
        const normalizedPath = file.path.replace(/^\/+/, '');
        await this.fileOperations.writeFile(projectId, normalizedPath, file.content);
        emitter.emit('fileUpdate', { 
          path: normalizedPath, 
          status: 'updated' 
        });
      }

      // Trigger build after files are updated
      const buildResult = await this.projectBuilder.build(
        { projectId },
        (log: BuildLog) => {
          emitter.emit('buildProgress', log);
        }
      );

      if (buildResult.success) {
        // Deploy if build successful
        const deployResult = await this.deployment.deploy(
          buildResult.buildId,
          projectId
        );

        emitter.emit('status', {
          type: 'success',
          message: 'Build and deployment completed',
          previewUrl: deployResult.previewUrl
        });

        return true;
      }

      return false;

    } catch (error) {
      logger.error('Failed to update project files:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        projectId
      });
      emitter.emit('error', error);
      return false;
    }
  }

  async buildProject(
    conversationId: string,
    onProgress: (log: BuildLog) => void
  ): Promise<BuildResult> {
    try {
      const buildConfig = {
        projectId: conversationId,
        buildCommand: 'npm run build',
        environment: {
          NODE_ENV: 'production'
        }
      };

      console.log('buildConfig----------------------------------', buildConfig);

      return await this.projectBuilder.build(buildConfig, onProgress);
    } catch (error) {
      logger.error('Error building project:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId
      });
      throw error;
    }
  }

  async deployProject(conversationId: string, buildId: string) {
    try {
      logger.info(`Starting deployment for conversation ${conversationId} with build ${buildId}`);
      
      const projectPath = await this.projectStorage.getProjectPath(conversationId);
      const result = await this.deployment.deploy(buildId, projectPath);
      
      return result;
    } catch (error) {
      logger.error('Error deploying project:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId,
        buildId
      });
      throw error;
    }
  }

  async getPreviewUrl(deploymentId: string): Promise<string> {
    try {
      return await this.deployment.getPreviewUrl(deploymentId);
    } catch (error) {
      logger.error('Error getting preview URL:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        deploymentId
      });
      throw error;
    }
  }
}