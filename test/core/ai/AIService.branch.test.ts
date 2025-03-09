import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../../src/core/ai/AIService";
import { AIConfig, SummaryOptions } from "../../../src/types";

// Mock external modules
vi.mock("axios");
vi.mock("fs-extra", () => ({
  createWriteStream: vi.fn(),
  ensureDir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

describe("AIService Branch Coverage", () => {
  let aiService: AIService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();

    // Clear environment variables that might affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;

    // Mock console methods
    console.log = vi.fn();
    console.error = vi.fn();

    // Set up the environment variables
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.DASHSCOPE_API_KEY = "test-dashscope-key";

    // Set up the AIService
    aiService = new AIService({ apiKey: "test-openai-key" } as AIConfig);
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  describe("generateSummary", () => {
    it("should truncate summaries exceeding maxLength (line 95)", async () => {
      // Mock a response that's longer than the maxLength
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content:
                  "This is a very long summary that should be truncated to fit within the maxLength parameter",
              },
            },
          ],
        },
      });

      const options: SummaryOptions = { maxLength: 20 };
      const result = await aiService.generateSummary("test content", options);

      // Check that the summary was truncated and has ellipsis
      expect(result.length).toBe(20);
      expect(result.endsWith("...")).toBe(true);
    });

    it("should provide a fallback summary on error (line 121)", async () => {
      // Mock axios to throw an error
      vi.mocked(axios.post).mockImplementation(() => {
        throw new Error("API error");
      });

      const content =
        "This is test content that will be used as a fallback for the summary";
      const options: SummaryOptions = { maxLength: 30 };
      const result = await aiService.generateSummary(content, options);

      // Check that an error was logged
      expect(console.error).toHaveBeenCalled();

      // Check the fallback summary (should be truncated content)
      expect(result.length).toBe(30);
      expect(result.endsWith("...")).toBe(true);
      expect(result).toBe(content.substring(0, 27) + "...");
    });

    it("should not truncate summaries within maxLength limits", async () => {
      const shortSummary = "This is a short summary that won't be truncated.";
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: shortSummary,
              },
            },
          ],
        },
      });

      const result = await aiService.generateSummary("content", {
        maxLength: 100,
      });
      expect(result).toBe(shortSummary);
      expect(result.length).toBeLessThanOrEqual(100);
      expect(result).not.toContain("...");
    });
  });

  describe("generateTitle", () => {
    it("should remove quotes from title (line 154)", async () => {
      // Mock a response with quotes
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: '"Quoted Title"',
              },
            },
          ],
        },
      });

      const result = await aiService.generateTitle("test content");

      // Check that quotes were removed
      expect(result).toBe("Quoted Title");
    });

    it("should fallback to currentTitle or 'Untitled' on error (line 178)", async () => {
      // Mock axios to throw an error
      vi.mocked(axios.post).mockImplementation(() => {
        throw new Error("API error");
      });

      // Test with currentTitle provided
      let result = await aiService.generateTitle(
        "test content",
        "Current Title"
      );

      // Check that an error was logged
      expect(console.error).toHaveBeenCalled();

      // Check the fallback is the currentTitle
      expect(result).toBe("Current Title");

      // Test with no currentTitle
      result = await aiService.generateTitle("test content");

      // Check the fallback is "Untitled"
      expect(result).toBe("Untitled");
    });

    it("should generate a title when no current title is provided", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: "Generated Title Without Current",
              },
            },
          ],
        },
      });

      const result = await aiService.generateTitle(
        "Sample content",
        undefined,
        70
      );
      expect(result).toBe("Generated Title Without Current");
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining("current title is"),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });

    it("should handle titles without quotes", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: "Title Without Quotes",
              },
            },
          ],
        },
      });

      const result = await aiService.generateTitle(
        "Sample content",
        "Old Title"
      );
      expect(result).toBe("Title Without Quotes");
      // Verify the result doesn't change since it doesn't have quotes
      expect(result).not.toContain('"');
      expect(result).not.toContain("'");
    });
  });

  describe("generateKeywords", () => {
    it("should handle empty response array (line 207)", async () => {
      // Mock a response with empty choices array
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [],
        },
      });

      const result = await aiService.generateKeywords("test content");

      // Should return an empty array
      expect(result).toEqual([]);
    });

    it("should handle response with empty or missing content", async () => {
      // Mock a response with undefined content
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: undefined } }],
        },
      });

      let result = await aiService.generateKeywords("test content");

      // Should return an empty array
      expect(result).toEqual([]);

      // Mock a response with empty content
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: "" } }],
        },
      });

      result = await aiService.generateKeywords("test content");

      // Should return an empty array
      expect(result).toEqual([]);
    });

    it("should not truncate short content", async () => {
      const shortContent =
        "This is a short content that doesn't need truncation.";
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: "short, content, truncation",
              },
            },
          ],
        },
      });

      const result = await aiService.generateKeywords(shortContent);
      expect(result).toEqual(["short", "content", "truncation"]);

      // Verify the API call contained the full content without truncation
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining(shortContent),
            }),
          ]),
        }),
        expect.any(Object)
      );

      // Verify that the content in the API call doesn't contain ellipsis from truncation
      expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.not.stringContaining("..."),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe("getDashScopeImageResult", () => {
    it("should handle maximum retries (line 370)", async () => {
      // Mock axios to return "IN_PROGRESS" status multiple times
      const mockInProgress = {
        data: {
          output: {
            task_status: "IN_PROGRESS",
          },
        },
      };

      // Set up mock responses for all attempts
      vi.mocked(axios.get)
        .mockResolvedValueOnce(mockInProgress)
        .mockResolvedValueOnce(mockInProgress)
        .mockResolvedValueOnce(mockInProgress);

      // Test with a small number of retries and short interval
      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        "Max attempts (3) reached without completion"
      );
    });

    it("should handle unexpected response format", async () => {
      // Mock axios to return invalid response format
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          // Missing output field
        },
      });

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        "Unexpected response format:",
        expect.any(Object)
      );
    });

    it("should handle successful task with missing image URL", async () => {
      // Mock successful task but missing URL
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [], // Empty results array
          },
        },
      });

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        "No image URL in successful response"
      );
    });

    it("should handle task failure with error message", async () => {
      // Mock failed task with error message
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "FAILED",
            error: "Task failed due to invalid input",
          },
        },
      });

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        "Task failed:",
        "Task failed due to invalid input"
      );
    });

    it("should handle network errors during status check", async () => {
      // Mock network error during status check
      vi.mocked(axios.get).mockRejectedValueOnce(new Error("Network error"));

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalledWith(
        "Error checking task status:",
        expect.any(Error)
      );
    });

    it("should handle unexpected task status", async () => {
      // Mock response with unexpected status
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "UNKNOWN_STATUS",
          },
        },
      });

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe(null);
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Current status: UNKNOWN_STATUS")
      );
    });

    it("should handle task status transitions", async () => {
      // Mock status transitions: PENDING -> IN_PROGRESS -> SUCCEEDED
      vi.mocked(axios.get)
        .mockResolvedValueOnce({
          data: {
            output: {
              task_status: "PENDING",
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            output: {
              task_status: "IN_PROGRESS",
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            output: {
              task_status: "SUCCEEDED",
              results: [
                {
                  url: "https://example.com/image.jpg",
                },
              ],
            },
          },
        });

      const result = await (aiService as any).getDashScopeImageResult(
        "test-task-id",
        3,
        100
      );

      expect(result).toBe("https://example.com/image.jpg");
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Current status: PENDING")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Current status: IN_PROGRESS")
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining("Current status: SUCCEEDED")
      );
    });
  });

  describe("downloadImage", () => {
    it("should handle download errors (line 454)", async () => {
      // Mock successful task creation and status check
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "test-task-id",
          },
        },
      });

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [
              {
                url: "https://example.com/image.jpg",
              },
            ],
          },
        },
      });

      // Mock axios.get for the image download to throw an error
      vi.mocked(axios.get).mockImplementation((url, options) => {
        // If this is a request for the task status (no responseType)
        if (!options || !options.responseType) {
          return Promise.resolve({
            data: {
              output: {
                task_status: "SUCCEEDED",
                results: [
                  {
                    url: "https://example.com/image.jpg",
                  },
                ],
              },
            },
          });
        }
        // If this is a request for the image download (with responseType: 'arraybuffer')
        if (options && options.responseType === "arraybuffer") {
          return Promise.reject(new Error("Download failed"));
        }
        return Promise.resolve({});
      });

      // Test through generateImage which uses downloadImage internally
      const result = await aiService.generateImage("test prompt", {
        localPath: "/test/path/image.jpg",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Download failed");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error generating image with DashScope:"),
        expect.any(Error)
      );
    });
  });

  describe("validateContent", () => {
    it("should handle error during validation (line 489)", async () => {
      // Mock axios to throw an error
      vi.mocked(axios.post).mockRejectedValueOnce(new Error("API error"));

      // Call the actual method
      const result = await aiService.validateContent("test content", [
        "rule1",
        "rule2",
      ]);

      // Should return false on error (conservative approach)
      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error validating content:"),
        expect.any(Error)
      );
    });

    it("should handle non-Error objects during validation", async () => {
      // Mock axios to throw a non-Error object
      vi.mocked(axios.post).mockImplementation(() => {
        throw "String error"; // Not an Error object
      });

      const result = await aiService.validateContent("test content", [
        "rule1",
        "rule2",
      ]);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error validating content:"),
        "String error"
      );
    });

    it("should handle validation with custom rules", async () => {
      // Mock successful validation response
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          choices: [
            {
              message: {
                content: "true",
              },
            },
          ],
        },
      });

      const result = await aiService.validateContent("test content", [
        "Must be professional",
        "Must be clear and concise",
      ]);

      expect(result).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining("Must be professional"),
            }),
          ]),
        }),
        expect.any(Object)
      );
    });
  });

  describe("generateImage", () => {
    it("should handle missing DashScope API key", async () => {
      // Remove DashScope API key
      delete process.env.DASHSCOPE_API_KEY;
      aiService = new AIService({ apiKey: "test-openai-key" } as AIConfig);

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        "DASHSCOPE_API_KEY is not set. Cannot generate image."
      );
    });

    it("should handle missing task ID in response", async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            // Missing task_id field
          },
        },
      });

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(false);
      expect(result.error).toBe("No task ID returned from DashScope API");
    });

    it("should handle successful image generation without local path", async () => {
      // Mock successful task creation
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "test-task-id",
          },
        },
      });

      // Mock successful task completion
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [
              {
                url: "https://example.com/image.jpg",
              },
            ],
          },
        },
      });

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://example.com/image.jpg");
      expect(result.localPath).toBeUndefined();
    });

    it("should handle missing OpenAI API key", async () => {
      // Mock console.warn to verify warning message
      const warnSpy = vi.spyOn(console, "warn");

      // Remove OpenAI API key
      delete process.env.OPENAI_API_KEY;
      aiService = new AIService({} as AIConfig);

      expect(warnSpy).toHaveBeenCalledWith(
        "OpenAI API key is not set. Text generation will not work."
      );

      // Restore the spy
      warnSpy.mockRestore();
    });

    it("should handle enhanced prompt generation", async () => {
      // Mock successful responses
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "mock-task-id",
          },
        },
      });

      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [
              {
                url: "https://example.com/image.jpg",
              },
            ],
          },
        },
      });

      const result = await aiService.generateImage("test prompt", {
        width: 512,
        height: 512, // Test custom size
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://example.com/image.jpg");

      // Verify the API call was made with the correct parameters
      expect(axios.post).toHaveBeenCalledWith(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        expect.objectContaining({
          model: "wanx2.1-t2i-turbo",
          parameters: expect.objectContaining({
            n: 1,
          }),
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: expect.stringContaining("Bearer"),
            "Content-Type": "application/json",
          }),
        })
      );
    });

    it("should handle network errors during task creation", async () => {
      // Mock network error during task creation
      vi.mocked(axios.post).mockRejectedValueOnce(new Error("Network error"));

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Network error");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error generating image with DashScope:"),
        expect.any(Error)
      );
    });

    it("should handle failed image URL retrieval", async () => {
      // Mock successful task creation
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "test-task-id",
          },
        },
      });

      // Mock failed image URL retrieval
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [], // Empty results array
          },
        },
      });

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to get image URL from DashScope API");
    });

    it("should handle prompt cleaning and enhancement", async () => {
      // Mock successful task creation
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "test-task-id",
          },
        },
      });

      // Mock successful task completion
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: {
          output: {
            task_status: "SUCCEEDED",
            results: [
              {
                url: "https://example.com/image.jpg",
              },
            ],
          },
        },
      });

      const result = await aiService.generateImage(
        "\"Complex\" 'prompt' with quotes"
      );

      expect(result.success).toBe(true);
      expect(axios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          input: {
            prompt: expect.stringContaining("Complex prompt with quotes"),
            negative_prompt: expect.any(String),
          },
        }),
        expect.any(Object)
      );
    });

    it("should handle complex prompt generation with all components", async () => {
      // Mock successful API response
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "test-task-id",
          },
        },
      });

      vi.mocked(axios.get).mockImplementation((url, options) => {
        // If this is a request for the task status (no responseType)
        if (!options || !options.responseType) {
          return Promise.resolve({
            data: {
              output: {
                task_status: "SUCCEEDED",
                results: [
                  {
                    url: "https://example.com/image.jpg",
                  },
                ],
              },
            },
          });
        }
        // If this is a request for the image download (with responseType: 'arraybuffer')
        if (options && options.responseType === "arraybuffer") {
          return Promise.resolve({
            data: Buffer.from("fake image data"),
            headers: { "content-type": "image/jpeg" },
          });
        }
        return Promise.resolve({});
      });

      // No need to mock fs functions again as they're already mocked at the top of the file

      const result = await aiService.generateImage("test prompt", {
        width: 1024,
        height: 1024,
        localPath: "/test/path/image.jpg",
      });

      expect(result.success).toBe(true);
      expect(result.url).toBe("https://example.com/image.jpg");
      expect(result.localPath).toBe("/test/path/image.jpg");
    });
  });

  describe("delay", () => {
    it("should delay execution for specified time", async () => {
      const startTime = Date.now();
      await (aiService as any).delay(100);
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });

    it("should handle rejected delay promise", async () => {
      // Mock setTimeout to simulate rejection
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = vi.fn((callback) => {
        callback();
        throw new Error("Timeout error");
      }) as any;

      try {
        await (aiService as any).delay(100);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // Restore setTimeout
      global.setTimeout = originalSetTimeout;
    });
  });
});
