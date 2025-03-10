import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentPage } from "../../../src/types";
import {
  ImageTaskEntry,
  ImageTaskTracker,
} from "../../../src/workflow/images/ImageTaskTracker";

// Mock fs-extra
vi.mock("fs-extra");

describe("ImageTaskTracker", () => {
  let tracker: ImageTaskTracker;
  const tempDir = path.join(os.tmpdir(), "image-task-tracker-test");
  const filePath = path.join(tempDir, "image-tasks.json");

  // Sample content page for testing
  const contentPage: ContentPage = {
    id: "test-page-1",
    title: "Test Page",
    content: "Test content",
    parentId: "parent-id",
    category: "Testing",
    createdTime: "2023-01-01T00:00:00Z",
    lastEditedTime: "2023-01-02T00:00:00Z",
  };

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Setup mocks
    vi.mocked(fs.ensureDir).mockResolvedValue();
    vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(false));
    vi.mocked(fs.writeJSON).mockResolvedValue();

    // Create tracker
    tracker = new ImageTaskTracker(tempDir);
  });

  afterEach(async () => {
    // Clean up if needed
    vi.mocked(fs.remove).mockResolvedValue();
    await fs.remove(tempDir);
  });

  describe("initialize", () => {
    it("should create directory and file if not exists", async () => {
      await tracker.initialize();

      expect(fs.ensureDir).toHaveBeenCalledWith(tempDir);
      expect(fs.pathExists).toHaveBeenCalledWith(filePath);
      expect(fs.writeJSON).toHaveBeenCalledWith(filePath, {}, { spaces: 2 });
    });

    it("should load existing tasks if file exists", async () => {
      const mockData = {
        "test-page-1": {
          pageId: "test-page-1",
          pageTitle: "Test Page",
          status: "completed",
          sourceUrl: "https://example.com/source.jpg",
          storageUrl: "https://storage.example.com/image.jpg",
          createdAt: "2023-01-01T00:00:00Z",
          updatedAt: "2023-01-02T00:00:00Z",
          attempts: 1,
        },
      };

      vi.mocked(fs.pathExists).mockImplementation(() => Promise.resolve(true));
      vi.mocked(fs.readJSON).mockResolvedValue(mockData);

      await tracker.initialize();

      expect(fs.ensureDir).toHaveBeenCalledWith(tempDir);
      expect(fs.pathExists).toHaveBeenCalledWith(filePath);
      expect(fs.readJSON).toHaveBeenCalledWith(filePath);

      // Check task is loaded
      const task = await tracker.getTask("test-page-1");
      expect(task).toEqual(mockData["test-page-1"]);
    });

    it("should handle initialization error gracefully", async () => {
      const error = new Error("Cannot read file");
      vi.mocked(fs.ensureDir).mockRejectedValue(error);

      // Mock console.error to prevent test output noise
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await tracker.initialize();

      expect(consoleSpy).toHaveBeenCalledWith(
        "Error initializing image task tracker:",
        error
      );

      // Still possible to use tracker after error
      const result = await tracker.createOrUpdateTask(contentPage);
      expect(result).toBeDefined();
    });
  });

  describe("createOrUpdateTask", () => {
    it("should create a new task for a page", async () => {
      const task = await tracker.createOrUpdateTask(contentPage);

      expect(task).toMatchObject({
        pageId: contentPage.id,
        pageTitle: contentPage.title,
        status: "pending",
        attempts: 0,
      });

      expect(fs.writeJSON).toHaveBeenCalled();
    });

    it("should update an existing task", async () => {
      // Create initial task
      await tracker.createOrUpdateTask(contentPage);

      // Update it with same content page
      const updatedPage = { ...contentPage, title: "Updated Title" };
      const task = await tracker.createOrUpdateTask(updatedPage);

      expect(task.pageTitle).toBe("Updated Title");
      expect(fs.writeJSON).toHaveBeenCalledTimes(2);
    });

    it("should return existing completed task without updating", async () => {
      // Create a completed task directly in the map
      const completedTask: ImageTaskEntry = {
        pageId: contentPage.id,
        pageTitle: contentPage.title,
        status: "completed",
        sourceUrl: "https://example.com/source.jpg",
        storageUrl: "https://storage.example.com/image.jpg",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-02T00:00:00Z",
        attempts: 1,
      };

      // Simulate a pre-existing task
      await tracker.initialize();
      (tracker as any).tasks.set(contentPage.id, completedTask);

      // Try to update the task
      const task = await tracker.createOrUpdateTask(contentPage);

      // Should return the original completed task without changes
      expect(task).toBe(completedTask);
      // First call for initialize, not called again for update
      expect(fs.writeJSON).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateTaskWithId", () => {
    it("should update a task with a task ID", async () => {
      // Create task first
      await tracker.createOrUpdateTask(contentPage);

      // Update with task ID
      const taskId = "task-123";
      await tracker.updateTaskWithId(contentPage.id, taskId);

      // Verify task is updated
      const task = await tracker.getTask(contentPage.id);
      expect(task).toBeDefined();
      expect(task?.taskId).toBe(taskId);
      expect(task?.status).toBe("processing");
    });

    it("should do nothing if task doesn't exist", async () => {
      // Update non-existent task
      await tracker.updateTaskWithId("non-existent", "task-123");

      // Verify nothing was saved
      expect(fs.writeJSON).toHaveBeenCalledTimes(1); // Just from initialize
    });
  });

  describe("completeTask", () => {
    it("should mark a task as completed", async () => {
      // Create task first
      await tracker.createOrUpdateTask(contentPage);

      // Complete the task
      const sourceUrl = "https://example.com/source.jpg";
      const storageUrl = "https://storage.example.com/image.jpg";
      await tracker.completeTask(contentPage.id, sourceUrl, storageUrl);

      // Verify task is completed
      const task = await tracker.getTask(contentPage.id);
      expect(task).toBeDefined();
      expect(task?.status).toBe("completed");
      expect(task?.sourceUrl).toBe(sourceUrl);
      expect(task?.storageUrl).toBe(storageUrl);
      expect(task?.error).toBeUndefined();
    });

    it("should do nothing if task doesn't exist", async () => {
      // Complete non-existent task
      await tracker.completeTask(
        "non-existent",
        "https://example.com/source.jpg",
        "https://storage.example.com/image.jpg"
      );

      // Verify nothing was saved
      expect(fs.writeJSON).toHaveBeenCalledTimes(1); // Just from initialize
    });
  });

  describe("failTask", () => {
    it("should mark a task as failed and increment attempts", async () => {
      // Create task first
      await tracker.createOrUpdateTask(contentPage);

      // Fail the task
      const error = "Generation failed";
      await tracker.failTask(contentPage.id, error);

      // Verify task is failed
      const task = await tracker.getTask(contentPage.id);
      expect(task).toBeDefined();
      expect(task?.status).toBe("failed");
      expect(task?.error).toBe(error);
      expect(task?.attempts).toBe(1);

      // Fail again to check attempts increment
      await tracker.failTask(contentPage.id, "Another error");
      const taskAfterSecondFailure = await tracker.getTask(contentPage.id);
      expect(taskAfterSecondFailure?.attempts).toBe(2);
    });

    it("should do nothing if task doesn't exist", async () => {
      // Fail non-existent task
      await tracker.failTask("non-existent", "Error message");

      // Verify nothing was saved
      expect(fs.writeJSON).toHaveBeenCalledTimes(1); // Just from initialize
    });
  });

  describe("query methods", () => {
    beforeEach(async () => {
      // Create some tasks to query
      await tracker.initialize();

      // Sample tasks
      const completedTask: ImageTaskEntry = {
        pageId: "completed-page",
        pageTitle: "Completed Page",
        status: "completed",
        sourceUrl: "https://example.com/source1.jpg",
        storageUrl: "https://storage.example.com/image1.jpg",
        createdAt: "2023-01-01T00:00:00Z",
        updatedAt: "2023-01-02T00:00:00Z",
        attempts: 1,
      };

      const pendingTask: ImageTaskEntry = {
        pageId: "pending-page",
        pageTitle: "Pending Page",
        status: "pending",
        createdAt: "2023-01-03T00:00:00Z",
        updatedAt: "2023-01-03T00:00:00Z",
        attempts: 0,
      };

      const failedTask: ImageTaskEntry = {
        pageId: "failed-page",
        pageTitle: "Failed Page",
        status: "failed",
        error: "Failed to generate",
        createdAt: "2023-01-04T00:00:00Z",
        updatedAt: "2023-01-04T00:00:00Z",
        attempts: 3,
      };

      // Set tasks directly
      (tracker as any).tasks.set("completed-page", completedTask);
      (tracker as any).tasks.set("pending-page", pendingTask);
      (tracker as any).tasks.set("failed-page", failedTask);
    });

    it("should check if a completed task exists", async () => {
      // Check completed page
      expect(await tracker.hasCompletedTask("completed-page")).toBe(true);

      // Check non-completed page
      expect(await tracker.hasCompletedTask("pending-page")).toBe(false);
      expect(await tracker.hasCompletedTask("failed-page")).toBe(false);
      expect(await tracker.hasCompletedTask("non-existent")).toBe(false);
    });

    it("should get tasks by status", async () => {
      // Get completed tasks
      const completedTasks = await tracker.getTasksByStatus("completed");
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0].pageId).toBe("completed-page");

      // Get pending tasks
      const pendingTasks = await tracker.getTasksByStatus("pending");
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].pageId).toBe("pending-page");

      // Get failed tasks
      const failedTasks = await tracker.getTasksByStatus("failed");
      expect(failedTasks).toHaveLength(1);
      expect(failedTasks[0].pageId).toBe("failed-page");

      // Get processing tasks (empty)
      const processingTasks = await tracker.getTasksByStatus("processing");
      expect(processingTasks).toHaveLength(0);
    });

    it("should get storage URL for a task", async () => {
      // Get URL for completed task
      const url = await tracker.getStorageUrl("completed-page");
      expect(url).toBe("https://storage.example.com/image1.jpg");

      // Get URL for non-completed task
      const pendingUrl = await tracker.getStorageUrl("pending-page");
      expect(pendingUrl).toBeUndefined();

      // Get URL for non-existent task
      const nonExistentUrl = await tracker.getStorageUrl("non-existent");
      expect(nonExistentUrl).toBeUndefined();
    });

    it("should get all tasks", async () => {
      const allTasks = await tracker.getAllTasks();
      expect(allTasks).toHaveLength(3);

      const pageIds = allTasks.map((t) => t.pageId);
      expect(pageIds).toContain("completed-page");
      expect(pageIds).toContain("pending-page");
      expect(pageIds).toContain("failed-page");
    });
  });

  describe("clearAllTasks", () => {
    it("should clear all tasks", async () => {
      // Create a task
      await tracker.createOrUpdateTask(contentPage);

      // Verify task exists
      expect(await tracker.getTask(contentPage.id)).toBeDefined();

      // Clear all tasks
      await tracker.clearAllTasks();

      // Verify task is gone
      expect(await tracker.getTask(contentPage.id)).toBeUndefined();

      // Verify empty object was saved
      expect(fs.writeJSON).toHaveBeenCalledWith(filePath, {}, { spaces: 2 });
    });
  });
});
