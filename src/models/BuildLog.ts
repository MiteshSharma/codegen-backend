import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type BuildLogType = 'build' | 'deploy';
export type BuildLogStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface LogEntry {
  timestamp: Date;
  message: string;
  metadata?: any;
}

@Entity('build_logs')
export class BuildLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  conversationId: string;

  @Column()
  messageId: string;

  @Column({ nullable: true })
  buildId?: string;

  @Column({ nullable: true })
  deploymentId?: string;

  @Column({ type: 'enum', enum: ['build', 'deploy'] })
  type: BuildLogType;

  @Column({ type: 'enum', enum: ['pending', 'in_progress', 'completed', 'failed'], default: 'pending' })
  status: BuildLogStatus;

  @Column({ type: 'jsonb', default: [] })
  logs: LogEntry[];

  @Column({ default: false })
  success: boolean;

  @Column({ nullable: true })
  error?: string;

  @Column({ nullable: true })
  previewUrl?: string;

  @Column({ type: 'timestamp' })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 