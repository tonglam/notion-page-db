import axios from "axios";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { IAIService } from "../../core/ai/AIService.interface";
import { IStorageService } from "../../core/storage/StorageService.interface";
import { ContentPage, ImageMetadata, ImageProcessingResult } from "../../types";
import { ImageTaskTracker } from "./ImageTaskTracker";

/**
 * Image Processor
 * Handles image generation, downloading, and storage
 */
export class ImageProcessor {
  private aiService: IAIService;
  private storageService: IStorageService;
  private tempDir: string;
  private activeGenerationTasks: Map<string, Promise<ImageProcessingResult>>;
  private taskTracker: ImageTaskTracker;

  /**
   * Creates a new ImageProcessor instance
   * @param aiService The AI service for image generation
   * @param storageService The storage service for image storage
   */
  constructor(aiService: IAIService, storageService: IStorageService) {
    this.aiService = aiService;
    this.storageService = storageService;
    this.tempDir = path.join(os.tmpdir(), "notion-page-db-images");
    this.activeGenerationTasks = new Map();

    // Initialize the task tracker
    this.taskTracker = new ImageTaskTracker(this.tempDir);
  }

  /**
   * Initializes the processor by creating temporary directories
   */
  async initialize(): Promise<void> {
    try {
      // Create temp directory
      await fs.ensureDir(this.tempDir);
      console.log(`Initialized temporary directory: ${this.tempDir}`);

      // Initialize the task tracker
      await this.taskTracker.initialize();
    } catch (error) {
      console.error("Error initializing image processor:", error);
    }
  }

