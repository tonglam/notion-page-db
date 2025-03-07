import axios from "axios";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import { IAIService } from "../../core/ai/AIService.interface";
import { IStorageService } from "../../core/storage/StorageService.interface";
import { ContentPage, ImageMetadata, ImageProcessingResult } from "../../types";

/**
 * Image Processor
 * Handles image generation, downloading, and storage
 */
export class ImageProcessor {
  private aiService: IAIService;
  private storageService: IStorageService;
  private tempDir: string;

  /**
   * Creates a new ImageProcessor instance
   * @param aiService The AI service for image generation
   * @param storageService The storage service for image storage
   */
  constructor(aiService: IAIService, storageService: IStorageService) {
    this.aiService = aiService;
    this.storageService = storageService;
    this.tempDir = path.join(os.tmpdir(), "notion-page-db-images");
  }

  /**
   * Initializes the image processor
   */
  async initialize(): Promise<void> {
    // Create temp directory if it doesn't exist
    await fs.ensureDir(this.tempDir);
    console.log(
      `Initialized image processor with temp directory: ${this.tempDir}`
    );
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

      // Check if the page already has an image URL
      if (contentPage.imageUrl) {
        console.log(`Page already has an image URL: ${contentPage.imageUrl}`);

        // Check if it's already a storage URL
        if (this.isStorageUrl(contentPage.imageUrl)) {
          console.log("Image is already in storage");
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
        return await this.generateAndStoreImage(contentPage);
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
   * Processes images for multiple content pages
   * @param contentPages The content pages to process images for
   * @param generateIfMissing Whether to generate images if missing
   */
  async processAllImages(
    contentPages: ContentPage[],
    generateIfMissing = true
  ): Promise<ImageProcessingResult[]> {
    const results: ImageProcessingResult[] = [];

    for (const contentPage of contentPages) {
      const result = await this.processImages(contentPage, generateIfMissing);
      results.push(result);

      // Update the content page with the new image URL
      if (result.success && result.storageUrl) {
        contentPage.imageUrl = result.storageUrl;
      }
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

      // Create a temporary file path
      const tempFilePath = path.join(
        this.tempDir,
        `${Date.now()}-${path.basename(imageUrl) || "image.jpg"}`
      );

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
        return {
          success: false,
          error: storageResult.error || "Failed to upload image to storage",
        };
      }

      console.log(`Image uploaded to storage: ${storageResult.url}`);

      return {
        success: true,
        imageUrl,
        storageUrl: storageResult.url,
        isNew: true,
      };
    } catch (error) {
      console.error("Error downloading and storing image:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
    try {
      console.log(`Generating image for: ${contentPage.title}`);

      // Create an image prompt based on the content
      const imagePrompt = `Create a professional, striking image for an article titled "${contentPage.title}" about ${contentPage.category}. The article discusses: ${contentPage.summary?.substring(0, 200) || contentPage.title}`;

      // Create a temporary file path
      const tempFilePath = path.join(
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

      if (!imageResult.success || !imageResult.url) {
        return {
          success: false,
          error: imageResult.error || "Failed to generate image",
        };
      }

      console.log(`Image generated: ${imageResult.url}`);

      // If the image was saved locally, upload it to storage
      if (imageResult.localPath) {
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
          return {
            success: false,
            error: storageResult.error || "Failed to upload image to storage",
          };
        }

        console.log(`Image uploaded to storage: ${storageResult.url}`);

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
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
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
