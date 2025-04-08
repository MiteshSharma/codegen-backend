import { logger } from "../utils/logger/winston-logger";
import { Message } from "../models/Message";
import { Conversation } from "../models/Conversation";
import { MessageRole } from "../models/MessageRole";
import { MessageRepository } from "../repository/database/MessageRepository";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { LLMClientFactory } from "../domain/llm/LLMClientFactory";
import { LLMClient, LLMRequestOptions, LLMMessage } from "../domain/llm/LLMClient";
import { ConversationRepository } from "../repository/database/ConversationRepository";
import { ConversationRepositoryImpl } from "../repository/database/ConversationRepositoryImpl";
import { StorageService } from "./StorageService";
import { EventEmitter } from 'events';
import { ProjectService } from "./ProjectService";
import { LocalProjectStorage } from "../domain/project/implementations/local/LocalProjectStorage";
import { LocalFileOperations } from "../domain/project/implementations/local/LocalFileOperations";
import { LocalProjectBuilder } from "../domain/project/implementations/local/LocalProjectBuilder";
import { LocalDeployment } from "../domain/project/implementations/local/LocalDeployment";

export interface GeneratedFile {
  path: string;
  content: string;
  description?: string;
}

export interface CodeGenerationResponse {
  files: GeneratedFile[];
  explanation: string;
}

const getFrontendEngineerPrompt = (messageContent: string) => `
You are an expert senior frontend engineer and UI designer with deep expertise in React, TypeScript, and modern web development.
Your task is to generate production-ready code with beautiful, modern UI design based on the following instructions. Never miss to adda imported css file.

Project Context:
- This is a Create React App (CRA) project with TypeScript
- React version: 19.1.0
- TypeScript version: 4.9.5
- Node version: 20.11.1
- Testing setup: Jest with @testing-library/react
- ESLint and TypeScript configurations are CRA defaults
- Explicitly add all the file included imported css files. Like if you import a css file then create that file content.

Design Guidelines:
1. Modern & Clean Aesthetics:
   - Use a clean, minimalist design approach
   - Implement smooth transitions and animations
   - Maintain consistent spacing and alignment
   - Use modern shadows and subtle gradients
   - Implement responsive design for all screen sizes

2. Color Scheme:
   - Use a modern, cohesive color palette
   - Primary: #2563eb (Modern Blue)
   - Secondary: #4f46e5 (Deep Purple)
   - Accent: #f59e0b (Warm Orange)
   - Background: #f8fafc (Light Gray)
   - Text: #1e293b (Dark Blue Gray)
   - Success: #10b981 (Emerald)
   - Error: #ef4444 (Red)

3. Typography:
   - Primary Font: Inter (modern sans-serif)
   - Headings: font-family: 'Inter', sans-serif
   - Body: font-family: 'Inter', system-ui, -apple-system
   - Font Sizes (rem):
     - h1: 2.5rem
     - h2: 2rem
     - h3: 1.75rem
     - body: 1rem
     - small: 0.875rem

4. Component Design:
   - Use glassmorphism effects where appropriate
   - Implement hover and focus states
   - Add micro-interactions and transitions
   - Use CSS Grid and Flexbox for layouts
   - Maintain proper spacing (8px grid system)

5. UI Elements:
   - Buttons: Rounded corners, hover effects
   - Inputs: Clean borders, focus states
   - Cards: Subtle shadows, smooth hover transitions
   - Icons: Use consistent icon set (Heroicons or Material)
   - Loading States: Smooth animations

Project Structure:
src/
├── App.tsx               # Main App component
├── App.css              # App styles
├── styles/              # Shared styles
│   ├── variables.css    # CSS variables
│   ├── animations.css   # Animation keyframes
│   └── utilities.css    # Utility classes
├── components/          # Component directory
│   └── ui/             # Reusable UI components
└── assets/             # Images, icons, etc.

When generating code:
1. Use TypeScript with strict type checking
2. Follow React 19 best practices (hooks, functional components)
3. Include proper type definitions
4. Add tests using @testing-library/react
5. Implement responsive design
6. Add smooth animations and transitions
7. Use CSS variables for consistency
8. Include proper accessibility attributes

Response Format:
<lov-code>
<lov-write file_path="src/styles/variables.css">
// Global CSS variables
</lov-write>

<lov-write file_path="src/styles/animations.css">
// Animation keyframes and transitions
</lov-write>

<lov-write file_path="src/components/YourComponent.tsx">
// Component code with proper TypeScript types
</lov-write>

<lov-write file_path="src/App.tsx">
// Main App component code
</lov-write>

<lov-write file_path="src/App.css">
// App-specific styles using variables
</lov-write>
</lov-code>

CSS Best Practices:
1. Use CSS Grid and Flexbox for layouts
2. Implement mobile-first responsive design
3. Use CSS variables for colors and values
4. Add smooth transitions (0.2s duration)
5. Use proper spacing units (rem/em)
6. Implement hover and focus states
7. Add loading states and animations
8. Use modern CSS features (clamp, min, max)

Important:
- Provide the code content directly without language markers
- Include complete file content with imports
- Use modern CSS features and best practices
- Ensure responsive design works on all screens
- Add proper animations and transitions
- Include accessibility attributes
- File paths must start with 'src/'
- Include setup steps and style guide

Here is the content:
${messageContent}
`;

