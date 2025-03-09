import { beforeEach, describe, expect, it, vi } from "vitest";
import { IAIService } from "../../../src/core/ai/AIService.interface";
import { INotionContent } from "../../../src/core/notion/NotionContent.interface";
import { Category, ContentPage, ImageResult } from "../../../src/types";
import { ContentProcessor } from "../../../src/workflow/content/ContentProcessor";

describe("ContentProcessor", () => {
  let contentProcessor: ContentProcessor;
  let notionContent: INotionContent;
  let aiService: IAIService;
  const sourcePageId = "test-source-page-id";

  // Sample test data
  const sampleCategories: Category[] = [
    { id: "cat1", name: "Category 1", type: "regular" },
    { id: "cat2", name: "Category 2", type: "regular" },
  ];

  const sampleContentPages: ContentPage[] = [
    {
      id: "page1",
      title: "Test Page 1",
      parentId: sourcePageId,
      category: "Category 1",
      content: "This is the content of test page 1.",
      createdTime: "2023-01-01T00:00:00Z",
      lastEditedTime: "2023-01-02T00:00:00Z",
    },
    {
      id: "page2",
      title: "Untitled Page",
      parentId: sourcePageId,
      category: "Category 2",
      content: "This is the content of test page 2.",
      createdTime: "2023-01-03T00:00:00Z",
      lastEditedTime: "2023-01-04T00:00:00Z",
    },
  ];

  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();

    // Create mocks for dependencies
    notionContent = {
      fetchPageContent: vi.fn(),
      extractCategories: vi.fn().mockResolvedValue(sampleCategories),
      extractValidContent: vi.fn().mockResolvedValue(sampleContentPages),
      generateExcerpt: vi.fn().mockReturnValue("This is an excerpt..."),
      extractTags: vi.fn().mockReturnValue(["tag1", "tag2"]),
      estimateReadingTime: vi.fn().mockReturnValue(3),
    };

    aiService = {
      generateSummary: vi
        .fn()
        .mockResolvedValue("This is a summary of the content."),
      generateTitle: vi.fn().mockResolvedValue("Enhanced Title"),
      generateKeywords: vi.fn().mockResolvedValue(["keyword1", "keyword2"]),
      generateImage: vi.fn().mockResolvedValue({
        success: true,
        url: "https://example.com/image.jpg",
      } as ImageResult),
      validateContent: vi.fn().mockResolvedValue(true),
    };

    // Create ContentProcessor instance
    contentProcessor = new ContentProcessor(
      notionContent,
      aiService,
      sourcePageId
    );
  });

  describe("fetchContent", () => {
    it("should fetch categories and content pages successfully", async () => {
      // Execute
      const result = await contentProcessor.fetchContent();

      // Verify
      expect(notionContent.extractCategories).toHaveBeenCalledWith(
        sourcePageId
      );
      expect(notionContent.extractValidContent).toHaveBeenCalledWith(
        sourcePageId
      );
      expect(result.success).toBe(true);
      expect(result.categories).toEqual(sampleCategories);
      expect(result.contentPages).toEqual(sampleContentPages);
    });

    it("should return error when no categories are found", async () => {
      // Setup
      notionContent.extractCategories = vi.fn().mockResolvedValue([]);

      // Execute
      const result = await contentProcessor.fetchContent();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe("No categories found in the source page");
    });

    it("should return error when no valid content pages are found", async () => {
      // Setup
      notionContent.extractValidContent = vi.fn().mockResolvedValue([]);

      // Execute
      const result = await contentProcessor.fetchContent();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe("No valid content pages found");
      expect(result.categories).toEqual(sampleCategories);
    });

    it("should handle errors during fetch", async () => {
      // Setup
      const testError = new Error("Test error");
      notionContent.extractCategories = vi.fn().mockRejectedValue(testError);

      // Execute
      const result = await contentProcessor.fetchContent();

      // Verify
      expect(result.success).toBe(false);
      expect(result.error).toBe("Test error");
    });
  });

  describe("enhanceContent", () => {
    beforeEach(async () => {
      // First fetch content to populate the internal map
      await contentProcessor.fetchContent();
    });

    it("should enhance content with AI services", async () => {
      // Execute
      const result = await contentProcessor.enhanceContent("page2", false);

      // Verify
      expect(result).not.toBeNull();
      expect(aiService.generateTitle).toHaveBeenCalled();
      expect(aiService.generateSummary).toHaveBeenCalled();
      expect(notionContent.generateExcerpt).toHaveBeenCalled();
      expect(notionContent.extractTags).toHaveBeenCalled();
      expect(notionContent.estimateReadingTime).toHaveBeenCalled();

      // Should not generate an image if enhanceImages is false
      expect(aiService.generateImage).not.toHaveBeenCalled();

      // Verify enhanced properties
      expect(result?.title).toBe("Enhanced Title");
      expect(result?.summary).toBe("This is a summary of the content.");
      expect(result?.excerpt).toBe("This is an excerpt...");
      expect(result?.tags).toEqual(["tag1", "tag2"]);
      expect(result?.minsRead).toBe(3);
    });

    it("should generate an image when enhanceImages is true", async () => {
      // Execute
      const result = await contentProcessor.enhanceContent("page1", true);

      // Verify image generation was called
      expect(aiService.generateImage).toHaveBeenCalled();
      expect(result?.imageUrl).toBe("https://example.com/image.jpg");
    });

    it("should not enhance title if it's already good", async () => {
      // Execute
      const result = await contentProcessor.enhanceContent("page1", false);

      // Verify title generation was not called for a good title
      expect(aiService.generateTitle).not.toHaveBeenCalled();
      expect(result?.title).toBe("Test Page 1");
    });

    it("should return null for non-existent page ID", async () => {
      // Execute
      const result = await contentProcessor.enhanceContent(
        "non-existent-id",
        false
      );

      // Verify
      expect(result).toBeNull();
    });

    it("should handle errors during enhancement", async () => {
      // Setup
      aiService.generateSummary = vi
        .fn()
        .mockRejectedValue(new Error("API error"));
      console.error = vi.fn(); // Mock console.error to suppress output

      // Execute
      const result = await contentProcessor.enhanceContent("page1", false);

      // The method returns a value even when there are errors during enhancement
      // because it catches the error and continues processing
      expect(result).not.toBeNull();
    });
  });

  describe("enhanceAllContent", () => {
    beforeEach(async () => {
      // First fetch content to populate the internal map
      await contentProcessor.fetchContent();

      // Reset call counts after fetch
      vi.clearAllMocks();
    });

    it("should enhance all content pages", async () => {
      // Execute
      const results = await contentProcessor.enhanceAllContent(false);

      // Verify
      expect(results.length).toBe(2);
      // Check that we got back the pages rather than verifying specific method calls
      expect(results[0].id).toBe("page1");
      expect(results[1].id).toBe("page2");
    });

    it("should enhance all content pages with images", async () => {
      // Execute
      const results = await contentProcessor.enhanceAllContent(true);

      // Verify
      expect(results.length).toBe(2);
      // Verify that image generation was called, but don't check exact count
      expect(aiService.generateImage).toHaveBeenCalled();
    });
  });

  describe("getAllContentPages", () => {
    it("should return all content pages", async () => {
      // Setup
      await contentProcessor.fetchContent();

      // Execute
      const pages = contentProcessor.getAllContentPages();

      // Verify
      expect(pages.length).toBe(2);
      expect(pages[0].id).toBe("page1");
      expect(pages[1].id).toBe("page2");
    });

    it("should return empty array if no content has been fetched", () => {
      // Execute
      const pages = contentProcessor.getAllContentPages();

      // Verify
      expect(pages.length).toBe(0);
    });
  });

  describe("getContentPage", () => {
    beforeEach(async () => {
      // First fetch content to populate the internal map
      await contentProcessor.fetchContent();
    });

    it("should return specific content page by ID", () => {
      // Execute
      const page = contentProcessor.getContentPage("page1");

      // Verify
      expect(page).not.toBeNull();
      expect(page?.id).toBe("page1");
      expect(page?.title).toBe("Test Page 1");
    });

    it("should return null for non-existent page ID", () => {
      // Execute
      const page = contentProcessor.getContentPage("non-existent-id");

      // Verify
      expect(page).toBeNull();
    });
  });
});
