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
  pathExists: vi.fn().mockResolvedValue(true),
}));

vi.mock("path", () => ({
  join: vi.fn(),
  basename: vi.fn().mockReturnValue("image.jpg"),
}));

vi.mock("os", () => ({
  tmpdir: vi.fn().mockReturnValue("/tmp"),
}));

vi.mock("axios");

// Mock the ImageTaskTracker
vi.mock("../../../src/workflow/images/ImageTaskTracker", () => {
  return {
    ImageTaskTracker: vi.fn().mockImplementation(() => {
      return {
        initialize: vi.fn().mockResolvedValue(undefined),
        createOrUpdateTask: vi.fn().mockResolvedValue({
          pageId: "test-page-id",
          pageTitle: "Test Page",
          status: "pending",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attempts: 0,
        }),
        updateTaskWithId: vi.fn().mockResolvedValue(undefined),
        completeTask: vi.fn().mockResolvedValue(undefined),
        failTask: vi.fn().mockResolvedValue(undefined),
        hasCompletedTask: vi.fn().mockResolvedValue(false),
        getStorageUrl: vi.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

describe("ImageProcessor Complete Coverage", () => {
  let imageProcessor: ImageProcessor;
  let aiService: IAIService;
  let storageService: IStorageService;

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

  const mockImageResult = {
    success: true,
    url: "https://ai-service.com/generated-image.png",
    localPath: "/tmp/generated-image.png",
  };

  const mockFailedStorageResult: StorageResult = {
    key: "",
    url: "",
    success: false,
    error: "Storage upload failed",
  };

  beforeEach(() => {
    // Reset all mocks
    vi.resetAllMocks();

    // Mock path.join to return predictable paths
    (path.join as Mock).mockImplementation((...args) => {
      // Special case for the tempDir path
      if (args[0] === "/tmp" && args[1] === "notion-page-db-images") {
        return "/tmp/notion-page-db-images";
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
      uploadImage: vi.fn().mockResolvedValue({
        success: true,
        url: "https://example.com/stored-image.jpg",
      }),
      getPublicUrl: vi
        .fn()
        .mockResolvedValue("https://example.com/public-image.jpg"),
      listItems: vi.fn().mockResolvedValue([]),
      deleteItem: vi.fn().mockResolvedValue(true),
      copyItem: vi.fn().mockResolvedValue({ success: true }),
    };

    // Create ImageProcessor instance
    imageProcessor = new ImageProcessor(aiService, storageService);

    // Mock console methods to reduce test output noise
    console.log = vi.fn();
    console.error = vi.fn();
  });

  describe("Initialization", () => {
    it("should initialize correctly", async () => {
      await imageProcessor.initialize();
      expect(fs.ensureDir).toHaveBeenCalledWith("/notion-page-db-images");
    });

    it("should process all images correctly", async () => {
      const pages = [
        { ...contentPage, id: "page1" },
        { ...contentPage, id: "page2" },
        {
          ...contentPage,
          id: "page3",
          imageUrl: "https://example.com/image.jpg",
        },
      ];

      (imageProcessor.processImages as Mock) = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          imageUrl: "https://ai-service.com/generated-image1.png",
          storageUrl: "https://example.com/stored-image1.jpg",
          isNew: true,
        })
        .mockResolvedValueOnce({
          success: true,
          imageUrl: "https://ai-service.com/generated-image2.png",
          storageUrl: "https://example.com/stored-image2.jpg",
          isNew: true,
        })
        .mockResolvedValueOnce({
          success: true,
          imageUrl: "https://example.com/image.jpg",
          storageUrl: "https://example.com/stored-image3.jpg",
          isNew: false,
        });

      const results = await imageProcessor.processAllImages(pages);

      expect(results.length).toBe(3);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      expect(results[2].success).toBe(true);

      // Check that the content pages were updated with the new image URLs
      expect(pages[0].imageUrl).toBe("https://example.com/stored-image1.jpg");
      expect(pages[1].imageUrl).toBe("https://example.com/stored-image2.jpg");
      expect(pages[2].imageUrl).toBe("https://example.com/stored-image3.jpg");
    });
  });

  describe("Error Handling", () => {
    it("should handle general errors in processImages method", async () => {
      // Setup - create a custom error that will be thrown
      const testError = new Error("Unexpected processing error");

      // Mock isStorageUrl to throw an error
      vi.spyOn(imageProcessor as any, "isStorageUrl").mockImplementation(() => {
        throw testError;
      });

      // Execute with a page that has an image URL
      const result = await imageProcessor.processImages({
        ...contentPage,
        imageUrl: "https://example.com/image.jpg",
      });

      // Verify
      expect(console.error).toHaveBeenCalledWith(
        "Error processing images:",
        testError
      );
      expect(result).toEqual({
        success: false,
        error: "Unexpected processing error",
      });
    });

    it("should handle storage upload failure for generated images", async () => {
      // Setup - mock the AIService and StorageService
      (aiService.generateImage as Mock).mockResolvedValue({
        success: true,
        url: "https://ai-service.com/generated-image.png",
        localPath: "/tmp/generated-image.png",
      });

      (storageService.uploadImage as Mock).mockResolvedValue(
        mockFailedStorageResult
      );

      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(storageService.uploadImage).toHaveBeenCalled();
      expect(fs.remove).toHaveBeenCalled(); // Should still clean up the file
      expect(result).toEqual({
        success: false,
        error: "Storage upload failed",
      });
    });

    it("should handle errors in generateAndStoreImage method", async () => {
      // Setup - mock the AIService to throw an error
      const testError = new Error("Image generation process failed");
      (aiService.generateImage as Mock).mockImplementation(() => {
        throw testError;
      });

      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(console.error).toHaveBeenCalledWith(
        "Error generating and storing image:",
        testError
      );
      expect(result).toEqual({
        success: false,
        error: "Image generation process failed",
      });
    });

    it("should handle non-Error objects in generateAndStoreImage method", async () => {
      // Setup - mock the AIService to throw a non-Error object
      (aiService.generateImage as Mock).mockImplementation(() => {
        throw "String error"; // Not an Error object
      });

      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: "Unknown error",
      });
    });

    it("should handle non-Error objects in processImages method", async () => {
      // Setup - mock isStorageUrl to throw a non-Error object
      vi.spyOn(imageProcessor as any, "isStorageUrl").mockImplementation(() => {
        throw "String error"; // Not an Error object
      });

      // Execute with a page that has an image URL
      const result = await imageProcessor.processImages({
        ...contentPage,
        imageUrl: "https://example.com/image.jpg",
      });

      // Verify
      expect(console.error).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: "Unknown error",
      });
    });

    it("should handle download and store an image when it's generated but not saved locally", async () => {
      // Setup - mock the AIService to return a result without localPath
      (aiService.generateImage as Mock).mockResolvedValue({
        success: true,
        url: "https://ai-service.com/generated-image.png",
        // No localPath property
      });

      // Mock downloadAndStoreImage method
      const downloadSpy = vi
        .spyOn(imageProcessor as any, "downloadAndStoreImage")
        .mockResolvedValue({
          success: true,
          imageUrl: "https://ai-service.com/generated-image.png",
          storageUrl: "https://example.com/stored-image.jpg",
          isNew: true,
        });

      // Execute
      const result = await imageProcessor.processImages(contentPage);

      // Verify
      expect(downloadSpy).toHaveBeenCalledWith(
        "https://ai-service.com/generated-image.png",
        contentPage
      );
      expect(result).toEqual({
        success: true,
        imageUrl: "https://ai-service.com/generated-image.png",
        storageUrl: "https://example.com/stored-image.jpg",
        isNew: true,
      });
    });

    it("should handle errors during image download", async () => {
      // Mock axios to simulate a download error
      const axiosError = new Error("Download failed");
      // Since axios is already mocked at the top, we can just mock its implementation
      (axios as unknown as Mock).mockRejectedValueOnce(axiosError);

      // Mock isStorageUrl to return false so it tries to download
      vi.spyOn(imageProcessor as any, "isStorageUrl").mockReturnValue(false);

      // Execute with a page that has an image URL
      const result = await imageProcessor.processImages(
        {
          ...contentPage,
          imageUrl: "https://example.com/image.jpg",
        },
        false
      );

      // Verify
      expect(console.error).toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Download failed");
    });

    it("should handle errors in file writing during download", async () => {
      // Mock axios to return a stream that will emit an error
      const mockStream = {
        pipe: vi.fn(),
      };
      (axios as unknown as Mock).mockResolvedValueOnce({
        data: mockStream,
      });

      // Mock isStorageUrl to return false so it tries to download
      vi.spyOn(imageProcessor as any, "isStorageUrl").mockReturnValue(false);

      // Mock fs.createWriteStream to return a writer that will emit an error
      const mockWriter = {
        on: vi.fn((event, handler) => {
          if (event === "error") {
            handler(new Error("Write error"));
          }
          return mockWriter;
        }),
      };
      (fs.createWriteStream as Mock).mockReturnValue(mockWriter);

      // Execute with a page that has an image URL
      const result = await imageProcessor.processImages(
        {
          ...contentPage,
          imageUrl: "https://example.com/image.jpg",
        },
        false
      );

      // Verify
      expect(result.success).toBe(false);
    });
  });

  describe("Image URL Handling", () => {
    it("should handle existing storage URLs", async () => {
      // Setup - mock the isStorageUrl method to return true
      vi.spyOn(imageProcessor as any, "isStorageUrl").mockReturnValue(true);

      // Execute with a page that has an image URL
      const result = await imageProcessor.processImages({
        ...contentPage,
        imageUrl: "https://amazonaws.com/stored-image.jpg",
      });

      // Verify
      expect(result).toEqual({
        success: true,
        imageUrl: "https://amazonaws.com/stored-image.jpg",
        storageUrl: "https://amazonaws.com/stored-image.jpg",
        isNew: false,
      });
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

    it("should handle images from different storage providers", async () => {
      // Test both types of storage URLs
      const awsUrl = "https://amazonaws.com/image.jpg";
      const cloudflareUrl = "https://cloudflare.com/image.jpg";
      const nonStorageUrl = "https://example.com/image.jpg";

      const isStorageUrl = (imageProcessor as any).isStorageUrl;

      expect(isStorageUrl(awsUrl)).toBe(true);
      expect(isStorageUrl(cloudflareUrl)).toBe(true);
      expect(isStorageUrl(nonStorageUrl)).toBe(false);
    });
  });

  describe("Cleanup and Error Handling", () => {
    it("should handle errors during cleanup", async () => {
      // Setup - mock fs.emptyDir to throw an error
      const testError = new Error("Cleanup error");
      (fs.emptyDir as Mock).mockRejectedValue(testError);

      // Execute
      await imageProcessor.cleanup();

      // Verify
      expect(console.error).toHaveBeenCalledWith(
        "Error cleaning up temporary files:",
        testError
      );
    });
  });
});