export class DeveloperAgentService {
  private messageRepository: MessageRepository;
  private conversationRepository: ConversationRepository;
  private storageService: StorageService;
  private projectService: ProjectService;
  
  constructor() {
    this.messageRepository = new MessageRepositoryImpl();
    this.conversationRepository = new ConversationRepositoryImpl();
    this.storageService = new StorageService();
    this.projectService = new ProjectService(
      new LocalProjectStorage(),
      new LocalFileOperations(),
      new LocalProjectBuilder(),
      new LocalDeployment()
    );
  }
  
  async processAgentMessage(
    message: Message,
    options: { stream?: boolean } = {}
  ): Promise<Message & { eventEmitter?: EventEmitter }> {
    try {
      logger.info(`Starting code generation request`, {
        conversationId: message.conversationId,
        messageId: message.id,
        content: message.content,
        streaming: options.stream
      });

      // Create a placeholder assistant message
      const response = await this.createPlaceholderResponse(message);
      
      // Get conversation history
      const conversation = await this.conversationRepository.findById(message.conversationId);
      if (!conversation) {
        throw new Error(`Conversation not found: ${message.conversationId}`);
      }
      
      // Parse the files from the message content first
      const files = this.parseContent(message.content);
      logger.info('================== Parsed files from message content ==================');
      if (files.length > 0) {
        // If we already have parsed files, save them directly
        const savedFiles = await this.saveGeneratedFiles(
          files.map(f => ({ ...f, description: 'Updated from message content' })),
          message.conversationId,
          message.branch || 'main'
        );
        response.metadata = {
          ...(response.metadata || {}),
          generatedFiles: savedFiles
        };
        return this.messageRepository.update(response.id, response);
      }
      
      // Initialize LLM client
      const model = this.getModelForConversation(conversation);
      const llmClient = LLMClientFactory.createClient(model);
      
      // Prepare conversation history with the frontend engineer prompt
      const llmMessages = llmClient.prepareConversationHistory(
        {
          ...conversation,
          systemMessage: getFrontendEngineerPrompt(message.content)
        }, 
        await this.messageRepository.findByConversationIdAndBranch(conversation.id, message.branch || 'main'),
        message
      );

      // Get conversation settings
      const llmOptions = {
        ...this.getConversationOptions(conversation),
        stream: options.stream
      };

      if (options.stream) {
        return this.handleStreamingResponse(llmClient, llmMessages, llmOptions, response, conversation);
      } else {
        return this.handleNonStreamingResponse(llmMessages, llmOptions, message);
      }

    } catch (error) {
      logger.error(`Error in code generation process`, {
        error: (error as Error).message,
        stack: (error as Error).stack,
        conversationId: message.conversationId,
        messageId: message.id
      });
      throw new Error(`Code generation error: ${(error as Error).message}`);
    }
  }

