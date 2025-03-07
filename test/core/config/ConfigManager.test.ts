import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../../src/core/config/ConfigManager";

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
    },
  };

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NOTION_API_KEY = "test-notion-api-key";
    process.env.NOTION_SOURCE_PAGE_ID = "test-source-page-id";
    process.env.NOTION_TARGET_DATABASE_ID = "test-database-id";
    process.env.AI_PROVIDER = "deepseek";
    process.env.DEEPSEEK_API_KEY = "test-ai-api-key";
    process.env.AI_MODEL_ID = "deepseek-r1-chat";
    process.env.IMAGE_MODEL = "dall-e-3";

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(mockConfig));
    vi.mocked(path.resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    delete process.env.NOTION_API_KEY;
    delete process.env.NOTION_SOURCE_PAGE_ID;
    delete process.env.NOTION_TARGET_DATABASE_ID;
    delete process.env.AI_PROVIDER;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.AI_MODEL_ID;
    delete process.env.IMAGE_MODEL;
  });

  describe("constructor", () => {
    it("should initialize with values from environment variables", () => {
      configManager = new ConfigManager();
      const notionConfig = configManager.getNotionConfig();
      const aiConfig = configManager.getAIConfig();

      expect(notionConfig.apiKey).toBe("test-notion-api-key");
      expect(notionConfig.sourcePageId).toBe("test-source-page-id");
      expect(notionConfig.targetDatabaseId).toBe("test-database-id");

      expect(aiConfig.provider).toBe("deepseek");
      expect(aiConfig.apiKey).toBe("test-ai-api-key");
      expect(aiConfig.modelId).toBe("deepseek-r1-chat");
      expect(aiConfig.imageModel).toBe("dall-e-3");
    });
  });

  describe("loadConfig", () => {
    it("should load configuration from a file when provided", () => {
      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(mockConfigPath, "utf8");

      const notionConfig = configManager.getNotionConfig();
      expect(notionConfig.apiKey).toBe("test-notion-api-key");
      expect(notionConfig.sourcePageId).toBe("test-source-page-id");
      expect(notionConfig.targetDatabaseId).toBe("test-database-id");
    });
  });

  describe("validate", () => {
    it("should return invalid result when source page ID is missing", () => {
      delete process.env.NOTION_SOURCE_PAGE_ID;
      configManager = new ConfigManager();

      const result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Notion source page ID is required");
    });
  });

  describe("getConfigValue", () => {
    it("should retrieve nested config values using dot notation", () => {
      configManager = new ConfigManager();
      const apiKey = configManager.getConfigValue<string>("notion.apiKey");
      expect(apiKey).toBe("test-notion-api-key");
    });

    it("should return default value when path does not exist", () => {
      configManager = new ConfigManager();
      const defaultValue = "default";
      const value = configManager.getConfigValue<string>(
        "nonexistent.path",
        defaultValue
      );
      expect(value).toBe(defaultValue);
    });
  });
});
