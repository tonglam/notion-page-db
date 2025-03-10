import { AIService } from "../core/ai/AIService";
import { ConfigManager } from "../core/config/ConfigManager";
import { NotionContent } from "../core/notion/NotionContent";
import { NotionDatabase } from "../core/notion/NotionDatabase";
import { StorageService } from "../core/storage/StorageService";
import { ContentPage, MigrationOptions, MigrationResult } from "../types";
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

    // Initialize database updater without the database ID
    // We'll resolve it during migration
    this.databaseUpdater = new DatabaseUpdater(this.notionDatabase);

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

      // Verify or create the database
      console.log("Verifying database...");
      const notionConfig = this.configManager.getNotionConfig();

      // First, check if we have a direct database ID from config
      let verificationResult;
      if (notionConfig.resolvedDatabaseId) {
        // If we already have a database ID, verify it directly
        verificationResult = await this.databaseVerifier.verifyDatabase(
          notionConfig.resolvedDatabaseId
        );
      } else {
        // Otherwise, try to find or create the database using the source page as parent
        verificationResult = await this.databaseVerifier.createDatabaseIfNeeded(
          notionConfig.sourcePageId
        );
      }

      if (!verificationResult.success) {
        return {
          success: false,
          error: `Database verification failed: ${verificationResult.errors?.join(", ")}`,
        };
      }

      console.log(
        `Database verified successfully: ${verificationResult.databaseId}`
      );

      // Update the database ID in our configuration
      if (verificationResult.databaseId) {
        notionConfig.resolvedDatabaseId = verificationResult.databaseId;
      }

      // Initialize the database updater with the resolved database ID
      if (notionConfig.resolvedDatabaseId) {
        this.databaseUpdater.setDatabaseId(notionConfig.resolvedDatabaseId);
      } else {
        return {
          success: false,
          error: "Database ID could not be resolved",
        };
      }

      // Initialize database updater to load existing entries
      await this.databaseUpdater.initialize();
      console.log("Database updater initialized with existing entries");

      // Traverse the source page and fetch all content
      console.log(`Traversing source page: ${notionConfig.sourcePageId}`);
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

      // Analyze each content page to determine if it needs updating
      const contentPages = fetchResult.contentPages || [];
      const pagesToProcess: ContentPage[] = [];
      const skippedPages: ContentPage[] = [];

      // Check each content page against existing entries
      for (const contentPage of contentPages) {
        // Get existing entry by originalPageUrl or by title
        let existingEntry;

        if (contentPage.originalPageUrl) {
          existingEntry = this.databaseUpdater.getExistingEntry(
            contentPage.originalPageUrl
          );
        }

        if (!existingEntry) {
          // Try to find by title - first initialize a temporary ContentPage
          const tempPage = { ...contentPage };
          const emptyFields = this.databaseUpdater.getEmptyFields(tempPage);

          // If title exists, try to find by title
          if (!emptyFields.includes("title")) {
            // Query database - this is done within updateEntry so we don't need to do it here
            console.log(
              `No existing entry found by URL, will check by title: "${contentPage.title}"`
            );
            pagesToProcess.push(contentPage);
            continue;
          } else {
            // No title and no URL, can't identify the page
            console.log(
              `Page has no title or URL, skipping: ${contentPage.id}`
            );
            skippedPages.push(contentPage);
            continue;
          }
        } else {
          // Check if the existing entry needs updating
          const fieldsToUpdate = this.databaseUpdater.getFieldsNeedingUpdate(
            contentPage,
            existingEntry
          );

          if (fieldsToUpdate.length > 0) {
            console.log(
              `Existing entry needs updating (${fieldsToUpdate.join(", ")}): ${contentPage.title}`
            );
            pagesToProcess.push(contentPage);
          } else {
            console.log(
              `Existing entry is up to date, skipping: ${contentPage.title}`
            );
            skippedPages.push(contentPage);
          }
        }
      }

      console.log(
        `Found ${pagesToProcess.length} pages to process, ${skippedPages.length} pages up to date`
      );

      // Process only the pages that need it
      if (pagesToProcess.length === 0) {
        return {
          success: true,
          totalPages: contentPages.length,
          updatedPages: 0,
          failedPages: 0,
          categories: fetchResult.categories,
        };
      }

      // Enhance content for pages that need processing
      console.log(`Enhancing ${pagesToProcess.length} content pages...`);
      const enhancedPages = [];

      for (const page of pagesToProcess) {
        // Store the page in the processor's map before enhancing
        this.contentProcessor.setContentPage(page.id, page);

        const enhancedPage = await this.contentProcessor.enhanceContent(
          page.id,
          options.enhanceContent !== false
        );

        if (enhancedPage) {
          enhancedPages.push(enhancedPage);
        }
      }

      console.log(`Enhanced ${enhancedPages.length} content pages`);

      // Process images
      if (options.processImages !== false && enhancedPages.length > 0) {
        console.log("Processing images...");
        await this.imageProcessor.processAllImages(
          enhancedPages,
          options.generateImages !== false
        );
      }

      // Update database with only the pages that need updating
      if (enhancedPages.length > 0) {
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
          totalPages: contentPages.length,
          updatedPages: successfulUpdates.length,
          failedPages: failedUpdates.length,
          categories: fetchResult.categories,
        };
      } else {
        return {
          success: true,
          totalPages: contentPages.length,
          updatedPages: 0,
          failedPages: 0,
          categories: fetchResult.categories,
        };
      }
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
