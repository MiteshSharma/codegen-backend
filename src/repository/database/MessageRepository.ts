import { Message } from "../../models/Message";
import { FindOneOptions } from "typeorm";

export interface MessageRepository {
  findById(id: string): Promise<Message | null>;
  findByConversationId(conversationId: string): Promise<Message[]>;
  findByConversationIdAndBranch(conversationId: string, branch?: string): Promise<Message[]>;
  create(message: Partial<Message>): Promise<Message>;
  update(id: string, message: Partial<Message>): Promise<Message>;
  getLatestMessageByConversationId(conversationId: string, branch?: string): Promise<Message | null>;
  findOne(options: FindOneOptions<Message>): Promise<Message | null>;
} 