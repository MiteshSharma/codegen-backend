import { Request, Response } from "express";
import { BranchService } from "../../services/BranchService";
import { logger } from "../../utils/logger/winston-logger";

export class BranchController {
  private service: BranchService;
  
  constructor() {
    this.service = new BranchService();
  }
  
  async createBranch(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId, originMessageId, name, description } = req.body;
      
      const branch = await this.service.createBranch(
        conversationId,
        originMessageId,
        name,
        description
      );
      
      res.status(201).json(branch);
    } catch (error: any) {
      logger.error(`Error creating branch: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async getBranchesByConversation(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId } = req.params;
      
      const branches = await this.service.getBranchesByConversation(conversationId);
      
      res.status(200).json(branches);
    } catch (error: any) {
      logger.error(`Error getting branches: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async setDefaultBranch(req: Request, res: Response): Promise<void> {
    try {
      const { branchId } = req.params;
      
      const branch = await this.service.setDefaultBranch(branchId);
      
      res.status(200).json(branch);
    } catch (error: any) {
      logger.error(`Error setting default branch: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
  
  async getMessagesForBranch(req: Request, res: Response): Promise<void> {
    try {
      const { branchId } = req.params;
      const { conversationId } = req.query as { conversationId: string };
      
      const messages = await this.service.getMessagesForBranch(conversationId, branchId);
      
      res.status(200).json(messages);
    } catch (error: any) {
      logger.error(`Error getting messages for branch: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  }
} 