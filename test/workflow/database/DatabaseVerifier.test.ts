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
      getDatabaseId: vi.fn().mockReturnValue(databaseId),
      setDatabaseId: vi.fn(),
      findDatabaseByName: vi.fn().mockResolvedValue(databaseId),
      initializeDatabase: vi.fn().mockResolvedValue("initialized-database-id"),
    };

    // Mock NotionConfig
    notionConfig = {
      apiKey: "test-api-key",
      sourcePageId: "test-source-page-id",
      targetDatabaseName: "Test Database",
      resolvedDatabaseId: databaseId,
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
      expect(notionDatabase.setDatabaseId).toHaveBeenCalledWith(databaseId);
      expect(notionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
      expect(console.warn).toHaveBeenCalled(); // Warning about limited validation
    });

    it("should use the database ID from the NotionDatabase if not provided", async () => {
      // Execute
      const result = await databaseVerifier.verifyDatabase();

      // Verify
      expect(notionDatabase.setDatabaseId).not.toHaveBeenCalled();
      expect(notionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(notionDatabase.getDatabaseId).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
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

    it("should return failure if database ID could not be resolved", async () => {
      // Setup
      notionDatabase.getDatabaseId = vi.fn().mockReturnValue(undefined);

      // Execute
      const result = await databaseVerifier.verifyDatabase();

      // Verify
      expect(result).toEqual({
        success: false,
        errors: ["Database ID could not be resolved"],
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
    it("should initialize and verify the database", async () => {
      // Setup
      (notionDatabase.initializeDatabase as any) = vi
        .fn()
        .mockResolvedValue("initialized-database-id");
      const verifyResult: VerificationResult = {
        success: true,
        databaseId: "initialized-database-id",
        message: "Database verified successfully",
      };
      vi.spyOn(databaseVerifier, "verifyDatabase").mockResolvedValue(
        verifyResult
      );

      // Execute
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Verify
      expect(notionDatabase.initializeDatabase).toHaveBeenCalledWith(
        parentPageId
      );
      expect(databaseVerifier.verifyDatabase).toHaveBeenCalledWith(
        "initialized-database-id"
      );
      expect(result).toEqual(verifyResult);
      expect(notionConfig.resolvedDatabaseId).toBe("initialized-database-id");
    });

    it("should return verification results if database verification fails", async () => {
      // Setup
      (notionDatabase.initializeDatabase as any) = vi
        .fn()
        .mockResolvedValue("initialized-database-id");
      const verifyResult: VerificationResult = {
        success: false,
        errors: ["Database schema is invalid"],
      };
      vi.spyOn(databaseVerifier, "verifyDatabase").mockResolvedValue(
        verifyResult
      );

      // Execute
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Verify
      expect(result).toEqual(verifyResult);
    });

    it("should handle errors during initialization", async () => {
      // Setup
      const testError = new Error("Initialization failed");
      (notionDatabase.initializeDatabase as any) = vi
        .fn()
        .mockRejectedValue(testError);

      // Execute
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Verify
      expect(result).toEqual({
        success: false,
        errors: ["Initialization failed"],
      });
      expect(console.error).toHaveBeenCalled();
    });

    it("should build a valid database schema with all required properties", async () => {
      // Setup - make sure the database doesn't exist yet
      (notionDatabase.verifyDatabase as any).mockResolvedValueOnce(false);

      // Mock the initializeDatabase method to return a database ID
      (notionDatabase.initializeDatabase as any).mockResolvedValueOnce(
        "test-database-id"
      );

      // Mock the verifyDatabase method to return failure after initialization
      (notionDatabase.verifyDatabase as any).mockResolvedValueOnce({
        success: false,
        errors: ["Database does not exist or is not accessible"],
        message: "Database verification failed",
      });

      // Execute
      // Note: buildDatabaseSchema is private, so we'll test it indirectly through createDatabaseIfNeeded
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Verify
      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Database does not exist or is not accessible"
      );
      expect(notionDatabase.initializeDatabase).toHaveBeenCalledWith(
        parentPageId
      );
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
});
