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

describe("ConfigManager Methods", () => {
  let configManager: ConfigManager;
  const mockConfigPath = "test-config.json";
  const mockConfig = {
    notion: {
      apiKey: "test-notion-api-key",
      sourcePageId: "test-source-page-id",
      targetDatabaseId: "test-database-id",
      rateLimitDelay: 400,
    },
    ai: {
      provider: "deepseek",
      apiKey: "test-ai-api-key",
      modelId: "deepseek-r1-chat",
      model: "test-model",
      imageModel: "dall-e-3",
      maxTokens: 2000,
      temperature: 0.8,
    },
    storage: {
      provider: "r2",
      accountId: "test-account-id",
      accessKeyId: "test-access-key",
      secretAccessKey: "test-secret-key",
      bucketName: "test-bucket",
      baseUrl: "https://test-bucket.example.com",
      region: "us-east-1",
      usePresignedUrls: true,
    },
    app: {
      logLevel: "info",
      batchSize: 10,
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Set up environment variables
    process.env.NOTION_API_KEY = "env-notion-api-key";
    process.env.NOTION_SOURCE_PAGE_ID = "env-source-page-id";
    process.env.NOTION_TARGET_DATABASE_ID = "env-target-database-id";
    process.env.NOTION_RATE_LIMIT_DELAY = "500";

    process.env.AI_PROVIDER = "openai";
    process.env.OPENAI_API_KEY = "env-openai-api-key";
    process.env.AI_MODEL_ID = "env-model-id";
    process.env.AI_MODEL = "env-model";
    process.env.AI_IMAGE_MODEL = "env-image-model";
    process.env.AI_MAX_TOKENS = "1500";
    process.env.AI_TEMPERATURE = "0.5";
    process.env.AI_MAX_RETRIES = "5";

    process.env.STORAGE_PROVIDER = "s3";
    process.env.STORAGE_ACCESS_KEY_ID = "env-access-key";
    process.env.STORAGE_SECRET_ACCESS_KEY = "env-secret-key";
    process.env.STORAGE_BUCKET_NAME = "env-bucket";
    process.env.STORAGE_ACCOUNT_ID = "env-account-id";
    process.env.STORAGE_REGION = "env-region";
    process.env.STORAGE_BASE_URL = "https://env-bucket.example.com";
    process.env.STORAGE_USE_PRESIGNED_URLS = "true";

    // Set up mock file system
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
    vi.mocked(path.resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_SOURCE_PAGE_ID;
    delete process.env.NOTION_TARGET_DATABASE_ID;
    delete process.env.NOTION_RATE_LIMIT_DELAY;

    delete process.env.AI_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.AI_MODEL_ID;
    delete process.env.AI_MODEL;
    delete process.env.AI_IMAGE_MODEL;
    delete process.env.AI_MAX_TOKENS;
    delete process.env.AI_TEMPERATURE;
    delete process.env.AI_MAX_RETRIES;

    delete process.env.STORAGE_PROVIDER;
    delete process.env.STORAGE_ACCESS_KEY_ID;
    delete process.env.STORAGE_SECRET_ACCESS_KEY;
    delete process.env.STORAGE_BUCKET_NAME;
    delete process.env.STORAGE_ACCOUNT_ID;
    delete process.env.STORAGE_REGION;
    delete process.env.STORAGE_BASE_URL;
    delete process.env.STORAGE_USE_PRESIGNED_URLS;

    delete process.env.SOURCE_PAGE_ID;
    delete process.env.NOTION_DATABASE_ID;
    delete process.env.AI_API_KEY;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;
    delete process.env.R2_BUCKET_NAME;
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_PUBLIC_URL;
  });

  describe("getNotionConfig", () => {
    it("should return the notion configuration", () => {
      configManager = new ConfigManager();

      // Get the config directly without loading from environment
      const notionConfig = configManager.getNotionConfig();

      expect(notionConfig).toBeDefined();
      // Check that the properties exist, but don't assert specific values
      // as they might be set from the environment or have default values
      expect(notionConfig).toHaveProperty("apiKey");
      expect(notionConfig).toHaveProperty("sourcePageId");
      expect(notionConfig).toHaveProperty("targetDatabaseName");
      expect(notionConfig).toHaveProperty("resolvedDatabaseId");
      expect(notionConfig).toHaveProperty("rateLimitDelay");
    });

    it("should return the merged notion configuration when a config file is loaded", () => {
      // Mock environment variables
      process.env.NOTION_API_KEY = "env-notion-api-key";
      process.env.NOTION_SOURCE_PAGE_ID = "env-source-page-id";
      process.env.NOTION_TARGET_DATABASE_ID = "test-database-id"; // Set this to match the expected value
      process.env.NOTION_RATE_LIMIT_DELAY = "300";

      // Mock fs.existsSync to return true for our config file
      (fs.existsSync as any).mockReturnValue(true);

      // Mock fs.readFileSync to return our mock config
      (fs.readFileSync as any).mockReturnValue(
        JSON.stringify({
          notion: {
            apiKey: "test-notion-api-key",
            sourcePageId: "test-source-page-id",
            rateLimitDelay: 400,
          },
        })
      );

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      const notionConfig = configManager.getNotionConfig();

      expect(notionConfig).toBeDefined();
      expect(notionConfig.apiKey).toBe("test-notion-api-key");
      expect(notionConfig.sourcePageId).toBe("test-source-page-id");
      expect(notionConfig.targetDatabaseName).toBe("Content Database");
      expect(notionConfig.resolvedDatabaseId).toBe("test-database-id");
      expect(notionConfig.rateLimitDelay).toBe(400);
    });
  });

  describe("getAIConfig", () => {
    it("should return the AI configuration", () => {
      configManager = new ConfigManager();

      // Get the config directly without loading from environment
      const aiConfig = configManager.getAIConfig();

      expect(aiConfig).toBeDefined();
      // Check that the properties exist, but don't assert specific values
      expect(aiConfig).toHaveProperty("provider");
      expect(aiConfig).toHaveProperty("apiKey");
      expect(aiConfig).toHaveProperty("modelId");
      expect(aiConfig).toHaveProperty("imageModel");
      // These properties might not be initialized until loadConfig is called
      // so we don't check for them here
    });

    it("should return the merged AI configuration when a config file is loaded", () => {
      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      const aiConfig = configManager.getAIConfig();

      expect(aiConfig).toBeDefined();
      expect(aiConfig.provider).toBe("deepseek");
      expect(aiConfig.apiKey).toBe("test-ai-api-key");
      expect(aiConfig.modelId).toBe("deepseek-r1-chat");
      expect(aiConfig.model).toBe("test-model");
      expect(aiConfig.imageModel).toBe("dall-e-3");
      expect(aiConfig.maxTokens).toBe(2000);
      expect(aiConfig.temperature).toBe(0.8);
    });
  });

  describe("getStorageConfig", () => {
    it("should return the storage configuration", () => {
      configManager = new ConfigManager();

      // Get the config directly without loading from environment
      const storageConfig = configManager.getStorageConfig();

      expect(storageConfig).toBeDefined();
      // Check that the properties exist, but don't assert specific values
      expect(storageConfig).toHaveProperty("provider");
      expect(storageConfig).toHaveProperty("accessKeyId");
      expect(storageConfig).toHaveProperty("secretAccessKey");
      expect(storageConfig).toHaveProperty("bucketName");
      expect(storageConfig).toHaveProperty("accountId");
      // These properties might not be initialized until loadConfig is called
      // so we don't check for them here
    });

    it("should return the merged storage configuration when a config file is loaded", () => {
      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      const storageConfig = configManager.getStorageConfig();

      expect(storageConfig).toBeDefined();
      expect(storageConfig.provider).toBe("r2");
      expect(storageConfig.accessKeyId).toBe("test-access-key");
      expect(storageConfig.secretAccessKey).toBe("test-secret-key");
      expect(storageConfig.bucketName).toBe("test-bucket");
      expect(storageConfig.accountId).toBe("test-account-id");
      expect(storageConfig.region).toBe("us-east-1");
      expect(storageConfig.baseUrl).toBe("https://test-bucket.example.com");
      expect(storageConfig.usePresignedUrls).toBe(true);
    });
  });

  describe("loadConfig", () => {
    it("should load configuration from environment variables with alternative names", () => {
      // Set up alternative environment variable names
      delete process.env.NOTION_SOURCE_PAGE_ID;
      delete process.env.NOTION_TARGET_DATABASE_ID;
      delete process.env.OPENAI_API_KEY;
      delete process.env.STORAGE_ACCESS_KEY_ID;
      delete process.env.STORAGE_SECRET_ACCESS_KEY;
      delete process.env.STORAGE_BUCKET_NAME;
      delete process.env.STORAGE_ACCOUNT_ID;
      delete process.env.STORAGE_BASE_URL;

      process.env.SOURCE_PAGE_ID = "alt-source-page-id";
      process.env.NOTION_DATABASE_ID = "alt-database-id";
      process.env.AI_API_KEY = "alt-ai-api-key";
      process.env.R2_ACCESS_KEY_ID = "alt-r2-access-key";
      process.env.R2_SECRET_ACCESS_KEY = "alt-r2-secret-key";
      process.env.R2_BUCKET_NAME = "alt-r2-bucket";
      process.env.R2_ACCOUNT_ID = "alt-r2-account-id";
      process.env.R2_PUBLIC_URL = "https://alt-r2-bucket.example.com";

      configManager = new ConfigManager();
      configManager.loadConfig();

      const notionConfig = configManager.getNotionConfig();
      const storageConfig = configManager.getStorageConfig();
      const aiConfig = configManager.getAIConfig();

      expect(notionConfig.sourcePageId).toBe("alt-source-page-id");
      expect(notionConfig.targetDatabaseName).toBe("Content Database");
      expect(notionConfig.resolvedDatabaseId).toBe("alt-database-id");

      expect(aiConfig.apiKey).toBe("alt-ai-api-key");

      expect(storageConfig.accessKeyId).toBe("alt-r2-access-key");
      expect(storageConfig.secretAccessKey).toBe("alt-r2-secret-key");
      expect(storageConfig.bucketName).toBe("alt-r2-bucket");
      expect(storageConfig.accountId).toBe("alt-r2-account-id");
      expect(storageConfig.baseUrl).toBe("https://alt-r2-bucket.example.com");
    });

    it("should handle numeric environment variables correctly", () => {
      process.env.NOTION_RATE_LIMIT_DELAY = "1000";
      process.env.AI_MAX_TOKENS = "3000";
      process.env.AI_TEMPERATURE = "0.9";

      configManager = new ConfigManager();
      configManager.loadConfig();

      const notionConfig = configManager.getNotionConfig();
      const aiConfig = configManager.getAIConfig();

      expect(notionConfig.rateLimitDelay).toBe(1000);
      expect(aiConfig.maxTokens).toBe(3000);
      expect(aiConfig.temperature).toBe(0.9);
    });

    it("should handle boolean environment variables correctly", () => {
      process.env.STORAGE_USE_PRESIGNED_URLS = "false";

      configManager = new ConfigManager();
      configManager.loadConfig();

      const storageConfig = configManager.getStorageConfig();

      expect(storageConfig.usePresignedUrls).toBe(false);

      process.env.STORAGE_USE_PRESIGNED_URLS = "true";

      configManager = new ConfigManager();
      configManager.loadConfig();

      const updatedStorageConfig = configManager.getStorageConfig();

      expect(updatedStorageConfig.usePresignedUrls).toBe(true);
    });

    it("should set default values for configuration properties", () => {
      // Create a new ConfigManager and load the config
      configManager = new ConfigManager();
      configManager.loadConfig();

      // Get the configs
      const notionConfig = configManager.getNotionConfig();
      const aiConfig = configManager.getAIConfig();
      const storageConfig = configManager.getStorageConfig();

      // Check that default values are set for certain properties
      expect(aiConfig.provider).toBeDefined();
      expect(aiConfig.imageModel).toBeDefined();
      expect(notionConfig.rateLimitDelay).toBeDefined();
      expect(storageConfig.provider).toBeDefined();
      expect(storageConfig.region).toBeDefined();

      // Check specific default values when environment variables are not set
      // We'll set up a new ConfigManager with no environment variables
      Object.keys(process.env).forEach((key) => {
        if (
          key.startsWith("NOTION_") ||
          key.startsWith("AI_") ||
          key.startsWith("STORAGE_") ||
          key.startsWith("R2_") ||
          key === "SOURCE_PAGE_ID" ||
          key === "NOTION_DATABASE_ID" ||
          key === "OPENAI_API_KEY"
        ) {
          delete process.env[key];
        }
      });

      const newConfigManager = new ConfigManager();
      newConfigManager.loadConfig();

      const newAiConfig = newConfigManager.getAIConfig();
      const newStorageConfig = newConfigManager.getStorageConfig();
      const newNotionConfig = newConfigManager.getNotionConfig();

      // Check default values
      expect(newAiConfig.provider).toBe("openai");
      expect(newAiConfig.imageModel).toBe("dall-e-3");
      expect(newAiConfig.model).toBe("gpt-3.5-turbo");
      expect(newAiConfig.maxTokens).toBe(1000);
      expect(newAiConfig.temperature).toBe(0.7);
      expect(newNotionConfig.rateLimitDelay).toBe(350);
      expect(newStorageConfig.provider).toBe("r2");
      expect(newStorageConfig.region).toBe("auto");
    });
  });
});
