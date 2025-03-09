import { describe, expect, it, vi } from "vitest";
import { ConfigManager } from "../../../src/core/config/ConfigManager";

// Mock dependencies
vi.mock("fs");
vi.mock("path");

describe("ConfigManager mergeConfigs", () => {
  it("should merge two configuration objects", () => {
    const configManager = new ConfigManager();

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
    const configManager = new ConfigManager();

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
    const configManager = new ConfigManager();

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
    const configManager = new ConfigManager();

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
