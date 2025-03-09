import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageService } from "../../../src/core/storage/StorageService";
import { StorageConfig } from "../../../src/types";

// Mock AWS SDK
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({
      send: vi.fn().mockImplementation(() => Promise.resolve({})),
    })),
    PutObjectCommand: vi.fn().mockImplementation((params) => ({ ...params })),
    GetObjectCommand: vi.fn().mockImplementation((params) => ({ ...params })),
    ListObjectsV2Command: vi
      .fn()
      .mockImplementation((params) => ({ ...params })),
    DeleteObjectCommand: vi
      .fn()
      .mockImplementation((params) => ({ ...params })),
    CopyObjectCommand: vi.fn().mockImplementation((params) => ({ ...params })),
  };
});

// Mock presigner
vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi
    .fn()
    .mockImplementation(() =>
      Promise.resolve("https://presigned-url.com/test.jpg")
    ),
}));

// Mock fs-extra
vi.mock("fs-extra", () => ({
  pathExists: vi.fn().mockImplementation(() => Promise.resolve(true)),
  readFile: vi
    .fn()
    .mockImplementation(() => Promise.resolve(Buffer.from("mock image data"))),
}));

// Mock path
vi.mock("path", () => ({
  basename: vi.fn().mockImplementation((path) => path.split("/").pop() || ""),
  extname: vi.fn().mockImplementation(() => ".jpg"),
  join: vi.fn().mockImplementation((...args) => args.join("/")),
}));

// Import dependencies after mocking
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import * as fs from "fs-extra";
import * as path from "path";

