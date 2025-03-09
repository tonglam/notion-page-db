import {
  CopyObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs-extra";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageService } from "../../../src/core/storage/StorageService";
import { ImageMetadata, StorageConfig } from "../../../src/types";

// Mock external modules
vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn((input) => ({
    input,
  })),
  GetObjectCommand: vi.fn(),
  ListObjectsV2Command: vi.fn(),
  DeleteObjectCommand: vi.fn(),
  CopyObjectCommand: vi.fn(),
}));

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn(),
}));

vi.mock("fs-extra", () => ({
  pathExists: vi.fn(),
  readFile: vi.fn(),
}));

// Mock path
vi.mock("path", () => ({
  basename: vi.fn().mockImplementation((path) => path.split("/").pop() || ""),
  extname: vi.fn().mockImplementation(() => ".jpg"),
  join: vi.fn().mockImplementation((...args) => args.join("/")),
}));

describe("StorageService", () => {
  let storageService: StorageService;
  let mockS3Send: ReturnType<typeof vi.fn>;
  const mockConfig: StorageConfig = {
    provider: "r2",
    bucketName: "test-bucket",
    accessKeyId: "test-access-key",
    secretAccessKey: "test-secret-key",
    accountId: "test-account-id",
    region: "auto",
    baseUrl: "https://test-bucket.example.com",
  };

  beforeEach(() => {
    vi.resetAllMocks();

    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();

    // Mock fs methods
    (fs.pathExists as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      true
    );
    (fs.readFile as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      Buffer.from("test-image-data")
    );

    // Mock path methods
    (path.extname as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      ".jpg"
    );
    (path.basename as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "test-image.jpg"
    );

    // Mock S3Client send method
    mockS3Send = vi.fn().mockResolvedValue({});
    (S3Client as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        send: mockS3Send,
      })
    );

    // Create storage service instance
    storageService = new StorageService(mockConfig);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with R2 configuration", () => {
      const service = new StorageService(mockConfig);
      expect(service).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: "auto",
          endpoint: "https://test-account-id.r2.cloudflarestorage.com",
          credentials: {
            accessKeyId: "test-access-key",
            secretAccessKey: "test-secret-key",
          },
        })
      );
    });

    it("should initialize without R2-specific configuration", () => {
      const config = { ...mockConfig };
      delete config.accountId;
      const service = new StorageService(config);
      expect(service).toBeDefined();
      expect(S3Client).toHaveBeenCalledWith(
        expect.not.objectContaining({
          endpoint: expect.any(String),
        })
      );
    });

    it("should throw error when required config is missing", () => {
      const invalidConfig = {
        provider: "r2" as const,
        bucketName: "test-bucket",
        // Missing accessKeyId and secretAccessKey
      } as StorageConfig;

      expect(() => new StorageService(invalidConfig)).toThrow();
    });
  });

  describe("uploadImage", () => {
    it("should successfully upload an image", async () => {
      const metadata: ImageMetadata = {
        title: "Test Image",
        description: "A test image",
        alt: "Test alt text",
        tags: ["test", "image"],
      };

      const result = await storageService.uploadImage("test.jpg", metadata);

      expect(result.success).toBe(true);
      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          Key: expect.stringContaining("test-image.jpg"),
          ContentType: "image/jpeg",
          Metadata: {
            title: "Test Image",
            description: "A test image",
            alt: "Test alt text",
            tags: "test,image",
          },
        })
      );
    });

    it("should handle missing file", async () => {
      (
        fs.pathExists as unknown as ReturnType<typeof vi.fn>
      ).mockImplementationOnce(async () => false);

      const result = await storageService.uploadImage("missing.jpg");

      expect(result.success).toBe(false);
      expect(result.error).toBe("File not found: missing.jpg");
    });

    it("should handle upload errors", async () => {
      const mockError = new Error("Upload failed");
      mockS3Send.mockRejectedValueOnce(mockError);

      const result = await storageService.uploadImage("test.jpg");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload failed");
    });

    it("should handle different image types", async () => {
      const extensions = [
        { ext: ".jpg", type: "image/jpeg" },
        { ext: ".jpeg", type: "image/jpeg" },
        { ext: ".png", type: "image/png" },
        { ext: ".gif", type: "image/gif" },
        { ext: ".webp", type: "image/webp" },
        { ext: ".unknown", type: "application/octet-stream" },
      ];

      for (const { ext, type } of extensions) {
        (
          path.extname as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValueOnce(ext);
        await storageService.uploadImage(`test${ext}`);

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: type,
          })
        );
      }
    });

    it("should handle invalid content type", async () => {
      vi.mocked(fs.pathExists).mockImplementation(async () => true);
      vi.mocked(fs.readFile).mockImplementation(async () =>
        Buffer.from("test-image-data")
      );
      vi.mocked(path.extname).mockReturnValue(".invalid");

      const metadata: ImageMetadata = {
        title: "Test Image",
        description: "Test Description",
        alt: "Test Alt",
      };

      const result = await storageService.uploadImage("test.invalid", metadata);
      expect(result.contentType).toBe("application/octet-stream");
    });

    it("should handle metadata with tags", async () => {
      vi.mocked(fs.pathExists).mockImplementation(async () => true);
      vi.mocked(fs.readFile).mockImplementation(async () =>
        Buffer.from("test-image-data")
      );
      vi.mocked(path.extname).mockReturnValue(".jpg");

      const metadata: ImageMetadata = {
        title: "Test Image",
        description: "Test Description",
        alt: "Test Alt",
        tags: ["tag1", "tag2"],
      };

      const result = await storageService.uploadImage("test.jpg", metadata);
      expect(result.success).toBe(true);

      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Metadata: {
              title: "Test Image",
              description: "Test Description",
              alt: "Test Alt",
              tags: "tag1,tag2",
            },
          }),
        })
      );
    });

    it("should handle metadata with author and sourceUrl", async () => {
      vi.mocked(fs.pathExists).mockImplementation(async () => true);
      vi.mocked(fs.readFile).mockImplementation(async () =>
        Buffer.from("test-image-data")
      );
      vi.mocked(path.extname).mockReturnValue(".jpg");

      const metadata: ImageMetadata = {
        title: "Test Image",
        description: "Test Description",
        alt: "Test Alt",
        author: "Test Author",
        sourceUrl: "https://example.com",
      };

      const result = await storageService.uploadImage("test.jpg", metadata);
      expect(result.success).toBe(true);
      expect(mockS3Send).toHaveBeenCalledWith(
        expect.objectContaining({
          input: expect.objectContaining({
            Metadata: {
              title: "Test Image",
              description: "Test Description",
              alt: "Test Alt",
              author: "Test Author",
              sourceUrl: "https://example.com",
            },
          }),
        })
      );
    });
  });

  describe("getPublicUrl", () => {
    it("should generate presigned URL when configured", async () => {
      const config = { ...mockConfig, usePresignedUrls: true };
      const service = new StorageService(config);
      (
        getSignedUrl as unknown as ReturnType<typeof vi.fn>
      ).mockResolvedValueOnce("https://presigned.url");

      const url = await service.getPublicUrl("test-key");

      expect(url).toBe("https://presigned.url");
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.anything(),
        expect.any(Object),
        { expiresIn: 3600 }
      );
    });

    it("should use baseUrl when available", async () => {
      const url = await storageService.getPublicUrl("test-key");

      expect(url).toBe("https://test-bucket.example.com/test-key");
    });

    it("should handle trailing slashes in baseUrl", async () => {
      const config = {
        ...mockConfig,
        baseUrl: "https://test-bucket.example.com/",
      };
      const service = new StorageService(config);

      const url = await service.getPublicUrl("/test-key");

      expect(url).toBe("https://test-bucket.example.com/test-key");
    });

    it("should fallback to R2 URL format", async () => {
      const config = { ...mockConfig, baseUrl: "" };
      const service = new StorageService(config);

      const url = await service.getPublicUrl("test-key");

      expect(url).toBe(
        "https://test-bucket.r2.auto.cloudflarestorage.com/test-key"
      );
    });

    it("should handle URL generation errors", async () => {
      const mockError = new Error("URL generation failed");
      (
        getSignedUrl as unknown as ReturnType<typeof vi.fn>
      ).mockRejectedValueOnce(mockError);

      const config = { ...mockConfig, usePresignedUrls: true };
      const service = new StorageService(config);

      await expect(service.getPublicUrl("test-key")).rejects.toThrow(mockError);
    });

    it("should handle invalid provider configuration", async () => {
      const invalidStorageService = new StorageService({
        provider: "r2" as const,
        bucketName: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      });

      const url = await invalidStorageService.getPublicUrl("test-key");
      expect(url).toContain(
        "test-bucket.r2.auto.cloudflarestorage.com/test-key"
      );
    });

    it("should handle error in getSignedUrl with specific error message", async () => {
      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const mockError = new Error("Failed to generate signed URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);

      await expect(service.getPublicUrl("test-key")).rejects.toBe(mockError);
    });

    it("should handle error in getSignedUrl with console error", async () => {
      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const mockError = new Error("Failed to generate signed URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);
      const consoleSpy = vi.spyOn(console, "error");

      await expect(service.getPublicUrl("test-key")).rejects.toBe(mockError);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generating URL:",
        mockError
      );
    });
  });

  describe("listItems", () => {
    it("should list items in a directory", async () => {
      const mockContents = [
        { Key: "test1.jpg", Size: 1000, LastModified: new Date(), ETag: "123" },
        { Key: "test2.png", Size: 2000, LastModified: new Date(), ETag: "456" },
      ];

      mockS3Send.mockResolvedValueOnce({
        Contents: mockContents,
      });

      const items = await storageService.listItems("test-prefix");

      expect(items).toHaveLength(2);
      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Prefix: "test-prefix",
      });
      expect(items[0]).toMatchObject({
        key: "test1.jpg",
        size: 1000,
        contentType: "image/jpeg",
      });
    });

    it("should handle empty response", async () => {
      mockS3Send.mockResolvedValueOnce({});

      const items = await storageService.listItems("test-prefix");

      expect(items).toEqual([]);
    });

    it("should handle listing errors", async () => {
      const mockError = new Error("Listing failed");
      mockS3Send.mockRejectedValueOnce(mockError);

      const items = await storageService.listItems("test-prefix");

      expect(items).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        "Error listing items:",
        mockError
      );
    });

    it("should handle invalid provider for listing", async () => {
      const invalidStorageService = new StorageService({
        provider: "r2" as const,
        bucketName: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      });

      const result = await invalidStorageService.listItems("test-prefix");
      expect(result).toEqual([]);
    });

    it("should handle error in getPublicUrl during list with specific error", async () => {
      mockS3Send.mockResolvedValueOnce({
        Contents: [
          {
            Key: "test-key",
            Size: 100,
            LastModified: new Date(),
            ETag: "test-etag",
          },
        ],
      });

      const mockError = new Error("Failed to generate URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);

      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const result = await service.listItems("test-prefix");
      expect(result).toEqual([]);
    });

    it("should handle error in S3 send during list", async () => {
      mockS3Send.mockRejectedValueOnce(new Error("Failed to list items"));

      const result = await storageService.listItems("test-prefix");
      expect(result).toEqual([]);
    });

    it("should handle error in S3 send during list with console error", async () => {
      const mockError = new Error("Failed to list items");
      mockS3Send.mockRejectedValueOnce(mockError);
      const consoleSpy = vi.spyOn(console, "error");

      const result = await storageService.listItems("test-prefix");
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error listing items:",
        mockError
      );
    });

    it("should handle error in getPublicUrl during list with console error", async () => {
      mockS3Send.mockResolvedValueOnce({
        Contents: [
          {
            Key: "test-key",
            Size: 100,
            LastModified: new Date(),
            ETag: "test-etag",
          },
        ],
      });

      const mockError = new Error("Failed to generate URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);
      const consoleSpy = vi.spyOn(console, "error");

      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const result = await service.listItems("test-prefix");
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generating URL:",
        mockError
      );
    });
  });

  describe("deleteItem", () => {
    it("should delete an item", async () => {
      mockS3Send.mockResolvedValueOnce({});

      const success = await storageService.deleteItem("test-key");

      expect(success).toBe(true);
      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        Key: "test-key",
      });
    });

    it("should handle deletion errors", async () => {
      const mockError = new Error("Deletion failed");
      mockS3Send.mockRejectedValueOnce(mockError);

      const success = await storageService.deleteItem("test-key");

      expect(success).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        "Error deleting item:",
        mockError
      );
    });

    it("should handle invalid provider for deletion", async () => {
      const invalidStorageService = new StorageService({
        provider: "r2" as const,
        bucketName: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      });

      mockS3Send.mockRejectedValueOnce(new Error("Invalid credentials"));

      const result = await invalidStorageService.deleteItem("test-key");
      expect(result).toBe(false);
    });
  });

  describe("copyItem", () => {
    it("should copy an item", async () => {
      mockS3Send.mockResolvedValueOnce({});

      const result = await storageService.copyItem("source-key", "dest-key");

      expect(result.success).toBe(true);
      expect(CopyObjectCommand).toHaveBeenCalledWith({
        Bucket: "test-bucket",
        CopySource: "test-bucket/source-key",
        Key: "dest-key",
      });
    });

    it("should handle copy errors", async () => {
      const mockError = new Error("Copy failed");
      mockS3Send.mockRejectedValueOnce(mockError);

      const result = await storageService.copyItem("source-key", "dest-key");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Copy failed");
      expect(console.error).toHaveBeenCalledWith(
        "Error copying item:",
        mockError
      );
    });

    it("should handle invalid provider for copying", async () => {
      const invalidStorageService = new StorageService({
        provider: "r2" as const,
        bucketName: "test-bucket",
        accessKeyId: "test-key",
        secretAccessKey: "test-secret",
      });

      mockS3Send.mockRejectedValueOnce(new Error("Invalid credentials"));

      const result = await invalidStorageService.copyItem(
        "source-key",
        "dest-key"
      );
      expect(result.success).toBe(false);
    });

    it("should handle error in getPublicUrl during copy with specific error", async () => {
      mockS3Send.mockResolvedValueOnce({});
      const mockError = new Error("Failed to generate URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);

      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const result = await service.copyItem("source-key", "dest-key");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to generate URL");
    });

    it("should handle error in getPublicUrl during copy with console error", async () => {
      mockS3Send.mockResolvedValueOnce({});
      const mockError = new Error("Failed to generate URL");
      vi.mocked(getSignedUrl).mockRejectedValueOnce(mockError);
      const consoleSpy = vi.spyOn(console, "error");

      const service = new StorageService({
        ...mockConfig,
        usePresignedUrls: true,
      });

      const result = await service.copyItem("source-key", "dest-key");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to generate URL");
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error generating URL:",
        mockError
      );
    });
  });

  describe("getContentTypeFromKey", () => {
    it("should return correct content types for different extensions", () => {
      const extensions = [
        { ext: ".jpg", type: "image/jpeg" },
        { ext: ".jpeg", type: "image/jpeg" },
        { ext: ".png", type: "image/png" },
        { ext: ".gif", type: "image/gif" },
        { ext: ".webp", type: "image/webp" },
        { ext: ".pdf", type: "application/pdf" },
        { ext: ".json", type: "application/json" },
        { ext: ".txt", type: "text/plain" },
        { ext: ".html", type: "text/html" },
        { ext: ".css", type: "text/css" },
        { ext: ".js", type: "application/javascript" },
        { ext: ".unknown", type: "application/octet-stream" },
      ];

      for (const { ext, type } of extensions) {
        (
          path.extname as unknown as ReturnType<typeof vi.fn>
        ).mockReturnValueOnce(ext);
        const contentType = (storageService as any).getContentTypeFromKey(
          `test${ext}`
        );
        expect(contentType).toBe(type);
      }
    });
  });
});
