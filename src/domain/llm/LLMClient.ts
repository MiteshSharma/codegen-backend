import { Message } from "../../models/Message";
import { Conversation } from "../../models/Conversation";

export interface LLMTokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMMessage {
  role: string;
  content: string;
  name?: string;
}

export interface LLMRequestOptions {
  model?: string;
  temperature?: number;
  topP?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  stream?: boolean;
  functions?: Array<{
    name: string;
    description?: string;
    parameters?: Record<string, any>;
  }>;
}

export interface LLMResponse {
  content: string;
  tokenUsage: LLMTokenUsage;
  model: string;
  finishReason: string;
}

export interface LLMStreamChunk {
  content: string;
  tokenUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMClient {
  generateResponse(messages: LLMMessage[], options: LLMRequestOptions): Promise<LLMResponse>;
  generateTextCompletion(prompt: string, options: LLMRequestOptions): Promise<LLMResponse>;
  streamChatResponse(messages: LLMMessage[], options: LLMRequestOptions, onChunk: (chunk: string) => void): Promise<LLMResponse>;
  countTokens(messages: LLMMessage[]): number;
  prepareConversationHistory(conversation: Conversation, messages: Message[], currentMessage: Message): LLMMessage[];
  getModelName(): string;
  generateStreamingResponse(messages: LLMMessage[], options?: LLMRequestOptions): AsyncGenerator<LLMStreamChunk>;
} 