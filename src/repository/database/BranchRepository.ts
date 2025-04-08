import { Branch } from "../../models/Branch";
import { AppDataSource } from "../config";

export interface BranchRepository {
  create(branch: Branch): Promise<Branch>;
  findById(id: string): Promise<Branch | null>;
  findByConversationId(conversationId: string): Promise<Branch[]>;
  setDefaultBranch(branchId: string): Promise<Branch>;
}

export class BranchRepositoryImpl implements BranchRepository {
  private repository = AppDataSource.getRepository(Branch);
  
  async create(branch: Branch): Promise<Branch> {
    return this.repository.save(branch);
  }
  
  async findById(id: string): Promise<Branch | null> {
    return this.repository.findOneBy({ id });
  }
  
  async findByConversationId(conversationId: string): Promise<Branch[]> {
    return this.repository.find({
      where: { conversationId },
      order: { createdAt: "ASC" }
    });
  }
  
  async setDefaultBranch(branchId: string): Promise<Branch> {
    // First, unset any existing default branch for this conversation
    const branch = await this.repository.findOneBy({ id: branchId });
    if (!branch) throw new Error("Branch not found");
    
    await this.repository.update(
      { conversationId: branch.conversationId, isDefault: true },
      { isDefault: false }
    );
    
    // Then set this branch as default
    branch.isDefault = true;
    return this.repository.save(branch);
  }
} 