import { beforeEach, describe, expect, it, vi } from "vitest";
import { INotionDatabase } from "../../../src/core/notion/NotionDatabase.interface";
import { ContentPage, NotionEntry } from "../../../src/types";
import { DatabaseUpdater } from "../../../src/workflow/database/DatabaseUpdater";

describe("DatabaseUpdater", () => {
  let databaseUpdater: DatabaseUpdater;
  let notionDatabase: INotionDatabase;
  const databaseId = "test-database-id";

  // Test data
  const mockEntries: NotionEntry[] = [
    {
      id: "entry1",
      properties: {
        "Original Page": { url: "https://www.notion.so/entry1id" },
        Title: { title: [{ text: { content: "Existing Page 1" } }] },
        Category: { select: { name: "Category 1" } },
      },
      url: "https://notion.so/entry1",
      created_time: "2023-01-01T00:00:00Z",
      last_edited_time: "2023-01-02T00:00:00Z",
    },
    {
      id: "entry2",
      properties: {
        "Original Page": { url: "https://www.notion.so/entry2id" },
        Title: { title: [{ text: { content: "Existing Page 2" } }] },
        Category: { select: { name: "Category 2" } },
      },
      url: "https://notion.so/entry2",
      created_time: "2023-01-03T00:00:00Z",
      last_edited_time: "2023-01-04T00:00:00Z",
    },
  ];

  const contentPages: ContentPage[] = [
    {
      id: "entry1id",
      title: "Updated Page 1",
      parentId: "parent-id",
      category: "Category 1",
      content: "This is the content of page 1",
      summary: "Summary of page 1",
      excerpt: "Excerpt of page 1",
      tags: ["tag1", "tag2"],
      minsRead: 5,
      imageUrl: "https://example.com/image1.jpg",
      createdTime: "2023-01-01T00:00:00Z",
      lastEditedTime: "2023-01-02T00:00:00Z",
    },
    {
      id: "new-page-id",
      title: "New Page",
      parentId: "parent-id",
      category: "Category 3",
      content: "This is the content of a new page",
      summary: "Summary of new page",
      excerpt: "Excerpt of new page",
      tags: ["tag3", "tag4"],
      minsRead: 8,
      createdTime: "2023-01-05T00:00:00Z",
      lastEditedTime: "2023-01-06T00:00:00Z",
    },
  ];

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Create mock for NotionDatabase
    notionDatabase = {
      verifyDatabase: vi.fn().mockResolvedValue(true),
      createDatabase: vi.fn().mockResolvedValue("new-database-id"),
      queryEntries: vi.fn().mockResolvedValue(mockEntries),
      createEntry: vi.fn().mockResolvedValue("new-entry-id"),
      updateEntry: vi.fn().mockResolvedValue(undefined),
      batchUpdateEntries: vi.fn().mockResolvedValue(undefined),
    };

    // Create DatabaseUpdater instance
    databaseUpdater = new DatabaseUpdater(notionDatabase, databaseId);

    // Mock console.log and console.error to reduce test output noise
    console.log = vi.fn();
    console.error = vi.fn();
  });

  describe("initialize", () => {
    it("should fetch existing entries from the database", async () => {
      // Execute
      await databaseUpdater.initialize();

      // Verify
      expect(notionDatabase.queryEntries).toHaveBeenCalledWith({
        database_id: databaseId,
        page_size: 100,
      });

      // Check if entries are stored correctly
      const entry1 = databaseUpdater.getExistingEntry(
        "https://www.notion.so/entry1id"
      );
      const entry2 = databaseUpdater.getExistingEntry("entry2");

      expect(entry1).toEqual(mockEntries[0]);
      expect(entry2).toEqual(mockEntries[1]);
    });

    it("should handle empty query results", async () => {
      // Setup
      notionDatabase.queryEntries = vi.fn().mockResolvedValue([]);

      // Execute
      await databaseUpdater.initialize();

      // Verify
      expect(notionDatabase.queryEntries).toHaveBeenCalled();
      expect(databaseUpdater.getAllExistingEntries()).toEqual([]);
    });

    it("should propagate errors during initialization", async () => {
      // Setup
      const testError = new Error("Query failed");
      notionDatabase.queryEntries = vi.fn().mockRejectedValue(testError);

      // Execute & Verify
      await expect(databaseUpdater.initialize()).rejects.toThrow(testError);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("updateEntry", () => {
    beforeEach(async () => {
      // Initialize the updater with mock entries
      await databaseUpdater.initialize();
    });

    it("should update an existing entry", async () => {
      // Execute
      const result = await databaseUpdater.updateEntry(contentPages[0]);

      // Verify
      expect(notionDatabase.updateEntry).toHaveBeenCalledWith("entry1", {
        properties: expect.objectContaining({
          Title: expect.any(Object),
          Category: expect.any(Object),
          Summary: expect.any(Object),
          Excerpt: expect.any(Object),
          "Mins Read": expect.any(Object),
          "Original Page": expect.any(Object),
          "Date Created": expect.any(Object),
          Image: expect.any(Object),
          Tags: expect.any(Object),
        }),
      });

      expect(result).toEqual({
        success: true,
        entryId: "entry1",
        isNew: false,
        message: "Updated entry: entry1",
      });
    });

    it("should create a new entry if it doesn't exist", async () => {
      // Execute
      const result = await databaseUpdater.updateEntry(contentPages[1]);

      // Verify
      expect(notionDatabase.createEntry).toHaveBeenCalledWith({
        properties: expect.objectContaining({
          Title: expect.any(Object),
          Category: expect.any(Object),
          Summary: expect.any(Object),
          Excerpt: expect.any(Object),
          "Mins Read": expect.any(Object),
          "Original Page": expect.any(Object),
          "Date Created": expect.any(Object),
          Status: expect.any(Object),
          Published: expect.any(Object),
        }),
      });

      expect(result).toEqual({
        success: true,
        entryId: "new-entry-id",
        isNew: true,
        message: "Created new entry: new-entry-id",
      });
    });

    it("should handle missing optional fields", async () => {
      // Setup
      const minimalContentPage: ContentPage = {
        id: "minimal-id",
        title: "Minimal Page",
        parentId: "parent-id",
        category: "Minimal",
        content: "Minimal content",
        createdTime: "2023-01-01T00:00:00Z",
        lastEditedTime: "2023-01-02T00:00:00Z",
      };

      // Execute
      const result = await databaseUpdater.updateEntry(minimalContentPage);

      // Verify
      expect(notionDatabase.createEntry).toHaveBeenCalledWith({
        properties: expect.objectContaining({
          Title: expect.any(Object),
          Category: expect.any(Object),
          Summary: expect.any(Object),
          Excerpt: expect.any(Object),
          "Mins Read": expect.any(Object),
          "Original Page": expect.any(Object),
          "Date Created": expect.any(Object),
          Status: expect.any(Object),
          Published: expect.any(Object),
        }),
      });

      expect(result.success).toBe(true);
      expect(result.isNew).toBe(true);
    });

    it("should handle errors during update", async () => {
      // Setup
      const testError = new Error("Update failed");
      notionDatabase.updateEntry = vi.fn().mockRejectedValue(testError);

      // Execute
      const result = await databaseUpdater.updateEntry(contentPages[0]);

      // Verify
      expect(result).toEqual({
        success: false,
        error: "Update failed",
      });
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle errors during creation", async () => {
      // Setup
      const testError = new Error("Creation failed");
      notionDatabase.createEntry = vi.fn().mockRejectedValue(testError);

      // Execute
      const result = await databaseUpdater.updateEntry(contentPages[1]);

      // Verify
      expect(result).toEqual({
        success: false,
        error: "Creation failed",
      });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe("updateEntries", () => {
    beforeEach(async () => {
      // Initialize the updater with mock entries
      await databaseUpdater.initialize();
    });

    it("should update multiple entries", async () => {
      // Setup
      const spy = vi.spyOn(databaseUpdater, "updateEntry");

      // Execute
      const results = await databaseUpdater.updateEntries(contentPages);

      // Verify
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy).toHaveBeenCalledWith(contentPages[0]);
      expect(spy).toHaveBeenCalledWith(contentPages[1]);
      expect(results.length).toBe(2);
    });

    it("should continue updating remaining entries if one fails", async () => {
      // Setup
      vi.spyOn(databaseUpdater, "updateEntry")
        .mockResolvedValueOnce({
          success: false,
          error: "First update failed",
        })
        .mockResolvedValueOnce({
          success: true,
          entryId: "new-entry-id",
          isNew: true,
          message: "Created new entry: new-entry-id",
        });

      // Execute
      const results = await databaseUpdater.updateEntries(contentPages);

      // Verify
      expect(results).toEqual([
        {
          success: false,
          error: "First update failed",
        },
        {
          success: true,
          entryId: "new-entry-id",
          isNew: true,
          message: "Created new entry: new-entry-id",
        },
      ]);
    });
  });

  describe("getExistingEntry", () => {
    beforeEach(async () => {
      // Initialize the updater with mock entries
      await databaseUpdater.initialize();
    });

    it("should return an entry by ID", () => {
      // Execute
      const result = databaseUpdater.getExistingEntry("entry1");

      // Verify
      expect(result).toEqual(mockEntries[0]);
    });

    it("should return an entry by URL", () => {
      // Execute
      const result = databaseUpdater.getExistingEntry(
        "https://www.notion.so/entry2id"
      );

      // Verify
      expect(result).toEqual(mockEntries[1]);
    });

    it("should return undefined for non-existent entries", () => {
      // Execute
      const result = databaseUpdater.getExistingEntry("non-existent");

      // Verify
      expect(result).toBeUndefined();
    });
  });

  describe("getAllExistingEntries", () => {
    beforeEach(async () => {
      // Initialize the updater with mock entries
      await databaseUpdater.initialize();
    });

    it("should return all unique entries", () => {
      // Execute
      const results = databaseUpdater.getAllExistingEntries();

      // Verify
      expect(results.length).toBe(2);
      expect(results).toContainEqual(mockEntries[0]);
      expect(results).toContainEqual(mockEntries[1]);
    });

    it("should return an empty array if no entries exist", async () => {
      // Setup
      notionDatabase.queryEntries = vi.fn().mockResolvedValue([]);
      const emptyUpdater = new DatabaseUpdater(notionDatabase, databaseId);
      await emptyUpdater.initialize();

      // Execute
      const results = emptyUpdater.getAllExistingEntries();

      // Verify
      expect(results).toEqual([]);
    });
  });
});
