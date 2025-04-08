import { Branch } from "../models/Branch";
import { Message } from "../models/Message";
import { BranchRepository, BranchRepositoryImpl } from "../repository/database/BranchRepository";
import { MessageRepository } from "../repository/database/MessageRepository";
import { MessageRepositoryImpl } from "../repository/database/MessageRepositoryImpl";
import { logger } from "../utils/logger/winston-logger";

export class BranchService {
  private branchRepository: BranchRepository;
  private messageRepository: MessageRepository;
  
  constructor() {
    this.branchRepository = new BranchRepositoryImpl();
    this.messageRepository = new MessageRepositoryImpl();
  }
  
  async createBranch(
    conversationId: string, 
    originMessageId: string, 
    name: string, 
    description?: string
  ): Promise<Branch> {
    logger.info(`Creating branch from message ${originMessageId}`);
    
    const branch = new Branch();
    branch.conversationId = conversationId;
    branch.originMessageId = originMessageId;
    branch.name = name;
    branch.description = description;
    
    return this.branchRepository.create(branch);
  }
  
  async getBranchesByConversation(conversationId: string): Promise<Branch[]> {
    return this.branchRepository.findByConversationId(conversationId);
  }
  
  async setDefaultBranch(branchId: string): Promise<Branch> {
    return this.branchRepository.setDefaultBranch(branchId);
  }
  
  async getMessagesForBranch(conversationId: string, branchId: string): Promise<Message[]> {
    const branch = await this.branchRepository.findById(branchId);
    if (!branch) throw new Error("Branch not found");
    
    return this.messageRepository.findByConversationIdAndBranch(
      conversationId, 
      branch.id
    );
  }
} 