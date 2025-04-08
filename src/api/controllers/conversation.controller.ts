import { NextFunction, Request, Response } from "express";
import { logger } from "../../utils/logger/winston-logger";
import { ConversationService } from "../../services/ConversationService";

export class ConversationController {
  private conversationService: ConversationService;
  
  constructor() {
    this.conversationService = new ConversationService();
  }
  
  /**
   * Get all conversations
   */
  async getConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // For now using hardcoded user ID - in real app would come from auth
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      
      const conversations = await this.conversationService.getConversations(userId);
      
      // Format conversations for response
      const formattedConversations = conversations.map(conversation => ({
        id: conversation.id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        settings: conversation.settings,
        systemMessage: conversation.systemMessage,
        title: conversation.title || 'New Conversation',
        // lastMessageAt: conversation.lastMessageAt
      }));

      res.json({
        conversations: formattedConversations
      });

    } catch (error) {
      logger.error('Error getting conversations:', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      next(error);
    }
  }

  /**
   * Get messages for a conversation
   */
  async getConversationMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      if (!conversationId) {
        res.status(400).json({
          error: {
            message: "Conversation ID is required"
          }
        });
        return;
      }

      const messages = await this.conversationService.getConversationMessages(conversationId);
      
      // Format messages for response
      const formattedMessages = messages.map(message => ({
        messageId: message.id,
        conversationId: message.conversationId,
        text: message.content,
        role: message.role,
        tokenCount: message.tokenCount || 0,
        parentMessageId: message.parentMessageId,
        tokenUsage: {
          promptTokens: 0,
          completionTokens: message.tokenCount || 0,
          totalTokens: message.tokenCount || 0
        },
        isAgentResponse: message.metadata?.isAgentResponse === true,
        finish_reason: "stop",
        createdAt: message.createdAt
      }));

      res.json({
        messages: formattedMessages
      });

    } catch (error) {
      logger.error('Error getting conversation messages:', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: req.params.conversationId
      });
      next(error);
    }
  }

  async buildDeploy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conversationId } = req.params;
      const { branch = 'main' } = req.body; // Extract branch from request body

      // Set SSE headers for real-time updates
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Handle client disconnect
      const cleanup = () => {
        logger.info('Client disconnected from build/deploy stream');
      };
      req.on('close', cleanup);

      // Start build and deploy process with progress updates
      const result = await this.conversationService.buildDeploy(
        conversationId,
        (event) => {
          if (!res.writableEnded) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
            res.flush(); // Force sending data
          }
        },
        branch // Pass the branch parameter correctly
      );

      // Send final result
      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({ type: 'complete', data: result })}\n\n`);
        res.end();
      }

      cleanup();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Error in build/deploy process:', {
        error: errorMessage,
        conversationId: req.params.conversationId
      });

      if (!res.writableEnded) {
        res.write(`data: ${JSON.stringify({
          type: 'error',
          data: { error: errorMessage }
        })}\n\n`);
        res.end();
      }
      next(error);
    }
  }
}