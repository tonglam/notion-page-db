"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MigrationManager = void 0;
const AIService_1 = require("../core/ai/AIService");
const ConfigManager_1 = require("../core/config/ConfigManager");
const NotionContent_1 = require("../core/notion/NotionContent");
const NotionDatabase_1 = require("../core/notion/NotionDatabase");
const StorageService_1 = require("../core/storage/StorageService");
const ContentProcessor_1 = require("./content/ContentProcessor");
const DatabaseUpdater_1 = require("./database/DatabaseUpdater");
const DatabaseVerifier_1 = require("./database/DatabaseVerifier");
const ImageProcessor_1 = require("./images/ImageProcessor");
/**
 * Migration Manager
 * Orchestrates the entire migration process
 */
class MigrationManager {
    /**
     * Creates a new MigrationManager instance
     * @param configPath Optional path to the configuration file
     */
    constructor(configPath) {
        // Initialize the config manager
        this.configManager = new ConfigManager_1.ConfigManager();
        if (configPath) {
            this.configManager.loadConfig(configPath);
        }
        // Validate the configuration
        const validationResult = this.configManager.validate();
        if (!validationResult.valid) {
            throw new Error(`Invalid configuration: ${validationResult.errors.join(', ')}`);
        }
        // Get configurations
        const notionConfig = this.configManager.getNotionConfig();
        const aiConfig = this.configManager.getAIConfig();
        const storageConfig = this.configManager.getStorageConfig();
        // Initialize core services
        this.notionDatabase = new NotionDatabase_1.NotionDatabase(notionConfig);
        this.notionContent = new NotionContent_1.NotionContent(notionConfig);
        this.aiService = new AIService_1.AIService(aiConfig);
        this.storageService = new StorageService_1.StorageService(storageConfig);
        // Initialize workflow components
        this.databaseVerifier = new DatabaseVerifier_1.DatabaseVerifier(this.notionDatabase, notionConfig);
        this.contentProcessor = new ContentProcessor_1.ContentProcessor(this.notionContent, this.aiService, notionConfig.sourcePageId);
        this.databaseUpdater = new DatabaseUpdater_1.DatabaseUpdater(this.notionDatabase, notionConfig.targetDatabaseId);
        this.imageProcessor = new ImageProcessor_1.ImageProcessor(this.aiService, this.storageService);
    }
    /**
     * Runs the migration process
     * @param options Options for the migration
     */
    async migrate(options = {}) {
        try {
            console.log('Starting migration process...');
            // Initialize components
            await this.imageProcessor.initialize();
            // Verify the database
            console.log('Verifying database...');
            const notionConfig = this.configManager.getNotionConfig();
            const verificationResult = await this.databaseVerifier.verifyDatabase(notionConfig.targetDatabaseId);
            if (!verificationResult.success) {
                return {
                    success: false,
                    error: `Database verification failed: ${verificationResult.errors?.join(', ')}`,
                };
            }
            console.log('Database verified successfully');
            // Initialize the database updater
            await this.databaseUpdater.initialize();
            // Fetch content
            console.log('Fetching content...');
            const fetchResult = await this.contentProcessor.fetchContent();
            if (!fetchResult.success) {
                return {
                    success: false,
                    error: `Content fetching failed: ${fetchResult.error}`,
                };
            }
            console.log(`Fetched ${fetchResult.contentPages?.length} content pages from ${fetchResult.categories?.length} categories`);
            // Enhance content
            console.log('Enhancing content...');
            const enhancedPages = await this.contentProcessor.enhanceAllContent(options.enhanceContent !== false);
            console.log(`Enhanced ${enhancedPages.length} content pages`);
            // Process images
            if (options.processImages !== false) {
                console.log('Processing images...');
                await this.imageProcessor.processAllImages(enhancedPages, options.generateImages !== false);
            }
            // Update database
            console.log('Updating database...');
            const updateResults = await this.databaseUpdater.updateEntries(enhancedPages);
            const successfulUpdates = updateResults.filter((result) => result.success);
            const failedUpdates = updateResults.filter((result) => !result.success);
            console.log(`Updated ${successfulUpdates.length} entries, ${failedUpdates.length} failed`);
            // Clean up
            await this.imageProcessor.cleanup();
            return {
                success: true,
                totalPages: enhancedPages.length,
                updatedPages: successfulUpdates.length,
                failedPages: failedUpdates.length,
                categories: fetchResult.categories || [],
            };
        }
        catch (error) {
            console.error('Migration failed:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Gets the config manager
     */
    getConfigManager() {
        return this.configManager;
    }
    /**
     * Gets the Notion database service
     */
    getNotionDatabase() {
        return this.notionDatabase;
    }
    /**
     * Gets the Notion content service
     */
    getNotionContent() {
        return this.notionContent;
    }
    /**
     * Gets the AI service
     */
    getAIService() {
        return this.aiService;
    }
    /**
     * Gets the storage service
     */
    getStorageService() {
        return this.storageService;
    }
}
exports.MigrationManager = MigrationManager;
//# sourceMappingURL=MigrationManager.js.map