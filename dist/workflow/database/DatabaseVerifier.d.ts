import { INotionDatabase } from '../../core/notion/NotionDatabase.interface';
import { DatabaseSchema, NotionConfig, VerificationResult } from '../../types';
/**
 * Database Verifier
 * Validates that a Notion database meets the schema requirements
 */
export declare class DatabaseVerifier {
    private notionDatabase;
    private notionConfig;
    private requiredProperties;
    /**
     * Creates a new DatabaseVerifier instance
     * @param notionDatabase The Notion database service
     * @param notionConfig The Notion configuration
     */
    constructor(notionDatabase: INotionDatabase, notionConfig: NotionConfig);
    /**
     * Verifies that the database meets requirements
     * @param databaseId ID of the database to verify
     */
    verifyDatabase(databaseId: string): Promise<VerificationResult>;
    /**
     * Creates a database with the required schema if it doesn't exist
     * @param databaseId Optional database ID to check/create
     * @param parentPageId Parent page ID where the database should be created
     */
    createDatabaseIfNeeded(databaseId?: string, parentPageId?: string): Promise<VerificationResult>;
    /**
     * Loads custom schema configuration from a file
     * @param configPath Path to the schema configuration file
     */
    loadSchemaConfig(configPath?: string): Promise<DatabaseSchema | null>;
    /**
     * Builds the database schema based on the required properties
     */
    private buildDatabaseSchema;
}
