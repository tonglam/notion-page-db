import axios from "axios";
import * as fs from "fs-extra";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../../src/core/ai/AIService";
import { AIConfig } from "../../../src/types";

// Mock external modules
vi.mock("axios");

vi.mock("fs-extra", () => ({
  ensureDir: vi.fn(),
  createWriteStream: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("path", () => ({
  join: vi.fn((...args) => args.join("/")),
  basename: vi.fn((p) => p.split("/").pop() || ""),
  dirname: vi.fn((p) => p.split("/").slice(0, -1).join("/")),
}));

describe("AIService Edge Cases", () => {
  let aiService: AIService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();

    // Setup mock environment variables
    process.env.DASHSCOPE_API_KEY = "mock-dashscope-key";

    // Reset axios mocks
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: "mock response",
            },
          },
        ],
      },
    });

    vi.mocked(axios.get).mockResolvedValue({});

    // Create service instance
    const mockConfig: AIConfig = {
      apiKey: "mock-openai-key",
      provider: "openai",
      modelId: "gpt-3.5-turbo",
    };

    aiService = new AIService(mockConfig);
  });

  afterEach(() => {
    // Restore environment
    process.env = originalEnv;
  });

  describe("getDashScopeImageResult", () => {
    it("should handle unexpected response format", async () => {
      // Use the TypeScript type system to access the private method
      const getDashScopeImageResult = (
        aiService as any
      ).getDashScopeImageResult.bind(aiService);

      // Mock axios.get to return unexpected response format
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          /* missing output property */
        },
      });

      const result = await getDashScopeImageResult("test-task-id");
      expect(result).toBeNull();
    });

    it("should handle successful response with no results", async () => {
      // Use the TypeScript type system to access the private method
      const getDashScopeImageResult = (
        aiService as any
      ).getDashScopeImageResult.bind(aiService);

      // Mock axios.get to return success but no results
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [], // Empty results array
          },
        },
      });

      const result = await getDashScopeImageResult("test-task-id");
      expect(result).toBeNull();
    });

    it("should handle reaching maximum attempts", async () => {
      // Use the TypeScript type system to access the private method
      const getDashScopeImageResult = (
        aiService as any
      ).getDashScopeImageResult.bind(aiService);

      // Mock the delay method to be immediate
      (aiService as any).delay = vi.fn().mockResolvedValue(undefined);

      // Mock axios.get to return IN_PROGRESS status (not terminal)
      vi.mocked(axios.get).mockResolvedValue({
        data: {
          output: {
            task_status: "IN_PROGRESS",
          },
        },
      });

      const result = await getDashScopeImageResult("test-task-id", 2, 0); // 2 attempts, 0ms interval
      expect(result).toBeNull();
      // Since we have 2 attempts and the delay is called after each attempt except the last one
      expect((aiService as any).delay).toHaveBeenCalledTimes(2);
    });

    it("should handle API error", async () => {
      // Use the TypeScript type system to access the private method
      const getDashScopeImageResult = (
        aiService as any
      ).getDashScopeImageResult.bind(aiService);

      // Mock axios.get to throw an error
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("API error"));

      const result = await getDashScopeImageResult("test-task-id");
      expect(result).toBeNull();
    });
  });

  describe("downloadImage", () => {
    it("should download image successfully", async () => {
      // Use the TypeScript type system to access the private method
      const downloadImage = (aiService as any).downloadImage.bind(aiService);

      // Mock fs.ensureDir to resolve
      vi.mocked(fs.ensureDir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      // Mock axios.get
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from("fake image data"),
        headers: { "content-type": "image/jpeg" },
      });

      const result = downloadImage(
        "https://example.com/image.jpg",
        "/path/to/image.jpg"
      );

      await expect(result).resolves.toBe("/path/to/image.jpg");
      expect(fs.ensureDir).toHaveBeenCalledWith("/path/to");
      expect(axios.get).toHaveBeenCalledWith("https://example.com/image.jpg", {
        responseType: "arraybuffer",
      });
    });

    it("should handle download error", async () => {
      // Use the TypeScript type system to access the private method
      const downloadImage = (aiService as any).downloadImage.bind(aiService);

      // Mock axios.get to reject
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("Download failed"));
      vi.mocked(fs.ensureDir).mockResolvedValueOnce(undefined);

      await expect(
        downloadImage("https://example.com/image.jpg", "/path/to/image.jpg")
      ).rejects.toThrow("Download failed");

      expect(fs.ensureDir).toHaveBeenCalledWith("/path/to");
    });

    it("should handle write stream error", async () => {
      // Use the TypeScript type system to access the private method
      const downloadImage = (aiService as any).downloadImage.bind(aiService);

      // Mock axios.get
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: Buffer.from("fake image data"),
        headers: { "content-type": "image/jpeg" },
      });

      // Mock fs.ensureDir to resolve
      vi.mocked(fs.ensureDir).mockResolvedValueOnce(undefined);

      // Mock fs.writeFile to reject
      vi.mocked(fs.writeFile).mockRejectedValueOnce(new Error("Write error"));

      await expect(
        downloadImage("https://example.com/image.jpg", "/path/to/image.jpg")
      ).rejects.toThrow("Write error");

      expect(fs.ensureDir).toHaveBeenCalledWith("/path/to");
    });
  });

  describe("delay", () => {
    it("should delay execution for specified time", async () => {
      // Use the TypeScript type system to access the private method
      const delay = (aiService as any).delay.bind(aiService);

      // Mock setTimeout
      vi.useFakeTimers();

      const promise = delay(100);

      // Fast-forward time
      vi.advanceTimersByTime(100);

      await promise;

      // Restore real timers
      vi.useRealTimers();
    });
  });
});
