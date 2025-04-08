import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAgentModeToMessages1710000000000 implements MigrationInterface {
    name = 'AddAgentModeToMessages1710000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD COLUMN "agent_mode" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "agent_mode"`);
    }
} 