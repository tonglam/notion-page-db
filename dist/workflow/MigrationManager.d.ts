import { AIService } from '../core/ai/AIService';
import { ConfigManager } from '../core/config/ConfigManager';
import { NotionContent } from '../core/notion/NotionContent';
import { NotionDatabase } from '../core/notion/NotionDatabase';
import { StorageService } from '../core/storage/StorageService';
import { MigrationOptions, MigrationResult } from '../types';
/**
 * Migration Manager
 * Orchestrates the entire migration process
 */
export declare class MigrationManager {
    private configManager;
    private notionDatabase;
    private notionContent;
    private aiService;
    private storageService;
    private databaseVerifier;
    private contentProcessor;
    private databaseUpdater;
    private imageProcessor;
    /**
     * Creates a new MigrationManager instance
     * @param configPath Optional path to the configuration file
     */
    constructor(configPath?: string);
    /**
     * Runs the migration process
     * @param options Options for the migration
     */
    migrate(options?: MigrationOptions): Promise<MigrationResult>;
    /**
     * Gets the config manager
     */
    getConfigManager(): ConfigManager;
    /**
     * Gets the Notion database service
     */
    getNotionDatabase(): NotionDatabase;
    /**
     * Gets the Notion content service
     */
    getNotionContent(): NotionContent;
    /**
     * Gets the AI service
     */
    getAIService(): AIService;
    /**
     * Gets the storage service
     */
    getStorageService(): StorageService;
}
