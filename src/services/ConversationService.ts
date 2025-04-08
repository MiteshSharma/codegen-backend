import { Conversation } from "../models/Conversation";
import { ConversationRepository } from "../repository/database/ConversationRepository";
import { ConversationRepositoryImpl } from "../repository/database/ConversationRepositoryImpl";
import { logger } from "../utils/logger/winston-logger";
import { MessageRepository } from "../repository/database/MessageRepository";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { Message } from "../models/Message";
import { ProjectService } from "./ProjectService";
import { LocalProjectStorage } from "../domain/project/implementations/local/LocalProjectStorage";
import { LocalFileOperations } from "../domain/project/implementations/local/LocalFileOperations";
import { LocalProjectBuilder } from "../domain/project/implementations/local/LocalProjectBuilder";
import { LocalDeployment } from "../domain/project/implementations/local/LocalDeployment";
import { EventEmitter } from 'events';
import { BuildLogRepository, BuildLogRepositoryImpl } from "../repository/database/BuildLogRepository";
import { BuildLog, BuildLogType, LogEntry } from "../models/BuildLog";

export interface BuildDeployResult {
  success: boolean;
  buildId?: string;
  deploymentId?: string;
  previewUrl?: string;
  error?: string;
}

export class ConversationService {
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;
  private projectService: ProjectService;
  private buildLogRepository: BuildLogRepository;
  
  constructor() {
    this.conversationRepository = new ConversationRepositoryImpl();
    this.messageRepository = new MessageRepositoryImpl();
    this.buildLogRepository = new BuildLogRepositoryImpl();
    this.projectService = new ProjectService(
      new LocalProjectStorage(),
      new LocalFileOperations(),
      new LocalProjectBuilder(),
      new LocalDeployment()
    );
  }
  
