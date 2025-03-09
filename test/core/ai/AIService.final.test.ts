import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../../src/core/ai/AIService";
import { AIConfig } from "../../../src/types";

// Mock external modules
vi.mock("axios");

describe("AIService Final Coverage", () => {
  let aiService: AIService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();

    // Clear environment variables that might affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;

    // Mock axios responses for default case
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
  });

  afterEach(() => {
    // Restore environment
    process.env = { ...originalEnv };
  });

  describe("Constructor and initialization", () => {
    it("should initialize with default values when config is missing", () => {
      // Create service with empty config
      aiService = new AIService({} as AIConfig);

      // Access private properties for testing
      expect((aiService as any).openaiApiKey).toBeUndefined();
      expect((aiService as any).dashscopeApiKey).toBe(""); // The implementation sets it to empty string, not undefined
      expect((aiService as any).modelName).toBe("gpt-3.5-turbo");
    });

    it("should initialize with environment variables when config is missing", () => {
      // Set environment variables
      process.env.DASHSCOPE_API_KEY = "env-dashscope-key";

      // Create service with empty config but with openaiApiKey
      aiService = new AIService({ apiKey: "env-openai-key" } as AIConfig);

      // Access private properties for testing
      expect((aiService as any).openaiApiKey).toBe("env-openai-key");
      expect((aiService as any).dashscopeApiKey).toBe("env-dashscope-key");
    });

    it("should use config values over environment variables", () => {
      // Set environment variables
      process.env.OPENAI_API_KEY = "env-openai-key";
      process.env.DASHSCOPE_API_KEY = "env-dashscope-key";

      // Create service with config values
      const config: AIConfig = {
        apiKey: "config-openai-key",
        provider: "openai",
        modelId: "gpt-4",
      };

      // The modelName is set from config.model, not config.modelId
      config.model = "gpt-4";

      aiService = new AIService(config);

      // Access private properties for testing
      expect((aiService as any).openaiApiKey).toBe("config-openai-key");
      expect((aiService as any).modelName).toBe("gpt-4");
    });
  });

  describe("generateImage", () => {
    it("should handle missing DASHSCOPE_API_KEY", async () => {
      // Ensure DASHSCOPE_API_KEY is not set
      delete process.env.DASHSCOPE_API_KEY;

      // Create service with empty config
      aiService = new AIService({} as AIConfig);

      const result = await aiService.generateImage("test prompt");

      expect(result.success).toBe(false);
      expect(result.error).toContain("DASHSCOPE_API_KEY is not set");
    });

    it("should clean and enhance the prompt", async () => {
      // Set environment variables
      process.env.DASHSCOPE_API_KEY = "mock-dashscope-key";

      // Create service
      aiService = new AIService({} as AIConfig);

      // Mock successful response
      vi.mocked(axios.post).mockResolvedValueOnce({
        data: {
          output: {
            task_id: "mock-task-id",
          },
        },
      });

      // Mock the getDashScopeImageResult method to return a URL
      (aiService as any).getDashScopeImageResult = vi
        .fn()
        .mockResolvedValueOnce("https://example.com/image.jpg");

      // Call with a prompt that has quotes
      await aiService.generateImage('test "quoted" prompt');

      // Check that quotes were removed in the API call
      const postCall = vi.mocked(axios.post).mock.calls[0];
      const requestBody = postCall[1] as {
        input: {
          prompt: string;
          negative_prompt: string;
        };
      };

      // Verify the prompt was cleaned (quotes removed)
      expect(requestBody.input.prompt).not.toContain('"quoted"');
      expect(requestBody.input.prompt).toContain("test quoted prompt");

      // Verify negative prompt is included
      expect(requestBody.input.negative_prompt).toBeDefined();
      expect(requestBody.input.negative_prompt.length).toBeGreaterThan(0);
    });
  });
});
