import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";
import { beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { IAIService } from "../../../src/core/ai/AIService.interface";
import { IStorageService } from "../../../src/core/storage/StorageService.interface";
import { ContentPage, StorageResult } from "../../../src/types";
import { ImageProcessor } from "../../../src/workflow/images/ImageProcessor";

// Mock fs-extra, path, os, and axios
vi.mock("fs-extra", () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  createWriteStream: vi.fn(),
  remove: vi.fn().mockResolvedValue(undefined),
  emptyDir: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("path", () => ({
  join: vi.fn(),
  basename: vi.fn().mockImplementation((path) => {
    const parts = path.split("/");
    return parts[parts.length - 1];
  }),
}));

vi.mock("os", () => ({
  tmpdir: vi.fn().mockReturnValue("/tmp"),
}));

vi.mock("axios");

describe("ImageProcessor", () => {
  let imageProcessor: ImageProcessor;
  let aiService: IAIService;
  let storageService: IStorageService;
  const tempDir = "/tmp/notion-page-db-images";

  // Test data
  const contentPage: ContentPage = {
    id: "test-page-id",
    title: "Test Page",
    parentId: "parent-id",
    category: "Test Category",
    content: "This is test content",
    summary: "This is a test summary",
    excerpt: "This is a test excerpt",
    tags: ["test", "image"],
    minsRead: 5,
    createdTime: "2023-01-01T00:00:00Z",
    lastEditedTime: "2023-01-02T00:00:00Z",
  };

  const contentPageWithImage: ContentPage = {
    ...contentPage,
    imageUrl: "https://example.com/image.jpg",
  };

  const contentPageWithStorageImage: ContentPage = {
    ...contentPage,
    imageUrl: "https://storage.amazonaws.com/bucket/image.jpg",
  };

  const mockStorageResult: StorageResult = {
    key: "images/test-image.jpg",
    url: "https://storage.amazonaws.com/bucket/test-image.jpg",
    contentType: "image/jpeg",
    size: 12345,
    success: true,
  };

  const mockFailedStorageResult: StorageResult = {
    key: "",
    url: "",
    success: false,
    error: "Storage upload failed",
  };

  const mockImageResult = {
    success: true,
    url: "https://ai-service.com/generated-image.png",
    localPath: "/tmp/generated-image.png",
  };

  const mockFailedImageResult = {
    success: false,
    error: "Image generation failed",
  };

  // Mock stream for axios response
  const mockStream = {
    pipe: vi.fn(),
  };

  // Mock writer for fs.createWriteStream
  const mockWriter = {
    on: vi.fn().mockImplementation((event, callback) => {
      if (event === "finish") {
        setTimeout(callback, 0); // Call the callback asynchronously
      }
      return mockWriter;
    }),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock path.join to return predictable paths
    (path.join as Mock).mockImplementation((...args) => {
      if (args[0] === "/tmp" && args[1] === "notion-page-db-images") {
        return tempDir;
      }
      if (args[0] === tempDir) {
        return `${tempDir}/${args.slice(1).join("/")}`;
      }
      return args.join("/");
    });

    // Mock AIService
    aiService = {
      generateSummary: vi.fn(),
      generateTitle: vi.fn(),
      generateKeywords: vi.fn(),
      generateImage: vi.fn().mockResolvedValue(mockImageResult),
      validateContent: vi.fn(),
    };

    // Mock StorageService
    storageService = {
      uploadImage: vi.fn().mockResolvedValue(mockStorageResult),
      getPublicUrl: vi
        .fn()
        .mockResolvedValue(
          "https://storage.amazonaws.com/bucket/test-image.jpg"
        ),
      listItems: vi.fn().mockResolvedValue([]),
      deleteItem: vi.fn().mockResolvedValue(true),
      copyItem: vi.fn().mockResolvedValue(mockStorageResult),
    };

    // Create ImageProcessor instance
    imageProcessor = new ImageProcessor(aiService, storageService);

    // Mock console methods to reduce test output noise
    console.log = vi.fn();
    console.error = vi.fn();

    // Mock axios response
    (axios as any).mockResolvedValue({
      data: mockStream,
    });

    // Mock fs.createWriteStream
    (fs.createWriteStream as any).mockReturnValue(mockWriter);
  });

  describe("initialize", () => {
    it("should create the temp directory", async () => {
      // Execute
      await imageProcessor.initialize();

      // Verify
      expect(fs.ensureDir).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it("should handle errors during initialization", async () => {
      // Setup
      const testError = new Error("Directory creation failed");
      (fs.ensureDir as any).mockRejectedValue(testError);

      // Execute & Verify
      await expect(imageProcessor.initialize()).rejects.toThrow(testError);
    });
  });

  describe("processImages", () => {
    beforeEach(async () => {
      // Initialize the processor
      await imageProcessor.initialize();
    });

    it("should return existing storage URL if image is already in storage", async () => {
      // Execute
      const result = await imageProcessor.processImages(
        contentPageWithStorageImage
      );

      // Verify
      expect(result).toEqual({
        success: true,
        imageUrl: contentPageWithStorageImage.imageUrl,
        storageUrl: contentPageWithStorageImage.imageUrl,
        isNew: false,
      });
      expect(storageService.uploadImage).not.toHaveBeenCalled();
    });

    it("should download and store an existing image", async () => {
      // Setup - make sure the promise resolves
      mockWriter.on.mockImplementation((event, callback) => {
        if (event === "finish") {
          callback(); // Call synchronously for testing
        }
        return mockWriter;
      });

      // Execute
      const result = await imageProcessor.processImages(contentPageWithImage);

      // Verify
      expect(axios).toHaveBeenCalledWith({
        url: contentPageWithImage.imageUrl,
        method: "GET",
        responseType: "stream",
      });
      expect(fs.createWriteStream).toHaveBeenCalled();
      expect(mockStream.pipe).toHaveBeenCalledWith(mockWriter);
      expect(storageService.uploadImage).toHaveBeenCalled();
      expect(fs.remove).toHaveBeenCalled();
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe(contentPageWithImage.imageUrl);
      expect(result.storageUrl).toBe(mockStorageResult.url);
    });

    it("should generate and store a new image if no image URL exists", async () => {
      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(aiService.generateImage).toHaveBeenCalled();
      // Check that the first argument contains the title
      expect((aiService.generateImage as Mock).mock.calls[0][0]).toContain(
        contentPage.title
      );
      // Check that the second argument has the expected properties
      expect((aiService.generateImage as Mock).mock.calls[0][1]).toMatchObject({
        size: "1024x1024",
        style: "vivid",
        quality: "standard",
      });

      expect(storageService.uploadImage).toHaveBeenCalledWith(
        mockImageResult.localPath,
        expect.objectContaining({
          title: contentPage.title,
          description: contentPage.summary,
        })
      );
      expect(fs.remove).toHaveBeenCalledWith(mockImageResult.localPath);
      expect(result.success).toBe(true);
      expect(result.imageUrl).toBe(mockImageResult.url);
      expect(result.storageUrl).toBe(mockStorageResult.url);
      expect(result.isGenerated).toBe(true);
    });

    it("should not generate an image if generateIfMissing is false", async () => {
      // Execute
      const result = await imageProcessor.processImages(contentPage, false);

      // Verify
      expect(aiService.generateImage).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: "No image URL and generation not requested",
      });
    });

    it("should handle errors during image download", async () => {
      // Setup
      const testError = new Error("Download failed");
      (axios as any).mockRejectedValue(testError);

      // Execute
      const result = await imageProcessor.processImages(contentPageWithImage);

      // Verify
      expect(result).toEqual({
        success: false,
        error: "Download failed",
      });
      expect(console.error).toHaveBeenCalled();
    });

    it("should handle errors during image upload", async () => {
      // Setup
      mockWriter.on.mockImplementation((event, callback) => {
        if (event === "finish") {
          callback(); // Call synchronously for testing
        }
        return mockWriter;
      });

      storageService.uploadImage = vi
        .fn()
        .mockResolvedValue(mockFailedStorageResult);

      // Execute
      const result = await imageProcessor.processImages(contentPageWithImage);

      // Verify
      expect(result).toEqual({
        success: false,
        error: "Storage upload failed",
      });
    });

    it("should handle errors during image generation", async () => {
      // Setup
      aiService.generateImage = vi
        .fn()
        .mockResolvedValue(mockFailedImageResult);

      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(result).toEqual({
        success: false,
        error: "Image generation failed",
      });
    });
  });

  describe("processAllImages", () => {
    beforeEach(async () => {
      // Initialize the processor
      await imageProcessor.initialize();
    });

    it("should process images for all content pages", async () => {
      // Setup
      const pages = [
        contentPage,
        contentPageWithImage,
        contentPageWithStorageImage,
      ];

      // Mock processImages to return immediately
      vi.spyOn(imageProcessor, "processImages")
        .mockResolvedValueOnce({
          success: true,
          imageUrl: "https://ai-service.com/generated-image.png",
          storageUrl: mockStorageResult.url,
          isNew: true,
          isGenerated: true,
        })
        .mockResolvedValueOnce({
          success: true,
          imageUrl: contentPageWithImage.imageUrl,
          storageUrl: mockStorageResult.url,
          isNew: true,
        })
        .mockResolvedValueOnce({
          success: true,
          imageUrl: contentPageWithStorageImage.imageUrl,
          storageUrl: contentPageWithStorageImage.imageUrl,
          isNew: false,
        });

      // Execute
      const results = await imageProcessor.processAllImages(pages);

      // Verify
      expect(imageProcessor.processImages).toHaveBeenCalledTimes(3);
      expect(results.length).toBe(3);
      expect(pages[0].imageUrl).toBe(mockStorageResult.url); // Should update the page with the new URL
    });

    it("should continue processing if one page fails", async () => {
      // Setup
      const pages = [contentPage, contentPageWithImage];
      vi.spyOn(imageProcessor, "processImages")
        .mockResolvedValueOnce({
          success: false,
          error: "Processing failed",
        })
        .mockResolvedValueOnce({
          success: true,
          imageUrl: "https://example.com/image.jpg",
          storageUrl: mockStorageResult.url,
          isNew: true,
        });

      // Execute
      const results = await imageProcessor.processAllImages(pages);

      // Verify
      expect(results).toEqual([
        {
          success: false,
          error: "Processing failed",
        },
        {
          success: true,
          imageUrl: "https://example.com/image.jpg",
          storageUrl: mockStorageResult.url,
          isNew: true,
        },
      ]);
      expect(pages[1].imageUrl).toBe(mockStorageResult.url); // Should update the page with the new URL
    });
  });

  describe("cleanup", () => {
    it("should empty the temp directory", async () => {
      // Execute
      await imageProcessor.cleanup();

      // Verify
      expect(fs.emptyDir).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalled();
    });

    it("should handle errors during cleanup", async () => {
      // Setup
      const testError = new Error("Cleanup failed");
      (fs.emptyDir as any).mockRejectedValue(testError);

      // Execute
      await imageProcessor.cleanup();

      // Verify
      expect(console.error).toHaveBeenCalled();
    });
  });
});
