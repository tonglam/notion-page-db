import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs-extra";
import * as path from "path";
import {
  ImageMetadata,
  StorageConfig,
  StorageItem,
  StorageResult,
} from "../../types";
import { IStorageService } from "./StorageService.interface";

/**
 * Implementation of the StorageService using Cloudflare R2
 * Handles image and file storage
 */
export class StorageService implements IStorageService {
  private s3Client: S3Client;
  private config: StorageConfig;
  private bucketName: string;
  private baseUrl: string;

  /**
   * Creates a new StorageService instance
   * @param config The storage configuration
   */
  constructor(config: StorageConfig) {
    // Validate required fields
    if (
      !config.provider ||
      !config.bucketName ||
      !config.accessKeyId ||
      !config.secretAccessKey
    ) {
      throw new Error("Invalid storage configuration: missing required fields");
    }

    this.config = config;
    this.bucketName = config.bucketName;
    this.baseUrl = config.baseUrl || "";

    // Create client options
    const clientOptions: any = {
      region: config.region || "auto",
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    // Add endpoint for Cloudflare R2 if account ID is provided
    if (config.accountId && config.provider.toLowerCase() === "r2") {
      clientOptions.endpoint = `https://${config.accountId}.r2.cloudflarestorage.com`;
    }

    this.s3Client = new S3Client(clientOptions);
  }

  /**
   * Uploads an image to the storage service
   * @param imagePath Path to the image to upload
   * @param metadata Metadata for the image
   */
  async uploadImage(
    imagePath: string,
    metadata?: ImageMetadata
  ): Promise<StorageResult> {
    try {
      // Check if the file exists
      if (!(await fs.pathExists(imagePath))) {
        throw new Error(`File not found: ${imagePath}`);
      }

      // Read the file
      const fileContent = await fs.readFile(imagePath);

      // Get the file extension
      const fileExtension = path.extname(imagePath).toLowerCase();

      // Determine content type
      let contentType = "application/octet-stream";
      if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
        contentType = "image/jpeg";
      } else if (fileExtension === ".png") {
        contentType = "image/png";
      } else if (fileExtension === ".gif") {
        contentType = "image/gif";
      } else if (fileExtension === ".webp") {
        contentType = "image/webp";
      }

      // Create a key for the image using a timestamp and original filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = path.basename(imagePath);
      const key = `images/${timestamp}-${fileName}`;

      // Set up metadata object
      const s3Metadata: Record<string, string> = {};
      if (metadata) {
        if (metadata.title) s3Metadata.title = metadata.title;
        if (metadata.description) s3Metadata.description = metadata.description;
        if (metadata.alt) s3Metadata.alt = metadata.alt;
        if (metadata.author) s3Metadata.author = metadata.author;
        if (metadata.sourceUrl) s3Metadata.sourceUrl = metadata.sourceUrl;

        // Convert tags array to string if present
        if (metadata.tags && Array.isArray(metadata.tags)) {
          s3Metadata.tags = metadata.tags.join(",");
        }
      }

      // Upload to S3
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: fileContent,
        ContentType: contentType,
        Metadata: s3Metadata,
      });

      await this.s3Client.send(command);

      // Get the public URL
      const url = await this.getPublicUrl(key);

      return {
        key,
        url,
        contentType,
        size: fileContent.length,
        success: true,
      };
    } catch (error) {
      console.error("Error uploading image:", error);
      return {
        key: "",
        url: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gets a public URL for a stored item
   * @param key Key of the item to get URL for
   * @param expiresIn Time in seconds until the URL expires (for presigned URLs)
   */
  async getPublicUrl(key: string, expiresIn = 3600): Promise<string> {
    try {
      // If configured to use presigned URLs
      if (this.config.usePresignedUrls) {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });

        return await getSignedUrl(this.s3Client, command, { expiresIn });
      }

      // For Cloudflare R2, use the public URL if configured
      if (this.baseUrl) {
        // Ensure baseUrl doesn't end with slash and key doesn't start with one
        const normalizedBaseUrl = this.baseUrl.endsWith("/")
          ? this.baseUrl.slice(0, -1)
          : this.baseUrl;

        const normalizedKey = key.startsWith("/") ? key.slice(1) : key;

        return `${normalizedBaseUrl}/${normalizedKey}`;
      }

      // Fallback to standard S3 URL format (should rarely be used with R2)
      const region = this.config.region || "auto";
      return `https://${this.bucketName}.r2.${region}.cloudflarestorage.com/${key}`;
    } catch (error) {
      console.error("Error generating URL:", error);
      throw error;
    }
  }

  /**
   * Lists items in a directory
   * @param prefix Directory prefix to list items from
   */
  async listItems(prefix: string): Promise<StorageItem[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
      });

      const response = await this.s3Client.send(command);

      if (!response.Contents) {
        return [];
      }

      // Convert S3 objects to StorageItems
      const items = await Promise.all(
        response.Contents.map(async (item) => {
          const key = item.Key || "";
          const url = await this.getPublicUrl(key);

          return {
            key,
            url,
            size: item.Size || 0,
            lastModified: item.LastModified || new Date(),
            contentType: this.getContentTypeFromKey(key),
            eTag: item.ETag || "",
          };
        })
      );

      return items;
    } catch (error) {
      console.error("Error listing items:", error);
      return [];
    }
  }

  /**
   * Deletes an item from storage
   * @param key Key of the item to delete
   */
  async deleteItem(key: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error("Error deleting item:", error);
      return false;
    }
  }

  /**
   * Copies an item to a new location
   * @param sourceKey Source key of the item to copy
   * @param destinationKey Destination key for the copied item
   */
  async copyItem(
    sourceKey: string,
    destinationKey: string
  ): Promise<StorageResult> {
    try {
      const command = new CopyObjectCommand({
        Bucket: this.bucketName,
        CopySource: `${this.bucketName}/${sourceKey}`,
        Key: destinationKey,
      });

      await this.s3Client.send(command);

      // Get the URL for the copied item
      const url = await this.getPublicUrl(destinationKey);

      return {
        key: destinationKey,
        url,
        contentType: this.getContentTypeFromKey(destinationKey),
        success: true,
      };
    } catch (error) {
      console.error("Error copying item:", error);
      return {
        key: "",
        url: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Gets the content type from a file key based on extension
   * @param key Key to get content type for
   */
  private getContentTypeFromKey(key: string): string {
    const extension = path.extname(key).toLowerCase();

    switch (extension) {
      case ".jpg":
      case ".jpeg":
        return "image/jpeg";
      case ".png":
        return "image/png";
      case ".gif":
        return "image/gif";
      case ".webp":
        return "image/webp";
      case ".pdf":
        return "application/pdf";
      case ".json":
        return "application/json";
      case ".txt":
        return "text/plain";
      case ".html":
        return "text/html";
      case ".css":
        return "text/css";
      case ".js":
        return "application/javascript";
      default:
        return "application/octet-stream";
    }
  }
}
