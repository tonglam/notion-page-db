import * as fs from "fs-extra";
import * as path from "path";
import { ContentPage } from "../../types";

/**
 * Status of an image task
 */
export type ImageTaskStatus = "pending" | "processing" | "completed" | "failed";

/**
 * Entry for an image task in the tracker
 */
export interface ImageTaskEntry {
  pageId: string; // Content page ID
  pageTitle: string; // Title for logging/debugging
  taskId?: string; // DashScope task ID
  status: ImageTaskStatus;
  sourceUrl?: string; // Original/downloaded image URL
  storageUrl?: string; // Final R2 storage URL
  createdAt: string; // When the task was created
  updatedAt: string; // Last updated timestamp
  attempts: number; // Number of generation attempts
  error?: string; // Last error message if failed
}

/**
 * Tracks image generation tasks with persistence
 * Provides a single source of truth for image tasks across application runs
 */
export class ImageTaskTracker {
  private filePath: string;
  private tasks: Map<string, ImageTaskEntry>;
  private initialized: boolean = false;

  /**
   * Creates a new ImageTaskTracker
   * @param storageDir Directory to store the task file
   */
  constructor(storageDir: string) {
    this.filePath = path.join(storageDir, "image-tasks.json");
    this.tasks = new Map();
  }

  /**
   * Initializes the tracker by loading existing tasks
   */
  async initialize(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.ensureDir(path.dirname(this.filePath));

      // Load existing tasks if file exists
      if (await fs.pathExists(this.filePath)) {
        const data = await fs.readJSON(this.filePath);

        // Convert the object to a Map
        this.tasks = new Map(Object.entries(data));
        console.log(
          `Loaded ${this.tasks.size} image tasks from ${this.filePath}`
        );
      } else {
        console.log(
          `No existing task file found at ${this.filePath}, creating new one`
        );
        await this.save();
      }

      this.initialized = true;
    } catch (error) {
      console.error("Error initializing image task tracker:", error);
      // Initialize with empty tasks on error
      this.tasks = new Map();
    }
  }

  /**
   * Saves the current tasks to the file
   */
  private async save(): Promise<void> {
    try {
      // Convert Map to object for JSON serialization
      const data = Object.fromEntries(this.tasks);
      await fs.writeJSON(this.filePath, data, { spaces: 2 });
    } catch (error) {
      console.error("Error saving image tasks:", error);
    }
  }

  /**
   * Creates or updates a task for a content page
   * @param contentPage The content page
   * @returns The task entry
   */
  async createOrUpdateTask(contentPage: ContentPage): Promise<ImageTaskEntry> {
    if (!this.initialized) {
      await this.initialize();
    }

    const existing = this.tasks.get(contentPage.id);

    // If task exists and is completed, just return it
    if (existing && existing.status === "completed" && existing.storageUrl) {
      return existing;
    }

    // Create or update task
    const entry: ImageTaskEntry = existing || {
      pageId: contentPage.id,
      pageTitle: contentPage.title || "Untitled",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      attempts: 0,
    };

    // Always update these fields
    entry.updatedAt = new Date().toISOString();

    // Set page title if it changed
    if (contentPage.title && entry.pageTitle !== contentPage.title) {
      entry.pageTitle = contentPage.title;
    }

    this.tasks.set(contentPage.id, entry);
    await this.save();
    return entry;
  }

  /**
   * Updates a task with a generation task ID
   * @param pageId Content page ID
   * @param taskId Generation task ID
   */
  async updateTaskWithId(pageId: string, taskId: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const task = this.tasks.get(pageId);
    if (task) {
      task.taskId = taskId;
      task.status = "processing";
      task.updatedAt = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * Marks a task as completed with the source and storage URLs
   * @param pageId Content page ID
   * @param sourceUrl Original/source image URL
   * @param storageUrl Storage (R2) URL
   */
  async completeTask(
    pageId: string,
    sourceUrl: string,
    storageUrl: string
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const task = this.tasks.get(pageId);
    if (task) {
      task.status = "completed";
      task.sourceUrl = sourceUrl;
      task.storageUrl = storageUrl;
      task.updatedAt = new Date().toISOString();
      task.error = undefined; // Clear any previous errors
      await this.save();
    }
  }

  /**
   * Marks a task as failed with an error message
   * @param pageId Content page ID
   * @param error Error message
   */
  async failTask(pageId: string, error: string): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const task = this.tasks.get(pageId);
    if (task) {
      task.status = "failed";
      task.error = error;
      task.attempts++;
      task.updatedAt = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * Gets a task by page ID
   * @param pageId Content page ID
   * @returns The task entry or undefined if not found
   */
  async getTask(pageId: string): Promise<ImageTaskEntry | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.tasks.get(pageId);
  }

  /**
   * Checks if a completed task exists for a page
   * @param pageId Content page ID
   * @returns True if a completed task exists
   */
  async hasCompletedTask(pageId: string): Promise<boolean> {
    if (!this.initialized) {
      await this.initialize();
    }

    const task = this.tasks.get(pageId);
    return !!task && task.status === "completed" && !!task.storageUrl;
  }

  /**
   * Gets all tasks with a specific status
   * @param status Task status to filter by
   * @returns Array of task entries
   */
  async getTasksByStatus(status: ImageTaskStatus): Promise<ImageTaskEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.tasks.values()).filter(
      (task) => task.status === status
    );
  }

  /**
   * Gets the storage URL for a page
   * @param pageId Content page ID
   * @returns Storage URL or undefined if not found
   */
  async getStorageUrl(pageId: string): Promise<string | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    const task = this.tasks.get(pageId);
    return task?.storageUrl;
  }

  /**
   * Gets all tasks
   * @returns Array of all task entries
   */
  async getAllTasks(): Promise<ImageTaskEntry[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return Array.from(this.tasks.values());
  }

  /**
   * Clears all tasks (mainly for testing)
   */
  async clearAllTasks(): Promise<void> {
    this.tasks.clear();
    await this.save();
  }
}
