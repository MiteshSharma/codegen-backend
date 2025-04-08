import { MigrationInterface, QueryRunner, Table } from "typeorm";

export class CreateBuildLogs1711688000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: "build_logs",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "conversation_id",
                        type: "uuid"
                    },
                    {
                        name: "message_id",
                        type: "uuid"
                    },
                    {
                        name: "build_id",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "deployment_id",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "type",
                        type: "enum",
                        enum: ["build", "deploy"]
                    },
                    {
                        name: "status",
                        type: "varchar",
                        default: "'pending'"
                    },
                    {
                        name: "logs",
                        type: "jsonb",
                        isNullable: true,
                        comment: "Array of log entries with timestamp and message"
                    },
                    {
                        name: "success",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "error",
                        type: "text",
                        isNullable: true
                    },
                    {
                        name: "preview_url",
                        type: "varchar",
                        isNullable: true
                    },
                    {
                        name: "started_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "completed_at",
                        type: "timestamp",
                        isNullable: true
                    },
                    {
                        name: "created_at",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updated_at",
                        type: "timestamp",
                        default: "now()"
                    }
                ],
                foreignKeys: [
                    {
                        columnNames: ["conversation_id"],
                        referencedTableName: "conversations",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE"
                    },
                    {
                        columnNames: ["message_id"],
                        referencedTableName: "messages",
                        referencedColumnNames: ["id"],
                        onDelete: "CASCADE"
                    }
                ],
                indices: [
                    {
                        name: "idx_build_logs_conversation_id",
                        columnNames: ["conversation_id"]
                    },
                    {
                        name: "idx_build_logs_message_id",
                        columnNames: ["message_id"]
                    },
                    {
                        name: "idx_build_logs_build_id",
                        columnNames: ["build_id"]
                    },
                    {
                        name: "idx_build_logs_deployment_id",
                        columnNames: ["deployment_id"]
                    }
                ]
            }),
            true
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable("build_logs");
    }
} 