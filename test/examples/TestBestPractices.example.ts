import { beforeEach, describe, expect, it, vi } from "vitest";
import { INotionDatabase } from "../../src/core/notion/NotionDatabase.interface";
import { NotionConfig } from "../../src/types";
import { DatabaseVerifier } from "../../src/workflow/database/DatabaseVerifier";
import { createTestNotionConfig } from "../fixtures";
import {
  createAsyncSpy,
  createSpy,
  createTypedMock,
  expectAsyncError,
} from "../setup";

/**
 * This file serves as an example of best practices for testing in the NotionPageDb project
 * It demonstrates:
 * 1. Using helper functions for creating mocks and test data
 * 2. Clean test organization with describe blocks
 * 3. Clear test naming conventions
 * 4. The Arrange-Act-Assert pattern
 * 5. Efficient test setup and cleanup
 * 6. Error case testing
 */
describe("DatabaseVerifier Example Tests", () => {
  // Test dependencies
  let databaseVerifier: DatabaseVerifier;
  let mockNotionDatabase: INotionDatabase;
  let notionConfig: NotionConfig;

  // Test data
  const databaseId = "test-database-id";
  const parentPageId = "test-parent-page-id";

  // Setup before each test
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create mocks using our helper functions
    mockNotionDatabase = createTypedMock<INotionDatabase>({
      verifyDatabase: createAsyncSpy(true),
      createDatabase: createAsyncSpy("new-database-id"),
      getDatabaseId: createSpy(databaseId),
      findDatabaseByName: createAsyncSpy(databaseId),
      initializeDatabase: createAsyncSpy("initialized-database-id"),
    });

    // Create test config using our fixtures
    notionConfig = createTestNotionConfig({
      resolvedDatabaseId: databaseId,
    });

    // Create the class under test with mocked dependencies
    databaseVerifier = new DatabaseVerifier(mockNotionDatabase, notionConfig);

    // Suppress console output during tests
    console.log = vi.fn();
    console.warn = vi.fn();
    console.error = vi.fn();
  });

  describe("verifyDatabase", () => {
    it("should verify an existing database successfully", async () => {
      // Arrange
      // (setup is done in beforeEach)

      // Act
      const result = await databaseVerifier.verifyDatabase(databaseId);

      // Assert
      expect(mockNotionDatabase.setDatabaseId).toHaveBeenCalledWith(databaseId);
      expect(mockNotionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
    });

    it("should use the database ID from the NotionDatabase if not provided", async () => {
      // Arrange
      // (setup is done in beforeEach)

      // Act
      const result = await databaseVerifier.verifyDatabase();

      // Assert
      expect(mockNotionDatabase.setDatabaseId).not.toHaveBeenCalled();
      expect(mockNotionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(mockNotionDatabase.getDatabaseId).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
    });

    it("should return failure if database does not exist", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);

      // Act
      const result = await databaseVerifier.verifyDatabase(databaseId);

      // Assert
      expect(result).toEqual({
        success: false,
        databaseId,
        message: "Database does not exist or is not accessible",
      });
    });
  });

  describe("createDatabaseIfNeeded", () => {
    it("should create a database if verification fails", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);

      // Act
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Assert
      expect(mockNotionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(mockNotionDatabase.createDatabase).toHaveBeenCalledWith(
        expect.anything(),
        parentPageId
      );
      expect(result).toEqual({
        success: true,
        databaseId: "new-database-id",
        message: "Database created successfully",
      });
    });

    it("should not create a database if verification succeeds", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(true);

      // Act
      const result =
        await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Assert
      expect(mockNotionDatabase.verifyDatabase).toHaveBeenCalled();
      expect(mockNotionDatabase.createDatabase).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        databaseId,
        message: "Database verified (with limited schema validation)",
      });
    });

    it("should handle database creation failures", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);
      mockNotionDatabase.createDatabase = vi
        .fn()
        .mockRejectedValue(new Error("Creation failed"));

      // Act & Assert - Using our helper function for asserting errors
      await expectAsyncError(
        async () => await databaseVerifier.createDatabaseIfNeeded(parentPageId),
        "Creation failed"
      );
    });

    it("should use source page ID when parent ID is not provided", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);

      // Act
      // @ts-expect-error: Testing with undefined parameter
      await databaseVerifier.createDatabaseIfNeeded(undefined);

      // Assert
      expect(mockNotionDatabase.initializeDatabase).toHaveBeenCalledWith(
        notionConfig.sourcePageId
      );
    });

    it("should use source page ID when parent ID is empty", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);

      // Act
      await databaseVerifier.createDatabaseIfNeeded("");

      // Assert
      expect(mockNotionDatabase.initializeDatabase).toHaveBeenCalledWith(
        notionConfig.sourcePageId
      );
    });
  });

  describe("database schema", () => {
    it("should use the correct schema for creating a database", async () => {
      // Arrange
      mockNotionDatabase.verifyDatabase = createAsyncSpy(false);

      // Act
      await databaseVerifier.createDatabaseIfNeeded(parentPageId);

      // Assert
      // Access the first argument (schema) passed to createDatabase
      const schema = (mockNotionDatabase.createDatabase as any).mock
        .calls[0][0];
      expect(schema).toHaveProperty("properties");
      expect(schema.properties).toHaveProperty("Title");
    });
  });
});
