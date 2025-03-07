import { AIService } from "../core/ai/AIService";
import { ConfigManager } from "../core/config/ConfigManager";
import { NotionContent } from "../core/notion/NotionContent";
import { NotionDatabase } from "../core/notion/NotionDatabase";
import { StorageService } from "../core/storage/StorageService";
import { MigrationOptions, MigrationResult } from "../types";
import { ContentProcessor } from "./content/ContentProcessor";
import { DatabaseUpdater } from "./database/DatabaseUpdater";
import { DatabaseVerifier } from "./database/DatabaseVerifier";
import { ImageProcessor } from "./images/ImageProcessor";

/**
 * Migration Manager
 * Orchestrates the entire migration process
 */
export class MigrationManager {
  private configManager: ConfigManager;
  private notionDatabase: NotionDatabase;
  private notionContent: NotionContent;
  private aiService: AIService;
  private storageService: StorageService;
  private databaseVerifier: DatabaseVerifier;
  private contentProcessor: ContentProcessor;
  private databaseUpdater: DatabaseUpdater;
  private imageProcessor: ImageProcessor;

  /**
   * Creates a new MigrationManager instance
   * @param configPath Optional path to the configuration file
   */
  constructor(configPath?: string) {
    // Initialize the config manager
    this.configManager = new ConfigManager();

    if (configPath) {
      this.configManager.loadConfig(configPath);
    }

    // Validate the configuration
    const validationResult = this.configManager.validate();

    if (!validationResult.valid) {
      throw new Error(
        `Invalid configuration: ${validationResult.errors.join(", ")}`
      );
    }

    // Get configurations
    const notionConfig = this.configManager.getNotionConfig();
    const aiConfig = this.configManager.getAIConfig();
    const storageConfig = this.configManager.getStorageConfig();

    // Initialize core services
    this.notionDatabase = new NotionDatabase(notionConfig);
    this.notionContent = new NotionContent(notionConfig);
    this.aiService = new AIService(aiConfig);
    this.storageService = new StorageService(storageConfig);

    // Initialize workflow components
    this.databaseVerifier = new DatabaseVerifier(
      this.notionDatabase,
      notionConfig
    );
    this.contentProcessor = new ContentProcessor(
      this.notionContent,
      this.aiService,
      notionConfig.sourcePageId
    );
    this.databaseUpdater = new DatabaseUpdater(
      this.notionDatabase,
      notionConfig.targetDatabaseId
    );
    this.imageProcessor = new ImageProcessor(
      this.aiService,
      this.storageService
    );
  }

  /**
   * Runs the migration process
   * @param options Options for the migration
   */
  async migrate(options: MigrationOptions = {}): Promise<MigrationResult> {
    try {
      console.log("Starting migration process...");

      // Initialize components
      await this.imageProcessor.initialize();

      // Verify the database
      console.log("Verifying database...");
      const notionConfig = this.configManager.getNotionConfig();
      const verificationResult = await this.databaseVerifier.verifyDatabase(
        notionConfig.targetDatabaseId
      );

      if (!verificationResult.success) {
        return {
          success: false,
          error: `Database verification failed: ${verificationResult.errors?.join(", ")}`,
        };
      }

      console.log("Database verified successfully");

      // Initialize the database updater
      await this.databaseUpdater.initialize();

      // Fetch content
      console.log("Fetching content...");
      const fetchResult = await this.contentProcessor.fetchContent();

      if (!fetchResult.success) {
        return {
          success: false,
          error: `Content fetching failed: ${fetchResult.error}`,
        };
      }

      console.log(
        `Fetched ${fetchResult.contentPages?.length} content pages from ${fetchResult.categories?.length} categories`
      );

      // Enhance content
      console.log("Enhancing content...");
      const enhancedPages = await this.contentProcessor.enhanceAllContent(
        options.enhanceContent !== false
      );

      console.log(`Enhanced ${enhancedPages.length} content pages`);

      // Process images
      if (options.processImages !== false) {
        console.log("Processing images...");
        await this.imageProcessor.processAllImages(
          enhancedPages,
          options.generateImages !== false
        );
      }

      // Update database
      console.log("Updating database...");
      const updateResults =
        await this.databaseUpdater.updateEntries(enhancedPages);

      const successfulUpdates = updateResults.filter(
        (result) => result.success
      );
      const failedUpdates = updateResults.filter((result) => !result.success);

      console.log(
        `Updated ${successfulUpdates.length} entries, ${failedUpdates.length} failed`
      );

      return {
        success: true,
        totalPages: enhancedPages.length,
        updatedPages: successfulUpdates.length,
        failedPages: failedUpdates.length,
        categories: fetchResult.categories,
      };
    } catch (error) {
      console.error("Migration failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Gets the config manager
   */
  getConfigManager(): ConfigManager {
    return this.configManager;
  }

  /**
   * Gets the Notion database service
   */
  getNotionDatabase(): NotionDatabase {
    return this.notionDatabase;
  }

  /**
   * Gets the Notion content service
   */
  getNotionContent(): NotionContent {
    return this.notionContent;
  }

  /**
   * Gets the AI service
   */
  getAIService(): AIService {
    return this.aiService;
  }

  /**
   * Gets the storage service
   */
  getStorageService(): StorageService {
    return this.storageService;
  }
}