  async getConversations(userId: string): Promise<Conversation[]> {
    try {
      // Get all conversations for user, ordered by last message time
      const conversations = await this.conversationRepository.findByUserId(userId);
      
      return conversations.sort((a, b) => {
        const aTime = a.createdAt;
        const bTime = b.createdAt;
        return bTime.getTime() - aTime.getTime(); // Sort newest first
      });
      
    } catch (error) {
      logger.error('Error fetching conversations:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId
      });
      throw error;
    }
  }

  async getConversationMessages(conversationId: string): Promise<Message[]> {
    try {
      const messages = await this.messageRepository.findByConversationId(conversationId);
      return messages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    } catch (error) {
      logger.error('Error fetching conversation messages:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId
      });
      throw error;
    }
  }

  async buildDeploy(
    conversationId: string,
    onProgress: (event: any) => void,
    branch: string = 'main'
  ): Promise<BuildDeployResult> {
    try {
      logger.info(`Starting build and deploy process for conversation ${conversationId} on branch ${branch}`);
      
      // Get latest message from the conversation
      const latestMessage = await this.messageRepository.findOne({
        where: { conversationId, branch },
        order: { createdAt: 'DESC' }
      });

      if (!latestMessage) {
        throw new Error('No messages found in conversation');
      }
      
      const eventEmitter = new EventEmitter();
      const buildLogs: LogEntry[] = [];
      
      // Create initial build log entry
      const buildLogEntry = await this.buildLogRepository.create({
        type: 'build',
        conversationId,
        messageId: latestMessage.id,
        status: 'in_progress',
        startedAt: new Date(),
        logs: []
      });

      // Set up event handling if onProgress callback is provided
      if (onProgress) {
        const handleEvent = (data: any) => {
          const logEntry: LogEntry = {
            timestamp: new Date(),
            message: data.message || JSON.stringify(data),
            metadata: data
          };
          buildLogs.push(logEntry);
          onProgress({ type: 'build_progress', data });
        };

        eventEmitter.on('build_started', handleEvent);
        eventEmitter.on('build_progress', handleEvent);
        eventEmitter.on('build_complete', handleEvent);
        eventEmitter.on('build_error', handleEvent);
      }

      // Start build process
      eventEmitter.emit('build_started', { message: 'Build process started' });
      const buildResult = await this.projectService.buildProject(conversationId, (log) => {
        eventEmitter.emit('build_progress', log);
      });

      if (!buildResult.success) {
        const error = `Build failed: ${buildResult.logs[buildResult.logs.length - 1]?.message}`;
        eventEmitter.emit('build_error', { message: error });
        
        // Update build log entry with failure
        await this.buildLogRepository.update(buildLogEntry.id, {
          status: 'failed',
          success: false,
          error,
          logs: buildLogs,
          completedAt: new Date()
        });
        
        return { success: false, error };
      }

      eventEmitter.emit('build_complete', { message: 'Build completed successfully' });

      // Update build log entry with success
      await this.buildLogRepository.update(buildLogEntry.id, {
        status: 'completed',
        success: true,
        logs: buildLogs,
        buildId: buildResult.buildId,
        completedAt: new Date()
      });

      // Create deploy log entry
      const deployLogs: LogEntry[] = [];
      const deployLogEntry = await this.buildLogRepository.create({
        type: 'deploy',
        conversationId,
        messageId: latestMessage.id,
        buildId: buildResult.buildId,
        status: 'in_progress',
        startedAt: new Date(),
        logs: []
      });

      // Start deployment process
      deployLogs.push({
        timestamp: new Date(),
        message: 'Deployment process started',
        metadata: { buildId: buildResult.buildId }
      });

      if (onProgress) {
        onProgress({ type: 'deploy_progress', data: { message: 'Deployment process started' } });
      }

      const deployResult = await this.projectService.deployProject(conversationId, buildResult.buildId);

      if (!deployResult.success) {
        const error = `Deployment failed: ${deployResult.error}`;
        deployLogs.push({
          timestamp: new Date(),
          message: error,
          metadata: { error }
        });
        
        if (onProgress) {
          onProgress({ type: 'deploy_progress', data: { message: error } });
        }

        // Update deploy log entry with failure
        await this.buildLogRepository.update(deployLogEntry.id, {
          status: 'failed',
          success: false,
          error,
          logs: deployLogs,
          completedAt: new Date()
        });
        
        return { success: false, error };
      }

      // Get preview URL
      const previewUrl = await this.projectService.getPreviewUrl(deployResult.deploymentId);

      deployLogs.push({
        timestamp: new Date(),
        message: 'Deployment completed successfully',
        metadata: { deploymentId: deployResult.deploymentId, previewUrl }
      });

      if (onProgress) {
        onProgress({ type: 'deploy_progress', data: { message: 'Deployment completed successfully' } });
      }

      // Update deploy log entry with success
      await this.buildLogRepository.update(deployLogEntry.id, {
        status: 'completed',
        success: true,
        logs: deployLogs,
        deploymentId: deployResult.deploymentId,
        previewUrl,
        completedAt: new Date()
      });

      return {
        success: true,
        buildId: buildResult.buildId,
        deploymentId: deployResult.deploymentId,
        previewUrl
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error in build/deploy process:`, {
        error: errorMessage,
        conversationId,
        branch
      });
      
      // Get latest message for error log
      const latestMessage = await this.messageRepository.getLatestMessageByConversationId(conversationId, branch);
      
      if (latestMessage) {
        // Create error log entry
        await this.buildLogRepository.create({
          type: 'build',
          conversationId,
          messageId: latestMessage.id,
          status: 'failed',
          success: false,
          error: errorMessage,
          logs: [{
            timestamp: new Date(),
            message: errorMessage
          }],
          startedAt: new Date(),
          completedAt: new Date()
        });
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private async logBuildEvent(
    type: BuildLogType,
    conversationId: string,
    messageId: string,
    data: any,
    success: boolean = true
  ): Promise<void> {
    try {
      await this.buildLogRepository.create({
        type,
        conversationId,
        messageId,
        buildId: data.buildId,
        deploymentId: data.deploymentId,
        logs: [{
          timestamp: new Date(),
          message: data.message || JSON.stringify(data),
          metadata: data
        }],
        success,
        previewUrl: data.previewUrl
      });
    } catch (error) {
      logger.error(`Error logging build event:`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        type,
        conversationId,
        messageId
      });
    }
  }
}
