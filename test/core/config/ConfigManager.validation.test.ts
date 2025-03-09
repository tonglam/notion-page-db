import { describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../../src/core/config/ConfigManager";

// Mock dependencies
vi.mock("fs");
vi.mock("path");

describe("ConfigManager Validation", () => {
  it("should detect missing Notion API key", () => {
    // Create a ConfigManager with a missing Notion API key
    const configManager = new ConfigManager();

    // Directly modify the internal config object to simulate a missing API key
    (configManager as any).config.notion.apiKey = undefined;

    const result = configManager.validate();

    expect(result.isValid).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Notion API key is required");
  });

  it("should detect missing Notion source page ID", () => {
    // Create a ConfigManager with a missing source page ID
    const configManager = new ConfigManager();

    // Directly modify the internal config object to simulate a missing source page ID
    (configManager as any).config.notion.sourcePageId = undefined;

    const result = configManager.validate();

    expect(result.isValid).toBe(false);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Notion source page ID is required");
  });

  it("should detect missing AI API key", () => {
    // Create a ConfigManager with a missing AI API key
    const configManager = new ConfigManager();

    // Directly modify the internal config object to simulate a missing AI API key
    (configManager as any).config.ai.apiKey = undefined;

    const result = configManager.validate();

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      `AI_API_KEY (${(configManager as any).config.ai.provider}) is required`
    );
  });

  it("should validate R2 storage configuration", () => {
    // Create a ConfigManager with R2 storage
    const configManager = new ConfigManager();

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

    // Reset bucket name and test missing public URL (warning, not error)
    (configManager as any).config.storage.bucketName = "test-bucket";
    (configManager as any).config.storage.baseUrl = undefined;

    result = configManager.validate();

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "R2_PUBLIC_URL is not set. Public URLs cannot be generated."
    );
  });
});