  /**
   * Processes images for a content page
   * @param contentPage The content page to process images for
   * @param generateIfMissing Whether to generate images if missing
   */
  async processImages(
    contentPage: ContentPage,
    generateIfMissing = true
  ): Promise<ImageProcessingResult> {
    try {
      console.log(`Processing images for page: ${contentPage.title}`);

      // Check if we have a completed task in the persistent tracker
      const hasCompleted = await this.taskTracker.hasCompletedTask(
        contentPage.id
      );
      if (hasCompleted) {
        const storageUrl = await this.taskTracker.getStorageUrl(contentPage.id);
        console.log(
          `Page has a completed image task with storage URL: ${storageUrl}`
        );

        // Update the page's imageUrl
        if (storageUrl && contentPage.imageUrl !== storageUrl) {
          contentPage.imageUrl = storageUrl;
        }

        return {
          success: true,
          imageUrl: storageUrl,
          storageUrl: storageUrl,
          isNew: false,
        };
      }

      // Check if we already have an active generation task for this page
      const pageId = contentPage.id;
      if (this.activeGenerationTasks.has(pageId)) {
        console.log(
          `Active image generation task found for page: ${contentPage.title}`
        );
        // Return the existing promise
        return this.activeGenerationTasks.get(pageId)!;
      }

      // Check if the page already has an image URL
      if (contentPage.imageUrl) {
        console.log(`Page already has an image URL: ${contentPage.imageUrl}`);

        // Check if it's already a storage URL
        if (this.isStorageUrl(contentPage.imageUrl)) {
          console.log("Image is already in storage");

          // Record this in the task tracker for future reference
          await this.taskTracker.completeTask(
            contentPage.id,
            contentPage.imageUrl,
            contentPage.imageUrl
          );

          return {
            success: true,
            imageUrl: contentPage.imageUrl,
            storageUrl: contentPage.imageUrl,
            isNew: false,
          };
        }

        // Download and store the existing image
        return await this.downloadAndStoreImage(
          contentPage.imageUrl,
          contentPage
        );
      }

      // Generate a new image if requested
      if (generateIfMissing) {
        console.log("Generating new image for content");

        // Create a promise for the image generation
        const generationPromise = this.generateAndStoreImage(
          contentPage
        ).finally(() => {
          // Remove the task from the map when it completes (successfully or with error)
          this.activeGenerationTasks.delete(pageId);
          console.log(
            `Removed completed image generation task for page: ${contentPage.title}`
          );
        });

        // Store the promise in the map
        this.activeGenerationTasks.set(pageId, generationPromise);
        console.log(
          `Added new image generation task for page: ${contentPage.title}`
        );

        // Return the promise
        return generationPromise;
      }

      // No image and not generating
      return {
        success: false,
        error: "No image URL and generation not requested",
      };
    } catch (error) {
      console.error("Error processing images:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Processes images for multiple content pages with concurrency control
   * @param contentPages The content pages to process images for
   * @param generateIfMissing Whether to generate images if missing
   * @param concurrency Maximum number of concurrent image processing tasks
   * @param maxRetries Maximum number of retries for failed tasks
   */
  async processAllImages(
    contentPages: ContentPage[],
    generateIfMissing = true,
    concurrency = 3,
    maxRetries = 2
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = [];
    const successful: { page: ContentPage; result: ImageProcessingResult }[] =
      [];
    const failed: { page: ContentPage; error: string; retries: number }[] = [];
    const skipped: ContentPage[] = [];

    // Track pages that already have active generation tasks
    const inProgress: ContentPage[] = [];

    // Ensure temp directory exists
    await this.initialize();

    // Initial classification of pages
    for (const page of contentPages) {
      // Skip pages without IDs
      if (!page.id) {
        console.warn(`Skipping page without ID: ${page.title || "Untitled"}`);
        skipped.push(page);
        continue;
      }

      // Check if page already has an image URL and it's a storage URL (already processed)
      if (page.imageUrl && this.isStorageUrl(page.imageUrl)) {
        console.log(`Page already has a storage image URL: ${page.title}`);
        results.push({
          success: true,
          imageUrl: page.imageUrl,
          storageUrl: page.imageUrl,
          isNew: false,
        });
        successful.push({
          page,
          result: {
            success: true,
            imageUrl: page.imageUrl,
            storageUrl: page.imageUrl,
            isNew: false,
          },
        });
        continue;
      }

      // Check if there's already an active generation task for this page
      if (this.activeGenerationTasks.has(page.id)) {
        console.log(
          `Page already has an active image generation task: ${page.title}`
        );
        inProgress.push(page);
        continue;
      }
    }

    // Filter out pages that don't need processing
    const pagesToProcess = contentPages.filter(
      (page) =>
        !skipped.includes(page) &&
        !successful.some((entry) => entry.page.id === page.id) &&
        !inProgress.includes(page)
    );

    console.log(
      `Processing images for ${pagesToProcess.length} pages with concurrency ${concurrency}`
    );
    console.log(
      `Skipped: ${skipped.length}, Already successful: ${successful.length}, In progress: ${inProgress.length}`
    );

    // First, wait for any in-progress tasks to complete
    if (inProgress.length > 0) {
      console.log(
        `Waiting for ${inProgress.length} in-progress image generation tasks...`
      );

      const inProgressResults = await Promise.allSettled(
        inProgress.map((page) => {
          const task = this.activeGenerationTasks.get(page.id);
          return task
            ? task
            : Promise.resolve({
                success: false,
                error: "Task was removed from tracking map",
              } as ImageProcessingResult);
        })
      );

      // Process in-progress results
      inProgressResults.forEach((result, index) => {
        const page = inProgress[index];

        if (result.status === "fulfilled") {
          const imageResult = result.value;
          results.push(imageResult);

          if (imageResult.success && imageResult.storageUrl) {
            page.imageUrl = imageResult.storageUrl;
            successful.push({ page, result: imageResult });
          } else {
            failed.push({
              page,
              error:
                imageResult.error || "Unknown error during image processing",
              retries: 0,
            });
          }
        } else {
          const error =
            result.reason instanceof Error
              ? result.reason.message
              : String(result.reason);

          results.push({
            success: false,
            error: `Exception during image processing: ${error}`,
          });

          failed.push({ page, error, retries: 0 });
        }
      });
    }

    // Process new pages in batches
    let remainingPages = [...pagesToProcess];
    let retryCount = 0;

    while (remainingPages.length > 0 && retryCount <= maxRetries) {
      if (retryCount > 0) {
        console.log(
          `Retry attempt ${retryCount}/${maxRetries} for ${remainingPages.length} pages`
        );
      }

      // Process images in batches for better concurrency control
      for (let i = 0; i < remainingPages.length; i += concurrency) {
        const batch = remainingPages.slice(i, i + concurrency);
        console.log(
          `Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(remainingPages.length / concurrency)} (${batch.length} pages)`
        );

        try {
          // Process batch concurrently
          const batchResults = await Promise.allSettled(
            batch.map((page) => this.processImages(page, generateIfMissing))
          );

          // Handle results
          batchResults.forEach((settledResult, index) => {
            const page = batch[index];

            if (settledResult.status === "fulfilled") {
              const result = settledResult.value;
              results.push(result);

              if (result.success && result.storageUrl) {
                // Update the content page with the new image URL
                page.imageUrl = result.storageUrl;
                successful.push({ page, result });
              } else {
                failed.push({
                  page,
                  error:
                    result.error || "Unknown error during image processing",
                  retries: retryCount,
                });
              }
            } else {
              // Handle Promise rejection
              const error =
                settledResult.reason instanceof Error
                  ? settledResult.reason.message
                  : String(settledResult.reason);

              results.push({
                success: false,
                error: `Exception during image processing: ${error}`,
              });

              failed.push({ page, error, retries: retryCount });
            }
          });

          // Introduce a small delay between batches to avoid rate limiting
          if (i + concurrency < remainingPages.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } catch (error) {
          console.error(
            `Error processing batch ${Math.floor(i / concurrency) + 1}:`,
            error
          );
        }
      }

      // Update the remaining pages to only include failed pages that haven't reached max retries
      const failedThisRound = failed.filter((f) => f.retries === retryCount);

      if (failedThisRound.length > 0 && retryCount < maxRetries) {
        remainingPages = failedThisRound.map((f) => f.page);
        retryCount++;
      } else {
        // No more retries or nothing to retry
        break;
      }
    }

    // Log results summary
    console.log(
      `Image processing completed: ${successful.length} successful, ${failed.length} failed, ${skipped.length} skipped`
    );

    if (failed.length > 0) {
      console.error("Failed image processing:");
      failed.forEach(({ page, error }) => {
        console.error(`- ${page.title}: ${error}`);
      });
    }

    return results;
  }

  /**
   * Downloads and stores an image
   * @param imageUrl URL of the image to download
   * @param contentPage The content page the image belongs to
   */
  private async downloadAndStoreImage(
    imageUrl: string,
    contentPage: ContentPage
  ): Promise<ImageProcessingResult> {
    try {
      console.log(`Downloading image from: ${imageUrl}`);

      // Create or update task in tracker
      await this.taskTracker.createOrUpdateTask(contentPage);

      // Create a temporary file path
      const tempFilePath = path.join(
        this.tempDir,
        `${Date.now()}-${path.basename(imageUrl) || "image.jpg"}`
      );

      try {
        // Download the image
        const response = await axios({
          url: imageUrl,
          method: "GET",
          responseType: "stream",
        });

        // Save the image to the temp file
        const writer = fs.createWriteStream(tempFilePath);
        response.data.pipe(writer);

        // Wait for the download to complete
        await new Promise<void>((resolve, reject) => {
          writer.on("finish", resolve);
          writer.on("error", reject);
        });

        console.log(`Image downloaded to: ${tempFilePath}`);

        // Create metadata for the image
        const metadata: ImageMetadata = {
          title: contentPage.title,
          description: contentPage.summary || "",
          alt: `Image for ${contentPage.title}`,
          sourceUrl: imageUrl,
          tags: contentPage.tags || [],
        };

        // Upload the image to storage
        const storageResult = await this.storageService.uploadImage(
          tempFilePath,
          metadata
        );

        // Clean up the temp file
        await fs.remove(tempFilePath);

        if (!storageResult.success) {
          const error =
            storageResult.error || "Failed to upload image to storage";
          await this.taskTracker.failTask(contentPage.id, error);
          return {
            success: false,
            error,
          };
        }

        console.log(`Image uploaded to storage: ${storageResult.url}`);

        // Record the successful result in the tracker
        await this.taskTracker.completeTask(
          contentPage.id,
          imageUrl,
          storageResult.url
        );

        return {
          success: true,
          imageUrl,
          storageUrl: storageResult.url,
          isNew: true,
        };
      } finally {
        // Clean up temp file if it exists
        if (await fs.pathExists(tempFilePath)) {
          await fs.remove(tempFilePath);
        }
      }
    } catch (error) {
      console.error("Error downloading and storing image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.taskTracker.failTask(contentPage.id, errorMessage);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generates and stores an image
   * @param contentPage The content page to generate an image for
   */
  private async generateAndStoreImage(
    contentPage: ContentPage
  ): Promise<ImageProcessingResult> {
    let tempFilePath: string | undefined;

    try {
      console.log(`Generating image for: ${contentPage.title}`);

      // Create/update task in tracker
      const task = await this.taskTracker.createOrUpdateTask(contentPage);

      // If task already has a successful storage URL, return it
      if (task.status === "completed" && task.storageUrl) {
        console.log(
          `Using existing stored image from previous generation: ${task.storageUrl}`
        );
        return {
          success: true,
          imageUrl: task.sourceUrl || "",
          storageUrl: task.storageUrl,
          isNew: false,
          isGenerated: true,
        };
      }

      // Create an image prompt based on the content
      const imagePrompt = `Create a professional, striking image for an article titled "${contentPage.title}" about ${contentPage.category}. The article discusses: ${contentPage.summary?.substring(0, 200) || contentPage.title}`;

      // Create a temporary file path
      tempFilePath = path.join(
        this.tempDir,
        `${Date.now()}-${contentPage.id}.png`
      );

      // Generate the image
      const imageResult = await this.aiService.generateImage(imagePrompt, {
        size: "1024x1024",
        style: "vivid",
        quality: "standard",
        localPath: tempFilePath,
      });

      // If we have a task ID from the generator, record it
      if (imageResult.taskId) {
        await this.taskTracker.updateTaskWithId(
          contentPage.id,
          imageResult.taskId
        );
      }

      if (!imageResult.success || !imageResult.url) {
        const error = imageResult.error || "Failed to generate image";
        await this.taskTracker.failTask(contentPage.id, error);
        return {
          success: false,
          error,
        };
      }

      console.log(`Image generated: ${imageResult.url}`);

      // If the image was saved locally, upload it to storage
      if (
        imageResult.localPath &&
        (await fs.pathExists(imageResult.localPath))
      ) {
        // Create metadata for the image
        const metadata: ImageMetadata = {
          title: contentPage.title,
          description: contentPage.summary || "",
          alt: `Image for ${contentPage.title}`,
          sourceUrl: imageResult.url,
          tags: contentPage.tags || [],
        };

        // Upload the image to storage
        const storageResult = await this.storageService.uploadImage(
          imageResult.localPath,
          metadata
        );

        // Clean up the temp file
        await fs.remove(imageResult.localPath);

        if (!storageResult.success) {
          const error =
            storageResult.error || "Failed to upload image to storage";
          await this.taskTracker.failTask(contentPage.id, error);
          return {
            success: false,
            error,
          };
        }

        console.log(`Image uploaded to storage: ${storageResult.url}`);

        // Record the successful result in the tracker
        await this.taskTracker.completeTask(
          contentPage.id,
          imageResult.url,
          storageResult.url
        );

        return {
          success: true,
          imageUrl: imageResult.url,
          storageUrl: storageResult.url,
          isNew: true,
          isGenerated: true,
        };
      }

      // If the image wasn't saved locally, download and store it
      return await this.downloadAndStoreImage(imageResult.url, contentPage);
    } catch (error) {
      console.error("Error generating and storing image:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      await this.taskTracker.failTask(contentPage.id, errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      // Clean up temp file if it exists
      if (tempFilePath && (await fs.pathExists(tempFilePath))) {
        await fs.remove(tempFilePath);
      }
    }
  }

  /**
   * Checks if a URL is from the storage service
   * @param url URL to check
   */
  private isStorageUrl(url: string): boolean {
    // This is a simple check that can be customized based on the storage service
    return url.includes("amazonaws.com") || url.includes("cloudflare.com");
  }

  /**
   * Cleans up temporary files
   */
  async cleanup(): Promise<void> {
    try {
      await fs.emptyDir(this.tempDir);
      console.log("Cleaned up temporary image files");
    } catch (error) {
      console.error("Error cleaning up temporary files:", error);
    }
  }
}
