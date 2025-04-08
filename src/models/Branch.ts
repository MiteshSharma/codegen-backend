import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Conversation } from "./Conversation";

@Entity("branches")
export class Branch {
  @PrimaryGeneratedColumn("uuid")
  id: string;
  
  @Column()
  conversationId: string;
  
  @ManyToOne(() => Conversation)
  @JoinColumn({ name: "conversationId" })
  conversation: Conversation;
  
  @Column()
  name: string;
  
  @Column({ type: 'text', nullable: true })
  description?: string;
  
  @Column({ nullable: true })
  originMessageId: string;
  
  @Column({ default: false })
  isDefault: boolean;
  
  @CreateDateColumn()
  createdAt: Date;
  
  @UpdateDateColumn()
  updatedAt: Date;
} 