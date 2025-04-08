import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranchSupport1713000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add branch column to messages
    await queryRunner.query(`
      ALTER TABLE "messages" 
      ADD COLUMN "branch" varchar DEFAULT 'main'
    `);
    
    // Create branch table
    await queryRunner.query(`
      CREATE TABLE "branches" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "conversation_id" uuid NOT NULL,
        "name" varchar NOT NULL,
        "description" varchar,
        "origin_message_id" uuid,
        "is_default" boolean DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        FOREIGN KEY ("conversation_id") REFERENCES "conversations" ("id") ON DELETE CASCADE
      )
    `);
    
    // Add index for better performance
    await queryRunner.query(`
      CREATE INDEX "idx_branch_message" ON "messages" ("conversation_id", "branch")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_branch_message"`);
    await queryRunner.query(`DROP TABLE "branches"`);
    await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "branch"`);
  }
} 