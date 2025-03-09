import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../../src/core/config/ConfigManager";

// Mock fs and path modules
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

describe("ConfigManager Complete Coverage", () => {
  // Save the original environment variables
  const originalEnv = { ...process.env };
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
      baseUrl: "https://test-bucket.example.com",
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    // Clear all environment variables that might affect the tests
    Object.keys(process.env).forEach((key) => {
      if (
        key.startsWith("NOTION_") ||
        key.startsWith("AI_") ||
        key.startsWith("STORAGE_") ||
        key.startsWith("R2_") ||
        key.startsWith("DEEPSEEK_") ||
        key.startsWith("OPENAI_")
      ) {
        delete process.env[key];
      }
    });

    // Setup fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
    vi.mocked(path.resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    // Restore original environment variables
    process.env = { ...originalEnv };
  });

  // Tests for line 125-126: process.env.NOTION_DATABASE_ID || ""
  describe("NOTION_DATABASE_ID fallback", () => {
    it("should use NOTION_DATABASE_ID when NOTION_TARGET_DATABASE_ID is not set", () => {
      process.env.NOTION_DATABASE_ID = "fallback-db-id";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getNotionConfig().targetDatabaseId).toEqual(
        "fallback-db-id"
      );
    });
  });

  // Tests for line 153-157: process.env.STORAGE_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY || ""
  describe("Storage secret key fallbacks", () => {
    it("should use STORAGE_SECRET_ACCESS_KEY as primary fallback", () => {
      process.env.STORAGE_SECRET_ACCESS_KEY = "storage-secret-key";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getStorageConfig().secretAccessKey).toEqual(
        "storage-secret-key"
      );
    });

    it("should use R2_SECRET_ACCESS_KEY as secondary fallback", () => {
      // Not setting STORAGE_SECRET_ACCESS_KEY
      process.env.R2_SECRET_ACCESS_KEY = "r2-secret-key";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getStorageConfig().secretAccessKey).toEqual(
        "r2-secret-key"
      );
    });
  });

  // Tests for environment variable parsing
  describe("Environment variable parsing", () => {
    it("should parse NOTION_RATE_LIMIT_DELAY as a number", () => {
      process.env.NOTION_RATE_LIMIT_DELAY = "2000";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getNotionConfig().rateLimitDelay).toEqual(2000);
    });

    it("should parse AI_MAX_TOKENS as a number", () => {
      process.env.AI_MAX_TOKENS = "2000";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getConfigValue("ai.maxTokens")).toEqual(2000);
    });

    it("should parse AI_TEMPERATURE as a number", () => {
      process.env.AI_TEMPERATURE = "0.5";
      const configManager = new ConfigManager();
      configManager.loadConfig();
      expect(configManager.getConfigValue("ai.temperature")).toEqual(0.5);
    });
  });
});
