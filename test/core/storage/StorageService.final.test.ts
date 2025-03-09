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
  basename: vi
    .fn()
    .mockImplementation((filePath) => filePath.split("/").pop() || ""),
  extname: vi.fn().mockImplementation((filePath) => ".jpg"),
  join: vi.fn().mockImplementation((...args) => args.join("/")),
}));

// Import dependencies after mocking
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import * as fs from "fs-extra";
import * as path from "path";

describe("StorageService Final Coverage", () => {
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

  // Target line 136: handling non-array tags in metadata
  it("should handle non-array tags in metadata", async () => {
    const imagePath = "/path/to/test-image.jpg";

    // Create a metadata object where tags is not an array but a string
    // @ts-expect-error - intentionally sending invalid type to test runtime behavior
    const metadataWithStringTags = {
      title: "Test Image",
      tags: "tag1,tag2,tag3", // String instead of array
    };

    // Configure mocks for this test
    (fs.pathExists as any).mockResolvedValueOnce(true);
    (fs.readFile as any).mockResolvedValueOnce(Buffer.from("mock image data"));
    mockS3Send.mockResolvedValueOnce({});

    await storageService.uploadImage(imagePath, metadataWithStringTags as any);

    // Check that PutObjectCommand was called without tags in Metadata
    // Since the tags property is not an array, it should be skipped
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Metadata: expect.objectContaining({
          title: "Test Image",
        }),
      })
    );

    // Check that the metadata doesn't contain tags since it wasn't an array
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Metadata: expect.not.objectContaining({
          tags: expect.anything(),
        }),
      })
    );
  });

  // Target line 171: testing the edge case when key is exactly "/"
  it("should handle '/' as a key correctly", async () => {
    // Test with key being just a slash
    const slashKey = "/";
    const url = await storageService.getPublicUrl(slashKey);

    // Should result in baseUrl + "/" becoming baseUrl + "/"
    // But the code should normalize to avoid double slashes
    expect(url).toBe("https://test-storage.com/");
  });

  // Target line 272: additional tests for getContentTypeFromKey method with edge cases
  it("should handle extreme edge cases for content type detection", async () => {
    // Create a testing helper
    const testExtensionWithFile = async (
      filename: string,
      expectedContentType: string
    ) => {
      // Clear mocks between tests
      vi.clearAllMocks();

      // Mock the result of extname to match what would happen with the filename
      (path.extname as any).mockReturnValueOnce(
        filename.includes(".")
          ? filename.substring(filename.lastIndexOf("."))
          : ""
      );

      // Use copyItem to indirectly test getContentTypeFromKey
      mockS3Send.mockResolvedValueOnce({});

      const result = await storageService.copyItem("source.jpg", filename);

      expect(result.contentType).toBe(expectedContentType);
    };

    // Test with some edge cases
    await testExtensionWithFile("noextension", "application/octet-stream");
    await testExtensionWithFile(".startswithext", "application/octet-stream");
    await testExtensionWithFile("multiple.dots.in.name.jpg", "image/jpeg");
    await testExtensionWithFile("UPPERCASE.JPG", "image/jpeg"); // Testing case sensitivity
    await testExtensionWithFile("file.with.JPEG", "image/jpeg"); // Testing uppercase extension
  });
});
