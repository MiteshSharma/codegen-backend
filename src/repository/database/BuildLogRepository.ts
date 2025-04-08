import { Repository } from 'typeorm';
import { BuildLog } from '../../models/BuildLog';
import { AppDataSource } from '../config';

export interface BuildLogRepository {
  create(buildLog: Partial<BuildLog>): Promise<BuildLog>;
  update(id: string, buildLog: Partial<BuildLog>): Promise<BuildLog>;
  findByConversationId(conversationId: string): Promise<BuildLog[]>;
  findByBuildId(buildId: string): Promise<BuildLog[]>;
  findByMessageId(messageId: string): Promise<BuildLog[]>;
  findByDeploymentId(deploymentId: string): Promise<BuildLog[]>;
}

export class BuildLogRepositoryImpl implements BuildLogRepository {
  private repository: Repository<BuildLog>;

  constructor() {
    this.repository = AppDataSource.getRepository(BuildLog);
  }

  async create(buildLog: Partial<BuildLog>): Promise<BuildLog> {
    const newBuildLog = this.repository.create(buildLog);
    return this.repository.save(newBuildLog);
  }

  async update(id: string, buildLog: Partial<BuildLog>): Promise<BuildLog> {
    await this.repository.update(id, buildLog);
    const updated = await this.repository.findOneBy({ id });
    if (!updated) {
      throw new Error(`BuildLog with id ${id} not found`);
    }
    return updated;
  }

  async findByConversationId(conversationId: string): Promise<BuildLog[]> {
    return this.repository.find({
      where: { conversationId },
      order: { startedAt: 'ASC' }
    });
  }

  async findByBuildId(buildId: string): Promise<BuildLog[]> {
    return this.repository.find({
      where: { buildId },
      order: { startedAt: 'ASC' }
    });
  }

  async findByMessageId(messageId: string): Promise<BuildLog[]> {
    return this.repository.find({
      where: { messageId },
      order: { startedAt: 'ASC' }
    });
  }

  async findByDeploymentId(deploymentId: string): Promise<BuildLog[]> {
    return this.repository.find({
      where: { deploymentId },
      order: { startedAt: 'ASC' }
    });
  }
} 