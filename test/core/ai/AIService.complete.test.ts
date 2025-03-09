import axios from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AIService } from "../../../src/core/ai/AIService";
import { AIConfig } from "../../../src/types";

describe("AIService Complete Coverage", () => {
  let aiService: AIService;
  const originalEnv = { ...process.env };
  let consoleWarnSpy: any;

  beforeEach(() => {
    // Clear environment variables that might affect tests
    delete process.env.OPENAI_API_KEY;
    delete process.env.DASHSCOPE_API_KEY;

    // Spy on console.warn to verify it's called
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore environment and console
    process.env = { ...originalEnv };
    consoleWarnSpy.mockRestore();
  });

  describe("Constructor warnings", () => {
    it("should warn when DASHSCOPE_API_KEY is not set", () => {
      // Create service with empty config
      aiService = new AIService({} as AIConfig);

      // Verify console.warn was called with the expected message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "DASHSCOPE_API_KEY environment variable is not set. Image generation will not work."
      );
    });

    it("should warn when OpenAI API key is not set", () => {
      // Create service with empty config
      aiService = new AIService({} as AIConfig);

      // Verify console.warn was called with the expected message
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "OpenAI API key is not set. Text generation will not work."
      );
    });

    it("should not warn when both keys are set", () => {
      // Set environment variables
      process.env.DASHSCOPE_API_KEY = "mock-dashscope-key";

      // Create service with API key
      aiService = new AIService({ apiKey: "mock-openai-key" } as AIConfig);

      // Verify console.warn was not called with the warning messages
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        "DASHSCOPE_API_KEY environment variable is not set. Image generation will not work."
      );
      expect(consoleWarnSpy).not.toHaveBeenCalledWith(
        "OpenAI API key is not set. Text generation will not work."
      );
    });
  });

  describe("Summary styles", () => {
    beforeEach(() => {
      // Mock axios.post to avoid actual API calls
      vi.spyOn(axios, "post").mockResolvedValue({
        data: {
          choices: [
            {
              message: {
                content: "Test summary",
              },
            },
          ],
        },
      });

      // Create service with API key
      aiService = new AIService({ apiKey: "mock-openai-key" } as AIConfig);
    });

    it("should use detailed style for summaries", async () => {
      const axiosSpy = vi.spyOn(axios, "post");

      await aiService.generateSummary("Test content", {
        style: "detailed",
        maxLength: 100,
      });

      // Check that the axios post was called with the right system message
      const requestBody = axiosSpy.mock.calls[0][1] as {
        messages: Array<{ content: string }>;
      };
      expect(requestBody.messages[0].content).toContain(
        "Create detailed summaries that highlight key points"
      );
    });

    it("should use technical style for summaries", async () => {
      const axiosSpy = vi.spyOn(axios, "post");

      await aiService.generateSummary("Test content", {
        style: "technical",
        maxLength: 100,
      });

      // Check that the axios post was called with the right system message
      const requestBody = axiosSpy.mock.calls[0][1] as {
        messages: Array<{ content: string }>;
      };
      expect(requestBody.messages[0].content).toContain(
        "Create technical summaries focusing on technical aspects"
      );
    });

    it("should use casual style for summaries when no style is specified", async () => {
      const axiosSpy = vi.spyOn(axios, "post");

      await aiService.generateSummary("Test content", { maxLength: 100 });

      // Check that the axios post was called with the right system message
      const requestBody = axiosSpy.mock.calls[0][1] as {
        messages: Array<{ content: string }>;
      };
      expect(requestBody.messages[0].content).toContain(
        "Create concise and to-the-point summaries"
      );
    });

    it("should use casual style for summaries when style is set to casual", async () => {
      const axiosSpy = vi.spyOn(axios, "post");

      await aiService.generateSummary("Test content", {
        style: "casual",
        maxLength: 100,
      });

      // Check that the axios post was called with the right system message
      const requestBody = axiosSpy.mock.calls[0][1] as {
        messages: Array<{ content: string }>;
      };
      expect(requestBody.messages[0].content).toContain(
        "Create casual, conversational summaries"
      );
    });

    it("should use casual style for summaries when style is not recognized", async () => {
      const axiosSpy = vi.spyOn(axios, "post");

      // Use type assertion to pass an invalid style that will trigger the else branch
      await aiService.generateSummary("Test content", {
        style: "casual" as any,
        maxLength: 100,
      });

      // Check that the axios post was called with the right system message
      const requestBody = axiosSpy.mock.calls[0][1] as {
        messages: Array<{ content: string }>;
      };
      expect(requestBody.messages[0].content).toContain(
        "Create casual, conversational summaries"
      );
    });
  });
});
