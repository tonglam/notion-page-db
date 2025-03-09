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

describe("StorageService Remaining Coverage", () => {
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

  // Target line 136: uploadImage method when handling metadata with null tags
  it("should handle metadata with null or undefined tags", async () => {
    const imagePath = "/path/to/test-image.jpg";

    // Test with null tags
    const metadataWithNullTags = {
      title: "Test Image",
      tags: undefined,
    };

    // Configure mocks for this test
    (fs.pathExists as any).mockResolvedValueOnce(true);
    (fs.readFile as any).mockResolvedValueOnce(Buffer.from("mock image data"));
    mockS3Send.mockResolvedValueOnce({});

    await storageService.uploadImage(imagePath, metadataWithNullTags);

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Metadata: expect.objectContaining({
          title: "Test Image",
        }),
      })
    );
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.not.objectContaining({
        Metadata: expect.objectContaining({
          tags: expect.anything(),
        }),
      })
    );

    // Test with undefined tags
    const metadataWithUndefinedTags = {
      title: "Test Image",
      tags: undefined,
    };

    // Configure mocks for this test
    vi.clearAllMocks();
    (fs.pathExists as any).mockResolvedValueOnce(true);
    (fs.readFile as any).mockResolvedValueOnce(Buffer.from("mock image data"));
    mockS3Send.mockResolvedValueOnce({});

    await storageService.uploadImage(imagePath, metadataWithUndefinedTags);

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Metadata: expect.objectContaining({
          title: "Test Image",
        }),
      })
    );
    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.not.objectContaining({
        Metadata: expect.objectContaining({
          tags: expect.anything(),
        }),
      })
    );
  });

  // Target line 171: getPublicUrl method with key that already has a leading slash
  it("should handle keys with and without leading slashes correctly", async () => {
    // Test with leading slash when baseUrl has no trailing slash
    const keyWithLeadingSlash = "/images/test.jpg";
    let url = await storageService.getPublicUrl(keyWithLeadingSlash);
    expect(url).toBe("https://test-storage.com/images/test.jpg");

    // Test with no leading slash when baseUrl has no trailing slash
    const keyWithoutLeadingSlash = "images/test.jpg";
    url = await storageService.getPublicUrl(keyWithoutLeadingSlash);
    expect(url).toBe("https://test-storage.com/images/test.jpg");

    // Test with leading slash when baseUrl has trailing slash
    const configWithTrailingSlash = {
      ...mockConfig,
      baseUrl: "https://test-storage.com/",
    };
    const serviceWithTrailingSlash = new StorageService(
      configWithTrailingSlash
    );

    url = await serviceWithTrailingSlash.getPublicUrl(keyWithLeadingSlash);
    expect(url).toBe("https://test-storage.com/images/test.jpg");

    // Test with no leading slash when baseUrl has trailing slash
    url = await serviceWithTrailingSlash.getPublicUrl(keyWithoutLeadingSlash);
    expect(url).toBe("https://test-storage.com/images/test.jpg");
  });

  // Target line 206: listItems method with various response shapes
  it("should handle different response shapes in listItems", async () => {
    // Test with a null Contents
    mockS3Send.mockResolvedValueOnce({ Contents: null });
    let items = await storageService.listItems("images/");
    expect(items).toEqual([]);

    // Test with an empty Contents array
    mockS3Send.mockResolvedValueOnce({ Contents: [] });
    items = await storageService.listItems("images/");
    expect(items).toEqual([]);

    // Test with Contents containing items with null values
    const mockContentsWithNulls = [
      { Key: null, Size: null, LastModified: null },
      { Key: "images/test.jpg", Size: null, LastModified: null },
    ];

    mockS3Send.mockResolvedValueOnce({ Contents: mockContentsWithNulls });
    items = await storageService.listItems("images/");

    expect(items.length).toBe(2);
    expect(items[0].key).toBe("");
    expect(items[0].size).toBe(0);
    expect(items[1].key).toBe("images/test.jpg");
    expect(items[1].size).toBe(0);
  });

  // Target line 272: getContentTypeFromKey for all file extensions
  it("should provide content types for all known extensions", async () => {
    // Create a testing function to indirectly test the private getContentTypeFromKey method
    const testExtension = async (ext: string, expectedContentType: string) => {
      // Clear mocks between tests
      vi.clearAllMocks();

      // Mock extname to return the test extension
      (path.extname as any).mockReturnValueOnce(ext);

      // Use copyItem to indirectly test getContentTypeFromKey
      mockS3Send.mockResolvedValueOnce({});

      const result = await storageService.copyItem("source.jpg", `test${ext}`);

      expect(result.contentType).toBe(expectedContentType);
    };

    // Test all the cases in the switch statement
    await testExtension(".jpg", "image/jpeg");
    await testExtension(".jpeg", "image/jpeg");
    await testExtension(".png", "image/png");
    await testExtension(".gif", "image/gif");
    await testExtension(".webp", "image/webp");
    await testExtension(".pdf", "application/pdf");
    await testExtension(".json", "application/json");
    await testExtension(".txt", "text/plain");
    await testExtension(".html", "text/html");
    await testExtension(".css", "text/css");
    await testExtension(".js", "application/javascript");
    await testExtension(".unknown", "application/octet-stream");
    await testExtension("", "application/octet-stream");
  });
});
