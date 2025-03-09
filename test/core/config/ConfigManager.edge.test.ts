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

describe("ConfigManager Edge Cases", () => {
  let configManager: ConfigManager;
  const mockConfigPath = "test-config.json";

  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(path.resolve).mockReturnValue(mockConfigPath);
  });

  afterEach(() => {
    // Clean up environment variables
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
  });

  describe("getConfigValue edge cases", () => {
    it("should handle non-object intermediate path elements", () => {
      configManager = new ConfigManager();

      // Set a non-object value in the config
      (configManager as any).config.nonObject = "string-value";

      // Try to access a property of the non-object value
      const value = configManager.getConfigValue(
        "nonObject.property",
        "default"
      );

      // Should return the default value
      expect(value).toBe("default");
    });

    it("should handle undefined values in the config", () => {
      configManager = new ConfigManager();

      // Set an undefined value in the config
      (configManager as any).config.undefinedValue = undefined;

      // Try to access the undefined value
      const value = configManager.getConfigValue("undefinedValue", "default");

      // Should return the default value
      expect(value).toBe("default");
    });

    it("should handle null values in the config", () => {
      configManager = new ConfigManager();

      // Set a null value in the config
      (configManager as any).config.nullValue = null;

      // Try to access the null value
      const value = configManager.getConfigValue("nullValue", "default");

      // Should return the default value
      expect(value).toBe("default");
    });
  });

  describe("loadConfig edge cases", () => {
    it("should handle invalid JSON in the config file", () => {
      // Mock the file system to return invalid JSON
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue("invalid-json");

      // Create a spy on console.error
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      // Should log an error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error loading configuration:",
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it("should handle missing config file", () => {
      // Mock the file system to indicate the file doesn't exist
      vi.mocked(fs.existsSync).mockReturnValue(false);

      configManager = new ConfigManager();
      configManager.loadConfig(mockConfigPath);

      // Should not try to read the file
      expect(fs.readFileSync).not.toHaveBeenCalled();
    });

    it("should handle environment variables with different types", () => {
      // Set environment variables with different types
      process.env.NOTION_RATE_LIMIT_DELAY = "not-a-number";
      process.env.AI_MAX_TOKENS = "not-a-number";
      process.env.AI_TEMPERATURE = "not-a-number";

      configManager = new ConfigManager();
      configManager.loadConfig();

      // Should parse the values as numbers, resulting in NaN
      const notionConfig = configManager.getNotionConfig();
      const aiConfig = configManager.getAIConfig();

      // Check if the values are NaN
      expect(Number.isNaN(notionConfig.rateLimitDelay)).toBe(true);
      expect(Number.isNaN(aiConfig.maxTokens)).toBe(true);
      expect(Number.isNaN(aiConfig.temperature)).toBe(true);
    });
  });

  describe("mergeConfigs edge cases", () => {
    it("should handle arrays in the source config", () => {
      configManager = new ConfigManager();

      const target = { array: [1, 2, 3] };
      const source = { array: [4, 5, 6] };

      // Call the private mergeConfigs method
      const result = (configManager as any).mergeConfigs(target, source);

      // Should replace the array, not merge it
      expect(result.array).toEqual([4, 5, 6]);
    });

    it("should handle null or undefined source", () => {
      configManager = new ConfigManager();

      const target = { value: "target" };

      // Call the private mergeConfigs method with undefined source
      let result = (configManager as any).mergeConfigs(target, undefined);

      // Should return the target unchanged
      expect(result).toBe(target);
      expect(result.value).toBe("target");

      // Call the private mergeConfigs method with null source
      result = (configManager as any).mergeConfigs(target, null);

      // Should return the target unchanged
      expect(result).toBe(target);
      expect(result.value).toBe("target");
    });

    it("should handle primitive values in the source config", () => {
      configManager = new ConfigManager();

      const target = {
        primitive: { value: "target" },
        nested: { object: { value: "target" } },
      };

      const source = {
        primitive: "source",
        nested: { object: "source" },
      };

      // Call the private mergeConfigs method
      const result = (configManager as any).mergeConfigs(target, source);

      // Should replace primitive values
      expect(result.primitive).toBe("source");
      expect(result.nested.object).toBe("source");
    });
  });
});
