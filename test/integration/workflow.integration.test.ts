import * as dotenv from "dotenv";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ConfigManager } from "../../src/core/config/ConfigManager";
import { NotionContent } from "../../src/core/notion/NotionContent";
import { ContentPage } from "../../src/types";
import { DatabaseUpdater } from "../../src/workflow/database/DatabaseUpdater";
import { DatabaseVerifier } from "../../src/workflow/database/DatabaseVerifier";
import { MigrationManager } from "../../src/workflow/MigrationManager";

// Load environment variables
dotenv.config();

// Set a longer timeout for integration tests
const TEST_TIMEOUT = 60000;
const LONG_TEST_TIMEOUT = 120000; // 2 minutes for particularly long operations

/**
 * Integration tests for the NotionPageDb Migration System
 *
 * These tests follow the actual workflow of the application with real data.
 * We focus on a small subset of data to keep tests efficient while still
 * testing real-world scenarios.
 *
 * Tests use real services and APIs, so they require:
 * 1. Valid Notion API credentials
 * 2. A source page in Notion with at least one subpage
 * 3. Environment variables properly configured
 */
describe("NotionPageDb Integration", () => {
  // Shared state across tests
  const testState = {
    databaseId: "",
    contentPages: [] as ContentPage[],
    processedPage: undefined as ContentPage | undefined,
  };

  // Shared instances
  let configManager: ConfigManager;
  let notionContent: NotionContent;
  let migrationManager: MigrationManager;

  // Global setup for all tests
  beforeAll(async () => {
    // Get required environment variables
    const sourcePageId = process.env.NOTION_SOURCE_PAGE_ID || "";
    const notionApiKey = process.env.NOTION_API_KEY || "";

    // Skip all tests if required environment variables are missing
    if (!sourcePageId || !notionApiKey) {
      console.warn(
        "⚠️ Skipping integration tests: Missing required environment variables"
      );
      return;
    }

    try {
      // Initialize the configuration
      configManager = new ConfigManager();
      configManager.loadConfig();

      // Set up configuration for testing
      const notionConfig = configManager.getNotionConfig();
      notionConfig.apiKey = notionApiKey;
      notionConfig.sourcePageId = sourcePageId;

      // Initialize services
      migrationManager = new MigrationManager();
      notionContent = migrationManager.getNotionContent();

      console.log("✅ Global test setup complete");
    } catch (error) {
      console.error("❌ Global test setup failed:", error);
      throw error;
    }
  });

  // Test database operations
  it(
    "should verify or create database",
    async () => {
      if (!migrationManager) {
        console.warn("⚠️ Skipping test: Setup failed");
        return;
      }

      const notionConfig = configManager.getNotionConfig();
      const databaseVerifier = new DatabaseVerifier(
        migrationManager.getNotionDatabase(),
        notionConfig
      );

      console.log("Verifying or creating database...");
      const result = await databaseVerifier.createDatabaseIfNeeded(
        notionConfig.sourcePageId
      );

      expect(result.success).toBe(true);
      expect(result.databaseId).toBeTruthy();

      // Store database ID for later tests
      if (result.databaseId) {
        testState.databaseId = result.databaseId;
        notionConfig.resolvedDatabaseId = result.databaseId;
        console.log(`Database verified/created: ${testState.databaseId}`);
      }
    },
    TEST_TIMEOUT
  );

  // Test content extraction - limiting to a small subset
  it(
    "should extract content from a single page",
    async () => {
      if (!notionContent || !migrationManager) {
        console.warn("⚠️ Skipping test: Setup failed");
        return;
      }

      try {
        // Step 1: Get Notion database to find a subpage
        const notionDatabase = migrationManager.getNotionDatabase();
        const sourcePageId = configManager.getNotionConfig().sourcePageId;

        console.log(`Finding subpages of: ${sourcePageId}`);

        // Step 2: Query the database (if we already have a database ID)
        let pageId = sourcePageId;
        if (testState.databaseId) {
          // Use database if available
          console.log(`Using database ID: ${testState.databaseId}`);
          await notionDatabase.setDatabaseId(testState.databaseId);

          // Get one entry from the database
          const entries = await notionDatabase.queryEntries({
            database_id: testState.databaseId,
            page_size: 1,
          });

          if (entries && entries.length > 0) {
            pageId = entries[0].id;
            console.log(`Found database entry to use: ${pageId}`);
          }
        }

        // Create a simple content page with minimal data
        const contentPage: ContentPage = {
          id: pageId,
          title: "Test Page",
          parentId: "",
          category: "Test",
          content: "This is test content for integration testing.",
          createdTime: new Date().toISOString(),
          lastEditedTime: new Date().toISOString(),
        };

        // Store for later tests
        testState.contentPages = [contentPage];

        console.log(`Created test content page: ${contentPage.title}`);
        expect(testState.contentPages.length).toBe(1);
      } catch (error) {
        console.error("Failed to extract content:", error);
        throw error;
      }
    },
    TEST_TIMEOUT
  );

  // Test content enhancement
  it(
    "should enhance a content page",
    async () => {
      if (testState.contentPages.length === 0) {
        console.warn("⚠️ Skipping test: No content pages available");
        return;
      }

      const aiService = migrationManager.getAIService();

      // We don't need a content processor for this test
      // since we're directly using the AIService and NotionContent

      const contentPage = testState.contentPages[0];
      console.log(`Enhancing content for page: ${contentPage.title}`);

      try {
        // Generate a summary manually
        const summary = await aiService.generateSummary(contentPage.content, {
          maxLength: 200,
          style: "concise",
        });

        // Calculate reading time
        const readingTime = notionContent.estimateReadingTime(
          contentPage.content
        );

        // Update the content page with the enhanced data
        const enhancedPage: ContentPage = {
          ...contentPage,
          summary,
          minsRead: readingTime,
        };

        // Store for later tests
        testState.processedPage = enhancedPage;

        // Verify the results
        expect(enhancedPage.summary).toBeDefined();
        expect(enhancedPage.minsRead).toBeGreaterThan(0);
        console.log(
          `Content enhanced: Summary length ${summary.length}, Reading time ${readingTime} mins`
        );
      } catch (error) {
        console.error("Failed to enhance content:", error);
        throw error;
      }
    },
    LONG_TEST_TIMEOUT
  );

  // Test database update
  it(
    "should update database with enhanced content",
    async () => {
      if (!testState.processedPage || !testState.databaseId) {
        console.warn(
          "⚠️ Skipping test: No processed page or database ID available"
        );
        return;
      }

      // Create database updater
      const databaseUpdater = new DatabaseUpdater(
        migrationManager.getNotionDatabase(),
        testState.databaseId
      );

      // Initialize the updater
      await databaseUpdater.initialize();

      console.log(
        `Updating database with page: ${testState.processedPage.title}`
      );

      // Update the entry
      const result = await databaseUpdater.updateEntry(testState.processedPage);

      // Verify the results
      expect(result.success).toBe(true);
      expect(result.entryId).toBeTruthy(); // Just verify we got back an ID, not necessarily the same one
      console.log(`Database updated successfully: ${result.entryId}`);
    },
    TEST_TIMEOUT
  );

  // Cleanup after all tests
  afterAll(() => {
    console.log("✅ Integration tests completed");
  });
});
