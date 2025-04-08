import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBranchIdToMessages1710000000001 implements MigrationInterface {
    name = 'AddBranchIdToMessages1710000000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add branch_id column
        await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "branch_id" uuid NULL`);
        
        // Add foreign key constraint if needed
        // await queryRunner.query(`ALTER TABLE "messages" ADD CONSTRAINT "fk_messages_branch" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraint if it was added
        // await queryRunner.query(`ALTER TABLE "messages" DROP CONSTRAINT "fk_messages_branch"`);
        
        // Drop the column
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "branch_id"`);
    }
} 