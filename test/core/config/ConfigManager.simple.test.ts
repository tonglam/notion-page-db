import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../../src/core/config/ConfigManager";

// Mock dependencies
vi.mock("fs");
vi.mock("path", () => {
  return {
    default: {
      resolve: vi.fn(),
      join: vi.fn((...args) => args.join("/")),
    },
    resolve: vi.fn(),
    join: vi.fn((...args) => args.join("/")),
  };
});

describe("ConfigManager", () => {
  let configManager: ConfigManager;
  const mockConfigPath = "test-config.json";
  const mockConfig = {
    notion: {
      apiKey: "test-notion-api-key",
      sourcePageId: "test-source-page-id",
      targetDatabaseId: "test-database-id",
    },
    ai: {
      provider: "deepseek",
      apiKey: "test-ai-api-key",
      modelId: "deepseek-r1-chat",
      imageModel: "dall-e-3",
      maxRetries: 3,
    },
    storage: {
      provider: "r2",
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucketName: "test-bucket",
      publicUrlPrefix: "https://test-bucket.example.com",
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Setup environment variables
    process.env.NOTION_API_KEY = "test-notion-api-key";
    process.env.NOTION_SOURCE_PAGE_ID = "test-source-page-id";
    process.env.NOTION_TARGET_DATABASE_ID = "test-database-id";
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "test-ai-api-key";
    process.env.AI_MODEL_ID = "deepseek-r1-chat";
    process.env.IMAGE_MODEL = "dall-e-3";
    process.env.AI_MAX_RETRIES = "3";
    process.env.STORAGE_PROVIDER = "r2";
    process.env.R2_ACCOUNT_ID = "test-account-id";
    process.env.R2_ACCESS_KEY_ID = "test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "test-secret-key";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://test-bucket.example.com";

    // Setup mock returns
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
    vi.mocked(path.resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_SOURCE_PAGE_ID;
    delete process.env.NOTION_TARGET_DATABASE_ID;
    delete process.env.AI_PROVIDER;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL_ID;
    delete process.env.IMAGE_MODEL;
    delete process.env.AI_MAX_RETRIES;
    delete process.env.STORAGE_PROVIDER;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_PUBLIC_URL;
    delete process.env.STORAGE_USE_PRESIGNED_URLS;
    delete process.env.NOTION_RATE_LIMIT_DELAY;
    delete process.env.AI_MAX_TOKENS;
    delete process.env.AI_TEMPERATURE;
    delete process.env.SOURCE_PAGE_ID;
    delete process.env.NOTION_DATABASE_ID;
    delete process.env.AI_API_KEY;
    delete process.env.AI_MODEL;
    delete process.env.AI_IMAGE_MODEL;
    delete process.env.STORAGE_BASE_URL;
  });

  describe("constructor and basic config retrieval", () => {
    it("should initialize with values from environment variables", () => {
      configManager = new ConfigManager();
      const notionConfig = configManager.getNotionConfig();
      const aiConfig = configManager.getAIConfig();
      const storageConfig = configManager.getStorageConfig();

      // Use type assertion to access the property
      const storageConfigAny = storageConfig as any;

      expect(notionConfig.apiKey).toBe("test-notion-api-key");
      expect(notionConfig.sourcePageId).toBe("test-source-page-id");
      expect(notionConfig.targetDatabaseId).toBe("test-database-id");

      expect(aiConfig.provider).toBe("deepseek");
      expect(aiConfig.apiKey).toBe("test-ai-api-key");
      expect(aiConfig.modelId).toBe("deepseek-r1-chat");
      expect(aiConfig.imageModel).toBe("dall-e-3");

      expect(storageConfig.provider).toBe("r2");
      expect(storageConfig.accountId).toBe("test-account-id");
      expect(storageConfig.accessKeyId).toBe("test-access-key");
      expect(storageConfig.secretAccessKey).toBe("test-secret-key");
      expect(storageConfig.bucketName).toBe("test-bucket");
      expect(storageConfigAny.publicUrlPrefix).toBe(
        "https://test-bucket.example.com"
      );
    });
  });
});