  private async handleStreamingResponse(
    llmClient: LLMClient,
    llmMessages: any[],
    options: LLMRequestOptions,
    response: Message,
    conversation: Conversation
  ): Promise<Message & { eventEmitter: EventEmitter }> {
    const eventEmitter = new EventEmitter();
    let accumulatedContent = '';
    
    try {
      // Start processing stream in background
      (async () => {
        try {
          const stream = await llmClient.generateStreamingResponse(llmMessages, options);
          
          for await (const chunk of stream) {
            accumulatedContent += chunk.content;
            
            // Emit content update immediately for each chunk
            eventEmitter.emit('data', {
              type: 'content_update',
              data: {
                messageId: response.id,
                conversationId: conversation.id,
                content: accumulatedContent,
                done: false
              },
              timestamp: Date.now()
            });
          }

          // Now that streaming is complete, parse and write files
          const files = this.parseContent(accumulatedContent);
          if (files.length > 0) {
            await this.projectService.updateProjectFiles(
              conversation.id,
              files.map(f => ({
                path: f.path,
                content: f.content
              })),
              eventEmitter
            );
          }

          // Update final message content
          await this.messageRepository.update(response.id, {
            content: accumulatedContent
          });

          // Emit completion event
          eventEmitter.emit('complete', {
            type: 'complete',
            data: {
              messageId: response.id,
              conversationId: conversation.id,
              content: accumulatedContent,
              done: true
            },
            timestamp: Date.now()
          });

        } catch (error) {
          logger.error('Error in streaming response:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            conversationId: conversation.id
          });
          eventEmitter.emit('error', {
            type: 'error',
            data: { error: error instanceof Error ? error.message : 'Unknown error' },
            timestamp: Date.now()
          });
        }
      })();

      // Return response with event emitter immediately
      const responseWithEmitter = Object.assign(response, { eventEmitter });
      return responseWithEmitter;

    } catch (error) {
      logger.error('Error setting up streaming:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: conversation.id
      });
      throw error;
    }
  }

  private async handleNonStreamingResponse(
    llmMessages: LLMMessage[],
    options: LLMRequestOptions,
    message: Message
  ): Promise<Message> {
    try {
      const llmClient = LLMClientFactory.createClient(options.model || 'gpt-4');
      const llmResponse = await llmClient.generateResponse(llmMessages, options);

      // Create response message
      const response = await this.messageRepository.create({
        conversationId: message.conversationId,
        role: MessageRole.ASSISTANT,
        content: llmResponse.content,
        parentMessageId: message.id
      });

      // Parse and save files
      const files = this.parseContent(llmResponse.content);
      if (files.length > 0) {
        // Update project files
        const emitter = new EventEmitter();
        await this.projectService.updateProjectFiles(
          message.conversationId,
          files.map(f => ({
            path: f.path,
            content: f.content
          })),
          emitter
        );
      }

      return response;

    } catch (error) {
      logger.error('Error in non-streaming response:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId: message.conversationId
      });
      throw error;
    }
  }

  private async saveGeneratedFiles(
    files: GeneratedFile[],
    conversationId: string,
    branch: string
  ): Promise<Array<{ path: string; localPath: string; description?: string }>> {
    return Promise.all(files.map(async file => {
      logger.debug(`Saving file`, {
        path: file.path,
        contentLength: file.content.length,
        description: file.description
      });

      await this.storageService.saveFile(
        conversationId,
        branch,
        file.path,
        file.content
      );

      return {
        path: file.path,
        localPath: this.storageService.getFileUrl(conversationId, branch, file.path),
        description: file.description
      };
    }));
  }

  private createPlaceholderResponse(message: Message): Promise<Message> {
    const response = new Message();
    response.conversationId = message.conversationId;
    response.parentMessageId = message.id;
    response.role = MessageRole.ASSISTANT;
    response.content = ""; // Empty content initially
    response.metadata = {
      isCodeGeneration: true,
      generatedFiles: []
    };
    
    return this.messageRepository.create(response);
  }
  
  private getConversationOptions(conversation: Conversation): LLMRequestOptions {
    const settings = conversation.settings || {};
    
    return {
      temperature: settings.temperature ?? 0.2, // Lower temperature for more consistent code
      topP: settings.topP ?? 1.0,
      presencePenalty: settings.presencePenalty ?? 0,
      frequencyPenalty: settings.frequencyPenalty ?? 0,
      maxTokens: settings.maxTokens ?? 4096 // Increased for larger code generations
    };
  }
  
  private getModelForConversation(conversation: Conversation): string {
    // Use GPT-4 by default for better code generation
    return conversation.settings?.model || "gpt-4";
  }

  private parseContent(content: string): Array<{ path: string; content: string }> {
    const fileData: Array<{ path: string; content: string }> = [];
    
    // Match <lov-write file_path="...">...</lov-write> tags
    const regex = /<lov-write file_path="([^"]+)">([\s\S]*?)<\/lov-write>/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
        const filePath = match[1]; // Extracted file path
        const fileContent = match[2].trim(); // Extracted content
        fileData.push({ path: filePath, content: fileContent });
    }

    return fileData;
  }
} 