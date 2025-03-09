import * as fs from "fs-extra";
import * as path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { INotionDatabase } from "../../../src/core/notion/NotionDatabase.interface";
import {
  DatabaseSchema,
  NotionConfig,
  VerificationResult,
} from "../../../src/types";
import { DatabaseVerifier } from "../../../src/workflow/database/DatabaseVerifier";

// Mock fs-extra and path modules
vi.mock("fs-extra", () => ({
  pathExists: vi.fn(),
  readJson: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn(),
}));

describe("DatabaseVerifier", () => {
  let databaseVerifier: DatabaseVerifier;
  let notionDatabase: INotionDatabase;
  let notionConfig: NotionConfig;
  const databaseId = "test-database-id";
  const parentPageId = "test-parent-page-id";

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock NotionDatabase
    notionDatabase = {
      verifyDatabase: vi.fn().mockResolvedValue(true),
      createDatabase: vi.fn().mockResolvedValue("new-database-id"),
      queryEntries: vi.fn().mockResolvedValue([]),
      createEntry: vi.fn().mockResolvedValue("new-entry-id"),
      updateEntry: vi.fn().mockResolvedValue(undefined),
      batchUpdateEntries: vi.fn().mockResolvedValue(undefined),
    };

    // Mock NotionConfig
    notionConfig = {
      apiKey: "test-api-key",
      sourcePageId: "test-source-page-id",
      targetDatabaseId: databaseId,
    };

    // Create DatabaseVerifier instance
    databaseVerifier = new DatabaseVerifier(notionDatabase, notionConfig);

    // Mock console methods to reduce test output noise
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();

    // Mock path.join to return a predictable path
    (path.join as any).mockImplementation((...parts) => parts.join("/"));
  });

  describe("verifyDatabase", () => {
    it("should verify an existing database successfully", async () => {
      // Execute
      const result = await databaseVerifier.verifyDatabase(databaseId);

      // Verify
      expect(notionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
      expect(console.warn).toHaveBeenCalled(); // Warning about limited validation
    });

    it("should return failure if database does not exist", async () => {
      // Setup
      notionDatabase.verifyDatabase = vi.fn().mockResolvedValue(false);

      // Execute
      const result = await databaseVerifier.verifyDatabase(databaseId);

      // Verify
      expect(result).toEqual({
        success: false,
        errors: ["Database does not exist or is not accessible"],
      });
    });

    it("should handle errors during verification", async () => {
      // Setup
      const testError = new Error("Verification failed");
      notionDatabase.verifyDatabase = vi.fn().mockRejectedValue(testError);

      // Execute
      const result = await databaseVerifier.verifyDatabase(databaseId);

      // Verify
      expect(result).toEqual({
        success: false,
        errors: ["Verification failed"],
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("createDatabaseIfNeeded", () => {
    it("should verify an existing database without creating a new one", async () => {
      // Setup
      const verifyResult: VerificationResult = {
        success: true,
        databaseId,
        message: "Database verified successfully",
      };
      vi.spyOn(databaseVerifier, "verifyDatabase").mockResolvedValue(
        verifyResult
      );

      // Execute
      const result = await databaseVerifier.createDatabaseIfNeeded(databaseId);

      // Verify
      expect(databaseVerifier.verifyDatabase).toHaveBeenCalledWith(databaseId);
      expect(notionDatabase.createDatabase).not.toHaveBeenCalled();
      expect(result).toEqual(verifyResult);
    });

    it("should create a new database when database ID is not provided", async () => {
      // Execute
      const result = await databaseVerifier.createDatabaseIfNeeded(
        undefined,
        parentPageId
      );

      // Verify
      expect(notionDatabase.createDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Content Database",
          properties: expect.any(Object),
        })
      );
      expect(result).toEqual({
        success: true,
        databaseId: "new-database-id",
        message: "Created new database with ID new-database-id",
      });
    });

    it("should return failure if parent page ID is missing when creating a new database", async () => {
      // Execute
      const result = await databaseVerifier.createDatabaseIfNeeded(
        undefined,
        undefined
      );

      // Verify
      expect(notionDatabase.createDatabase).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        errors: ["Parent page ID is required to create a new database"],
      });
    });

    it("should return verification results if existing database has issues", async () => {
      // Setup
      const verifyResult: VerificationResult = {
        success: false,
        errors: ["Database schema is invalid"],
      };
      vi.spyOn(databaseVerifier, "verifyDatabase").mockResolvedValue(
        verifyResult
      );

      // Execute
      const result = await databaseVerifier.createDatabaseIfNeeded(databaseId);

      // Verify
      expect(result).toEqual(verifyResult);
    });

    it("should handle errors during creation", async () => {
      // Setup
      const testError = new Error("Creation failed");
      notionDatabase.createDatabase = vi.fn().mockRejectedValue(testError);

      // Execute
      const result = await databaseVerifier.createDatabaseIfNeeded(
        undefined,
        parentPageId
      );

      // Verify
      expect(result).toEqual({
        success: false,
        errors: ["Creation failed"],
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("loadSchemaConfig", () => {
    it("should load schema from the specified path", async () => {
      // Setup
      const mockSchema: DatabaseSchema = {
        name: "Custom Schema",
        properties: {
          Title: { type: "title" },
          CustomField: { type: "number" },
        },
      };
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readJson as any).mockResolvedValue(mockSchema);

      // Execute
      const result = await databaseVerifier.loadSchemaConfig(
        "/custom/path/schema.json"
      );

      // Verify
      expect(fs.pathExists).toHaveBeenCalledWith("/custom/path/schema.json");
      expect(fs.readJson).toHaveBeenCalledWith("/custom/path/schema.json");
      expect(result).toEqual(mockSchema);
    });

    it("should load schema from the default path if not specified", async () => {
      // Setup
      const mockSchema: DatabaseSchema = {
        name: "Default Schema",
        properties: {
          Title: { type: "title" },
        },
      };
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readJson as any).mockResolvedValue(mockSchema);
      (path.join as any).mockReturnValue("default/path/database-schema.json");

      // Execute
      const result = await databaseVerifier.loadSchemaConfig();

      // Verify
      expect(path.join).toHaveBeenCalledWith(
        expect.any(String),
        "config",
        "database-schema.json"
      );
      expect(fs.pathExists).toHaveBeenCalledWith(
        "default/path/database-schema.json"
      );
      expect(fs.readJson).toHaveBeenCalledWith(
        "default/path/database-schema.json"
      );
      expect(result).toEqual(mockSchema);
    });

    it("should return null if schema file doesn't exist", async () => {
      // Setup
      (fs.pathExists as any).mockResolvedValue(false);

      // Execute
      const result = await databaseVerifier.loadSchemaConfig();

      // Verify
      expect(fs.readJson).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should handle errors when loading schema", async () => {
      // Setup
      const testError = new Error("File read error");
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readJson as any).mockRejectedValue(testError);

      // Execute
      const result = await databaseVerifier.loadSchemaConfig();

      // Verify
      expect(console.error).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe("buildDatabaseSchema", () => {
    it("should build a valid database schema with all required properties", async () => {
      // Execute
      // Note: buildDatabaseSchema is private, so we'll test it indirectly through createDatabaseIfNeeded
      await databaseVerifier.createDatabaseIfNeeded(undefined, parentPageId);

      // Verify
      expect(notionDatabase.createDatabase).toHaveBeenCalledWith(
        expect.objectContaining({
          properties: expect.objectContaining({
            Title: { type: "title" },
            Category: { type: "select", options: expect.any(Array) },
            Tags: { type: "multi_select", options: [] },
            Summary: { type: "rich_text" },
            Excerpt: { type: "rich_text" },
            "Mins Read": { type: "number", format: "number" },
            Image: { type: "url" },
            R2ImageUrl: { type: "url" },
            "Date Created": { type: "date" },
            Status: { type: "select", options: expect.any(Array) },
            "Original Page": { type: "url" },
            Published: { type: "checkbox" },
          }),
        })
      );
    });
  });
});
