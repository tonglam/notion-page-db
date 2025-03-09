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

      console.log("StorageConfig properties:", Object.keys(storageConfig));
      console.log(
        "StorageConfig values:",
        JSON.stringify(storageConfig, null, 2)
      );

      expect(notionConfig.apiKey).toBe("test-notion-api-key");
      expect(notionConfig.sourcePageId).toBe("test-source-page-id");
      expect(notionConfig.targetDatabaseName).toBe("Content Database");
      expect(notionConfig.resolvedDatabaseId).toBe("test-database-id");

      expect(aiConfig.provider).toBe("deepseek");
      expect(aiConfig.apiKey).toBe("test-ai-api-key");
      expect(aiConfig.modelId).toBe("deepseek-r1-chat");
      expect(aiConfig.imageModel).toBe("dall-e-3");

      expect(storageConfig.provider).toBe("r2");
      expect(storageConfig.accountId).toBe("test-account-id");
      expect(storageConfig.accessKeyId).toBe("test-access-key");
      expect(storageConfig.secretAccessKey).toBe("test-secret-key");
      expect(storageConfig.bucketName).toBe("test-bucket");
      expect((storageConfig as any).publicUrlPrefix).toBe(
        "https://test-bucket.example.com"
      );
    });

    it("should use default values when environment variables are not set", () => {
      delete process.env.NOTION_API_KEY;
      delete process.env.NOTION_SOURCE_PAGE_ID;
      delete process.env.NOTION_TARGET_DATABASE_ID;
      delete process.env.AI_PROVIDER;
      delete process.env.DEEPSEEK_API_KEY;
      delete process.env.AI_MODEL_ID;
      delete process.env.IMAGE_MODEL;
      delete process.env.AI_MAX_RETRIES;
      delete process.env.STORAGE_PROVIDER;
      delete process.env.R2_ACCOUNT_ID;
      delete process.env.R2_ACCESS_KEY_ID;
      delete process.env.R2_SECRET_ACCESS_KEY;
      delete process.env.R2_BUCKET_NAME;
      delete process.env.R2_PUBLIC_URL;

      configManager = new ConfigManager();
      const aiConfig = configManager.getAIConfig();
      const storageConfig = configManager.getStorageConfig();
      const batchSize = configManager.getConfigValue<number>(
        "app.batchSize",
        5
      );
      const rateLimitDelay = configManager.getConfigValue<number>(
        "notion.rateLimitDelay",
        350
      );
      const maxRetries = configManager.getConfigValue<number>(
        "ai.maxRetries",
        3
      );

      expect(aiConfig.provider).toBe("deepseek");
      expect(aiConfig.modelId).toBe("deepseek-r1-chat");
      expect(aiConfig.imageModel).toBe("dall-e-3");
      expect(maxRetries).toBe(3);

      expect(storageConfig.provider).toBe("r2");
      expect(batchSize).toBe(5);
      expect(rateLimitDelay).toBe(350);
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
      expect(notionConfig.targetDatabaseName).toBe("Content Database");
      expect(notionConfig.resolvedDatabaseId).toBe("test-database-id");
    });

    it("should skip file config loading when file doesn't exist", () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      expect(fs.existsSync).toHaveBeenCalledWith(mockConfigPath);
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it("should handle errors during config loading", () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error("Failed to read file");
      });

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error loading configuration:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should merge configuration objects from file", () => {
      const fileConfig = {
        notion: {
          apiKey: "file-notion-api-key",
          extraSetting: "extra-value",
        },
        extraSection: {
          setting1: "value1",
          setting2: {
            nestedSetting: "nested-value",
          },
        },
      };

      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(fileConfig));

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      expect(configManager.getConfigValue("notion.apiKey")).toBe(
        "file-notion-api-key"
      );
      expect(configManager.getConfigValue("notion.extraSetting")).toBe(
        "extra-value"
      );
      expect(configManager.getConfigValue("extraSection.setting1")).toBe(
        "value1"
      );
      expect(
        configManager.getConfigValue("extraSection.setting2.nestedSetting")
      ).toBe("nested-value");
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

    it("should return default value when intermediate path elements don't exist", () => {
      configManager = new ConfigManager();
      const defaultValue = "default";
      const value = configManager.getConfigValue<string>(
        "nonexistent.intermediate.path",
        defaultValue
      );
      expect(value).toBe(defaultValue);
    });

    it("should return default value when path element is not an object", () => {
      configManager = new ConfigManager();
      const defaultValue = "default";
      const value = configManager.getConfigValue<string>(
        "notion.apiKey.nonexistent",
        defaultValue
      );
      expect(value).toBe(defaultValue);
    });
  });

  describe("mergeConfigs", () => {
    it("should merge two configuration objects", () => {
      configManager = new ConfigManager();

      // Create a target and source object
      const target = {
        notion: {
          apiKey: "target-api-key",
          sourcePageId: "target-source-page-id",
        },
        ai: {
          provider: "target-provider",
        },
      };

      const source = {
        notion: {
          apiKey: "source-api-key",
          extraSetting: "extra-value",
        },
        ai: {
          modelId: "source-model-id",
        },
        extraSection: {
          setting1: "value1",
        },
      };

      // Call the private mergeConfigs method using type assertion
      const result = (configManager as any).mergeConfigs(target, source);

      // Check that the target object was updated correctly
      expect(result).toBe(target); // Should return the target object
      expect(result.notion.apiKey).toBe("source-api-key"); // Should overwrite existing values
      expect(result.notion.sourcePageId).toBe("target-source-page-id"); // Should keep existing values if not in source
      expect(result.notion.extraSetting).toBe("extra-value"); // Should add new values from source
      expect(result.ai.provider).toBe("target-provider"); // Should keep existing values if not in source
      expect(result.ai.modelId).toBe("source-model-id"); // Should add new values from source
      expect(result.extraSection.setting1).toBe("value1"); // Should add new sections from source
    });

    it("should handle null or undefined source", () => {
      configManager = new ConfigManager();

      // Create a target object
      const target = {
        notion: {
          apiKey: "target-api-key",
        },
      };

      // Call the private mergeConfigs method with undefined source
      let result = (configManager as any).mergeConfigs(target, undefined);

      // Check that the target object was returned unchanged
      expect(result).toBe(target);
      expect(result.notion.apiKey).toBe("target-api-key");

      // Call the private mergeConfigs method with null source
      result = (configManager as any).mergeConfigs(target, null);

      // Check that the target object was returned unchanged
      expect(result).toBe(target);
      expect(result.notion.apiKey).toBe("target-api-key");
    });

    it("should handle arrays in source", () => {
      configManager = new ConfigManager();

      // Create a target and source object with arrays
      const target = {
        items: { values: [1, 2, 3] },
      };

      const source = {
        items: { values: [4, 5, 6] },
      };

      // Call the private mergeConfigs method
      const result = (configManager as any).mergeConfigs(target, source);

      // Check that arrays are replaced, not merged
      expect(result.items.values).toEqual([4, 5, 6]);
    });

    it("should handle non-object values in source", () => {
      configManager = new ConfigManager();

      // Create a target and source object with non-object values
      const target = {
        primitive: { value: "target-value" },
        nested: {
          object: { value: "target-nested-value" },
        },
      };

      const source = {
        primitive: "source-primitive",
        nested: {
          object: "source-primitive",
        },
      };

      // Call the private mergeConfigs method
      const result = (configManager as any).mergeConfigs(target, source);

      // Check that primitive values replace objects
      expect(result.primitive).toBe("source-primitive");
      expect(result.nested.object).toBe("source-primitive");
    });
  });

  describe("validate", () => {
    it("should return valid result when all required configs are present", () => {
      configManager = new ConfigManager();

      // Make sure all required fields are set, including baseUrl
      (configManager as any).config.storage.baseUrl =
        "https://test-bucket.example.com";

      const result = configManager.validate();

      expect(result.isValid).toBe(true);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return invalid result when Notion API key is missing", () => {
      delete process.env.NOTION_API_KEY;

      // Create a ConfigManager with a missing Notion API key
      configManager = new ConfigManager();

      // Directly modify the internal config object
      (configManager as any).config.notion.apiKey = undefined;

      const result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Notion API key is required");
    });

    it("should return invalid result when source page ID is missing", () => {
      delete process.env.NOTION_SOURCE_PAGE_ID;

      // Create a ConfigManager with a missing source page ID
      configManager = new ConfigManager();

      // Directly modify the internal config object
      (configManager as any).config.notion.sourcePageId = undefined;

      const result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Notion source page ID is required");
    });

    it("should return invalid result when AI API key is missing", () => {
      delete process.env.DEEPSEEK_API_KEY;

      // Create a modified config with missing AI API key
      const modifiedConfig = JSON.parse(JSON.stringify(mockConfig));
      delete modifiedConfig.ai.apiKey;
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify(modifiedConfig)
      );

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      const result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("AI_API_KEY (deepseek) is required");
    });

    it("should validate R2 storage configuration", () => {
      // Create a ConfigManager with R2 storage
      configManager = new ConfigManager();

      // Ensure the provider is set to r2
      (configManager as any).config.storage.provider = "r2";

      // Test missing account ID
      (configManager as any).config.storage.accountId = undefined;

      let result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("R2_ACCOUNT_ID is required");

      // Reset account ID and test missing access key
      (configManager as any).config.storage.accountId = "test-account-id";
      (configManager as any).config.storage.accessKeyId = undefined;

      result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("R2_ACCESS_KEY_ID is required");

      // Reset access key and test missing secret key
      (configManager as any).config.storage.accessKeyId = "test-access-key";
      (configManager as any).config.storage.secretAccessKey = undefined;

      result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("R2_SECRET_ACCESS_KEY is required");

      // Reset secret key and test missing bucket name
      (configManager as any).config.storage.secretAccessKey = "test-secret-key";
      (configManager as any).config.storage.bucketName = undefined;

      result = configManager.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("R2_BUCKET_NAME is required");
    });
  });
});