describe("StorageService Edge Cases", () => {
  let storageService: StorageService;
  let mockConfig: StorageConfig;
  let mockS3Send: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock date
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00Z"));

    // Setup mock S3 client send function
    mockS3Send = vi.fn().mockResolvedValue({});
    (S3Client as any).mockImplementation(() => ({
      send: mockS3Send,
    }));

    // Setup mock config
    mockConfig = {
      provider: "r2",
      bucketName: "test-bucket",
      accessKeyId: "test-key",
      secretAccessKey: "test-secret",
      baseUrl: "https://test-storage.com",
      accountId: "test-account",
      region: "auto",
    };

    // Create service instance
    storageService = new StorageService(mockConfig);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("Constructor edge cases", () => {
    it("should handle missing region by using 'auto'", () => {
      const configWithoutRegion = { ...mockConfig };
      delete configWithoutRegion.region;

      new StorageService(configWithoutRegion);

      // Check the client was created with auto region
      expect(S3Client).toHaveBeenCalledWith(
        expect.objectContaining({
          region: "auto",
        })
      );
    });

    it("should handle non-R2 providers by not setting endpoint", () => {
      const s3Config = { ...mockConfig, provider: "s3" };
      new StorageService(s3Config);

      expect(S3Client).toHaveBeenCalledWith(
        expect.not.objectContaining({
          endpoint: expect.any(String),
        })
      );
    });

    it("should handle missing accountId by not setting endpoint for R2", () => {
      const configWithoutAccountId = { ...mockConfig };
      delete configWithoutAccountId.accountId;

      new StorageService(configWithoutAccountId);

      expect(S3Client).toHaveBeenCalledWith(
        expect.not.objectContaining({
          endpoint: expect.any(String),
        })
      );
    });
  });

  describe("uploadImage edge cases", () => {
    it("should handle different image types with correct content types", async () => {
      const imageExtensions = [
        { ext: ".png", contentType: "image/png" },
        { ext: ".gif", contentType: "image/gif" },
        { ext: ".jpeg", contentType: "image/jpeg" },
        { ext: ".webp", contentType: "image/webp" },
        { ext: ".unknown", contentType: "application/octet-stream" },
      ];

      for (const { ext, contentType } of imageExtensions) {
        vi.clearAllMocks();
        const imagePath = `/path/to/image${ext}`;

        // Configure mocks for this test
        (fs.pathExists as any).mockResolvedValueOnce(true);
        (fs.readFile as any).mockResolvedValueOnce(
          Buffer.from("mock image data")
        );
        (path.extname as any).mockReturnValueOnce(ext);
        mockS3Send.mockResolvedValueOnce({});

        const result = await storageService.uploadImage(imagePath);

        expect(PutObjectCommand).toHaveBeenCalledWith(
          expect.objectContaining({
            ContentType: contentType,
          })
        );
        expect(result.contentType).toBe(contentType);
      }
    });

    it("should include all metadata fields when provided", async () => {
      const imagePath = "/path/to/test-image.jpg";
      const metadata = {
        title: "Test Image",
        description: "A test image",
        alt: "Test alt text",
        author: "Test Author",
        sourceUrl: "https://example.com/source",
        tags: ["test", "image", "example"],
      };

      // Configure mocks for this test
      (fs.pathExists as any).mockResolvedValueOnce(true);
      (fs.readFile as any).mockResolvedValueOnce(
        Buffer.from("mock image data")
      );
      mockS3Send.mockResolvedValueOnce({});

      await storageService.uploadImage(imagePath, metadata);

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Metadata: {
            title: "Test Image",
            description: "A test image",
            alt: "Test alt text",
            author: "Test Author",
            sourceUrl: "https://example.com/source",
            tags: "test,image,example",
          },
        })
      );
    });

    it("should handle upload errors gracefully", async () => {
      const imagePath = "/path/to/test-image.jpg";

      // Configure mocks for this test
      (fs.pathExists as any).mockResolvedValueOnce(true);
      (fs.readFile as any).mockResolvedValueOnce(
        Buffer.from("mock image data")
      );
      mockS3Send.mockRejectedValueOnce(new Error("Upload failed"));

      const result = await storageService.uploadImage(imagePath);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Upload failed");
    });
  });

  describe("getPublicUrl edge cases", () => {
    it("should normalize baseUrl with trailing slash", async () => {
      const configWithTrailingSlash = {
        ...mockConfig,
        baseUrl: "https://test-storage.com/",
      };
      const serviceWithTrailingSlash = new StorageService(
        configWithTrailingSlash
      );

      const url =
        await serviceWithTrailingSlash.getPublicUrl("images/test.jpg");

      expect(url).toBe("https://test-storage.com/images/test.jpg");
    });

    it("should normalize key with leading slash", async () => {
      const url = await storageService.getPublicUrl("/images/test.jpg");

      expect(url).toBe("https://test-storage.com/images/test.jpg");
    });

    it("should fallback to R2 URL format when baseUrl is missing", async () => {
      const configWithoutBaseUrl = { ...mockConfig };
      delete configWithoutBaseUrl.baseUrl;

      const serviceWithoutBaseUrl = new StorageService(configWithoutBaseUrl);

      const url = await serviceWithoutBaseUrl.getPublicUrl("images/test.jpg");

      expect(url).toBe(
        "https://test-bucket.r2.auto.cloudflarestorage.com/images/test.jpg"
      );
    });

    it("should handle errors in URL generation", async () => {
      // Mock an error in getSignedUrl
      (getSignedUrl as any).mockRejectedValueOnce(
        new Error("URL generation failed")
      );

      const configWithPresigned = { ...mockConfig, usePresignedUrls: true };
      const serviceWithPresigned = new StorageService(configWithPresigned);

      await expect(
        serviceWithPresigned.getPublicUrl("images/test.jpg")
      ).rejects.toThrow("URL generation failed");
    });
  });

  describe("listItems edge cases", () => {
    it("should return empty array when no contents are returned", async () => {
      // Mock list operation with no contents
      mockS3Send.mockResolvedValueOnce({});

      const items = await storageService.listItems("images/");

      expect(items).toEqual([]);
    });

    it("should handle errors in listing items", async () => {
      // Mock error in list operation
      mockS3Send.mockRejectedValueOnce(new Error("Listing failed"));

      const items = await storageService.listItems("images/");

      expect(items).toEqual([]);
    });

    it("should handle missing Key or Size in response items", async () => {
      const mockContents = [
        { LastModified: new Date() }, // Missing Key and Size
        { Key: "images/image2.png", LastModified: new Date() }, // Missing Size
      ];

      // Mock list operation
      mockS3Send.mockResolvedValueOnce({
        Contents: mockContents,
      });

      const items = await storageService.listItems("images/");

      expect(items.length).toBe(2);
      expect(items[0].key).toBe("");
      expect(items[0].size).toBe(0);
      expect(items[1].key).toBe("images/image2.png");
      expect(items[1].size).toBe(0);
    });
  });

  describe("deleteItem edge cases", () => {
    it("should handle errors in delete operation", async () => {
      // Mock error in delete operation
      mockS3Send.mockRejectedValueOnce(new Error("Delete failed"));

      const result = await storageService.deleteItem("images/test.jpg");

      expect(result).toBe(false);
    });
  });

  describe("copyItem edge cases", () => {
    it("should handle errors in copy operation", async () => {
      // Mock error in copy operation
      mockS3Send.mockRejectedValueOnce(new Error("Copy failed"));

      const result = await storageService.copyItem(
        "images/source.jpg",
        "images/dest.jpg"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Copy failed");
    });
  });

  describe("getContentTypeFromKey edge cases", () => {
    it("should return correct content types for various file extensions", async () => {
      const extensionTests = [
        { file: "test.jpg", contentType: "image/jpeg" },
        { file: "test.jpeg", contentType: "image/jpeg" },
        { file: "test.png", contentType: "image/png" },
        { file: "test.gif", contentType: "image/gif" },
        { file: "test.webp", contentType: "image/webp" },
        { file: "test.pdf", contentType: "application/pdf" },
        { file: "test.json", contentType: "application/json" },
        { file: "test.txt", contentType: "text/plain" },
        { file: "test.html", contentType: "text/html" },
        { file: "test.css", contentType: "text/css" },
        { file: "test.js", contentType: "application/javascript" },
        { file: "test.unknown", contentType: "application/octet-stream" },
      ];

      for (const { file, contentType } of extensionTests) {
        // Mock extname to return the appropriate extension
        (path.extname as any).mockReturnValueOnce(
          file.substring(file.lastIndexOf("."))
        );

        // Create a copy operation to test the content type detection
        // This is a way to test the private getContentTypeFromKey method
        mockS3Send.mockResolvedValueOnce({});

        const result = await storageService.copyItem("source.jpg", file);

        expect(result.contentType).toBe(contentType);
      }
    });
  });
});
