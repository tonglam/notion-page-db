import { beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../src/core/ai/AIService";
import { ConfigManager } from "../../src/core/config/ConfigManager";
import { NotionContent } from "../../src/core/notion/NotionContent";
import { NotionDatabase } from "../../src/core/notion/NotionDatabase";
import { StorageService } from "../../src/core/storage/StorageService";
import { ContentProcessor } from "../../src/workflow/content/ContentProcessor";
import { DatabaseUpdater } from "../../src/workflow/database/DatabaseUpdater";
import { DatabaseVerifier } from "../../src/workflow/database/DatabaseVerifier";
import { ImageProcessor } from "../../src/workflow/images/ImageProcessor";
import { MigrationManager } from "../../src/workflow/MigrationManager";
import { resetMocks } from "../setup";

vi.mock("../../src/core/config/ConfigManager");
vi.mock("../../src/core/notion/NotionDatabase");
vi.mock("../../src/core/notion/NotionContent");
vi.mock("../../src/core/ai/AIService");
vi.mock("../../src/core/storage/StorageService");
vi.mock("../../src/workflow/database/DatabaseVerifier");
vi.mock("../../src/workflow/content/ContentProcessor");
vi.mock("../../src/workflow/database/DatabaseUpdater");
vi.mock("../../src/workflow/images/ImageProcessor");

describe("MigrationManager", () => {
  let migrationManager: MigrationManager;
  let configManager: ConfigManager;
  let notionDatabase: NotionDatabase;
  let notionContent: NotionContent;
  let aiService: AIService;
  let storageService: StorageService;
  let databaseVerifier: DatabaseVerifier;
  let contentProcessor: ContentProcessor;
  let databaseUpdater: DatabaseUpdater;
  let imageProcessor: ImageProcessor;

  beforeEach(() => {
    resetMocks();

    // Setup mocks
    configManager = {
      validate: vi
        .fn()
        .mockReturnValue({ isValid: true, valid: true, errors: [] }),
      getNotionConfig: vi.fn().mockReturnValue({
        apiKey: "test-notion-api-key",
        sourcePageId: "test-source-page-id",
        targetDatabaseId: "test-database-id",
      }),
      getAIConfig: vi.fn().mockReturnValue({
        provider: "deepseek",
        apiKey: "test-ai-api-key",
        modelId: "deepseek-r1-chat",
        imageModel: "dall-e-3",
      }),
      getStorageConfig: vi.fn().mockReturnValue({
        provider: "r2",
        accountId: "test-account-id",
        accessKeyId: "test-access-key-id",
        secretAccessKey: "test-secret-access-key",
        bucketName: "test-bucket",
        publicUrlPrefix: "test-url",
      }),
      loadConfig: vi.fn(),
    } as any;

    notionContent = {} as any;
    notionDatabase = {} as any;
    aiService = {} as any;
    storageService = {} as any;

    databaseVerifier = {
      verifyDatabase: vi.fn().mockResolvedValue({
        success: true,
        message: "Database verified successfully",
      }),
    } as any;

    // Mock image processor
    imageProcessor = {
      initialize: vi.fn().mockResolvedValue(undefined),
      processAllImages: vi.fn().mockResolvedValue({
        success: true,
        processedImages: 2,
        failedImages: 0,
        errors: [],
      }),
    } as any;

    // Mock database updater
    databaseUpdater = {
      initialize: vi.fn().mockResolvedValue(undefined),
      updateEntries: vi.fn().mockResolvedValue([
        { success: true, id: "page1", error: null },
        { success: true, id: "page2", error: null },
      ]),
    } as any;

    // Mock content processor
    contentProcessor = {
      fetchContent: vi.fn().mockResolvedValue({
        success: true,
        contentPages: [
          { id: "page1", title: "Page 1", content: "Content 1" },
          { id: "page2", title: "Page 2", content: "Content 2" },
        ],
        categories: [],
      }),
      enhanceAllContent: vi.fn().mockResolvedValue([
        { id: "page1", title: "Page 1", content: "Enhanced Content 1" },
        { id: "page2", title: "Page 2", content: "Enhanced Content 2" },
      ]),
    } as any;

    // Set up constructor mocks
    vi.mocked(ConfigManager).mockImplementation(() => configManager);
    vi.mocked(NotionDatabase).mockImplementation(() => notionDatabase);
    vi.mocked(NotionContent).mockImplementation(() => notionContent);
    vi.mocked(AIService).mockImplementation(() => aiService);
    vi.mocked(StorageService).mockImplementation(() => storageService);
    vi.mocked(DatabaseVerifier).mockImplementation(() => databaseVerifier);
    vi.mocked(ContentProcessor).mockImplementation(() => contentProcessor);
    vi.mocked(DatabaseUpdater).mockImplementation(() => databaseUpdater);
    vi.mocked(ImageProcessor).mockImplementation(() => imageProcessor);

    migrationManager = new MigrationManager();
  });

  describe("constructor", () => {
    it("should initialize all required services", () => {
      expect(migrationManager).toBeDefined();
      expect(ConfigManager).toHaveBeenCalled();
    });

    it("should throw error if configuration is invalid", () => {
      vi.mocked(configManager.validate).mockReturnValue({
        isValid: false,
        valid: false,
        errors: ["Invalid configuration"],
      });

      expect(() => new MigrationManager()).toThrow("Invalid configuration");
    });
  });

  describe("migrate", () => {
    it("should perform a complete migration", async () => {
      const result = await migrationManager.migrate();

      expect(result.success).toBe(true);
      expect(result.totalPages).toBe(2);
      expect(result.updatedPages).toBe(2);
      expect(result.failedPages).toBe(0);

      expect(databaseVerifier.verifyDatabase).toHaveBeenCalled();
      expect(contentProcessor.fetchContent).toHaveBeenCalled();
      expect(imageProcessor.processAllImages).toHaveBeenCalled();
      expect(databaseUpdater.updateEntries).toHaveBeenCalled();
    });

    it("should handle database verification failure", async () => {
      vi.mocked(databaseVerifier.verifyDatabase).mockRejectedValueOnce(
        new Error("Database verification failed")
      );

      const result = await migrationManager.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Database verification failed");

      expect(contentProcessor.fetchContent).not.toHaveBeenCalled();
      expect(imageProcessor.processAllImages).not.toHaveBeenCalled();
      expect(databaseUpdater.updateEntries).not.toHaveBeenCalled();
    });

    it("should handle content extraction failure", async () => {
      vi.mocked(contentProcessor.fetchContent).mockRejectedValueOnce(
        new Error("Content extraction failed")
      );

      const result = await migrationManager.migrate();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain("Content extraction failed");

      expect(imageProcessor.processAllImages).not.toHaveBeenCalled();
      expect(databaseUpdater.updateEntries).not.toHaveBeenCalled();
    });
  });
});
