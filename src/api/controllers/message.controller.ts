import { NextFunction, Request, Response } from "express";
import { fromZodError } from "zod-validation-error";
import { MessageRequestSchema } from "../dto/message.dto";
import { MessageService } from "../../services/MessageService";
import { DeveloperAgentService } from "../../services/DeveloperAgentService";
import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";
import { logger } from "../../utils/logger/winston-logger";
import { LLMClientFactory } from "../../domain/llm/LLMClientFactory";
import { StreamEvent } from "@/models/events";

export class MessageController {
  private messageService: MessageService;
  private agentService: DeveloperAgentService;
  
  constructor() {
    this.messageService = new MessageService();
    this.agentService = new DeveloperAgentService();
  }
  
  /**
   * Process a new message
   */
  async processMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validate request body against schema
      const result = MessageRequestSchema.safeParse(req.body);
      
      if (!result.success) {
        const validationError = fromZodError(result.error);
        res.status(400).json({
          error: {
            message: "Invalid message request",
            details: validationError.details
          }
        });
        return;
      }

      const messageRequest = result.data;
      
      // Use a temporary user ID - in a real app, this would come from authentication
      const userId = "550e8400-e29b-41d4-a716-446655440000";
      
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      
      //Add a forloop to send a message to the user
      for (let i = 0; i < 10; i++) {
        res.write(`data: ${JSON.stringify({ message: `Hello, this is a test message ${i}` })}\n\n`
        res.flush(); // Force sending data
      }
      
      // Handle client disconnect
      const cleanup = () => {
        logger.info('Client disconnected, cleaning up resources');
      };
      
      req.on('close', cleanup);
      
      try {
        const { conversation, userMessage } = 
          await this.messageService.saveUserMessage(messageRequest, userId);

        const response = await this.agentService.processAgentMessage(
          userMessage, 
          { stream: messageRequest.stream }
        );

        if (response.eventEmitter) {
          // Handle streaming events
          response.eventEmitter.on('data', (event: any) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify(event)}\n\n`);
              res.flush(); // Force sending data
            }
          });

          response.eventEmitter.on('complete', (event: any) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify(event)}\n\n`);
              res.flush(); // Force sending data
              res.end();
              cleanup();
            }
          });

          response.eventEmitter.on('error', (event: any) => {
            if (!res.writableEnded) {
              res.write(`data: ${JSON.stringify(event)}\n\n`);
              res.flush(); // Force sending data
              res.end();
              cleanup();
            }
          });
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error processing message:', { error: errorMessage });
        
        if (!res.writableEnded) {
          const streamEvent: StreamEvent = {
            type: 'error',
            data: { error: errorMessage },
            timestamp: Date.now()
          };
          res.write(`data: ${JSON.stringify(streamEvent)}\n\n`);
          res.flush(); // Force sending data
          res.end();
        }
        cleanup();
      }
      
    } catch (error) {
      next(error);
    }
  }

  private formatAgentResponse(response: Message, conversation: Conversation) {
    return {
      messageId: response.id,
      conversationId: conversation.id,
      text: response.content,
      role: response.role,
      tokenCount: response.tokenCount || 0,
      parentMessageId: response.parentMessageId,
      tokenUsage: {
        promptTokens: 0, // This would need proper calculation
        completionTokens: response.tokenCount || 0,
        totalTokens: response.tokenCount || 0
      },
      isAgentResponse: response.metadata?.isAgentResponse === true,
      finish_reason: "stop",
      createdAt: response.createdAt
    };
  }

}


