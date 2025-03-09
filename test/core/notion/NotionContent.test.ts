import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotionContent } from "../../../src/core/notion/NotionContent";
import { NotionConfig, PageContent } from "../../../src/types";
import { resetMocks } from "../../setup";

// Mock the @notionhq/client
vi.mock("@notionhq/client", () => ({
  Client: vi.fn().mockImplementation(() => ({
    pages: {
      retrieve: vi.fn(),
    },
    blocks: {
      children: {
        list: vi.fn(),
      },
    },
  })),
}));

describe("NotionContent", () => {
  let notionContent: NotionContent;
  let mockClient: any;
  const mockConfig: NotionConfig = {
    apiKey: "test-api-key",
    sourcePageId: "test-source-page-id",
    targetDatabaseId: "test-database-id",
    rateLimitDelay: 0, // Set to 0 for faster tests
  };

  beforeEach(() => {
    resetMocks();

    // Create a mock client
    mockClient = {
      pages: {
        retrieve: vi.fn(),
      },
      blocks: {
        children: {
          list: vi.fn(),
        },
      },
    };

    // Create instance with mock
    notionContent = new NotionContent(mockConfig);

    // Replace the client with our mock
    (notionContent as any).client = mockClient;
  });

  describe("fetchPageContent", () => {
    it("should fetch page content successfully", async () => {
      // Mock page and blocks responses
      const mockPageId = "test-page-id";
      const mockPage = {
        id: mockPageId,
        properties: {
          title: {
            title: [
              {
                plain_text: "Test Page Title",
              },
            ],
          },
        },
        created_time: "2023-01-01T00:00:00Z",
        last_edited_time: "2023-01-02T00:00:00Z",
      };

      const mockBlocks = {
        results: [
          {
            id: "block-1",
            type: "paragraph",
            paragraph: {
              rich_text: [
                {
                  type: "text",
                  text: {
                    content: "This is a test paragraph.",
                  },
                },
              ],
            },
            has_children: false,
          },
        ],
        has_more: false,
      };

      mockClient.pages.retrieve.mockResolvedValue(mockPage);
      mockClient.blocks.children.list.mockResolvedValue(mockBlocks);

      const result = await notionContent.fetchPageContent(mockPageId);

      expect(mockClient.pages.retrieve).toHaveBeenCalledWith({
        page_id: mockPageId,
      });
      expect(mockClient.blocks.children.list).toHaveBeenCalledWith({
        block_id: mockPageId,
      });

      expect(result).toBeDefined();
      expect(result.title).toBe("Test Page Title");
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].type).toBe("paragraph");
      expect(result.createdTime).toBe("2023-01-01T00:00:00Z");
      expect(result.lastEditedTime).toBe("2023-01-02T00:00:00Z");
    });

    it("should return cached content if available", async () => {
      const mockPageId = "test-page-id";
      const cachedContent: PageContent = {
        title: "Cached Page Title",
        blocks: [],
        createdTime: "2023-01-01T00:00:00Z",
        lastEditedTime: "2023-01-02T00:00:00Z",
      };

      // Set up private cache (using any to access private property)
      (notionContent as any).contentCache.set(mockPageId, cachedContent);

      const result = await notionContent.fetchPageContent(mockPageId);

      // Should return cached content without API calls
      expect(mockClient.pages.retrieve).not.toHaveBeenCalled();
      expect(result).toEqual(cachedContent);
    });

    it("should handle pages with missing title property", async () => {
      const mockPageId = "test-page-id";
      const mockPage = {
        id: mockPageId,
        properties: {}, // Missing title property
        created_time: "2023-01-01T00:00:00Z",
        last_edited_time: "2023-01-02T00:00:00Z",
      };

      const mockBlocks = {
        results: [],
        has_more: false,
      };

      mockClient.pages.retrieve.mockResolvedValue(mockPage);
      mockClient.blocks.children.list.mockResolvedValue(mockBlocks);

      const result = await notionContent.fetchPageContent(mockPageId);

      expect(result.title).toBe("Untitled"); // Should default to "Untitled"
      expect(result.blocks).toHaveLength(0);
    });

    it("should handle API errors gracefully", async () => {
      const mockPageId = "test-page-id";
      const error = new Error("API error");

      mockClient.pages.retrieve.mockRejectedValue(error);

      await expect(notionContent.fetchPageContent(mockPageId)).rejects.toThrow(
        "API error"
      );
    });
  });

  describe("extractCategories", () => {
    it("should extract categories from page blocks", async () => {
      const mockPageId = "test-page-id";

      // Mock the fetchBlocks method directly to return transformed blocks
      const mockBlocks = [
        {
          id: "category-1",
          type: "child_page",
          content: { title: "Category 1" },
          hasChildren: true,
        },
        {
          id: "category-2",
          type: "child_page",
          content: { title: "MIT Unit" },
          hasChildren: true,
        },
        {
          id: "not-category",
          type: "paragraph",
          hasChildren: false,
        },
      ];

      // Mock the private fetchBlocks method
      (notionContent as any).fetchBlocks = vi
        .fn()
        .mockResolvedValue(mockBlocks);

      const categories = await notionContent.extractCategories(mockPageId);

      expect(categories).toHaveLength(2);
      expect(categories[0].id).toBe("category-1");
      expect(categories[0].name).toBe("Category 1");
      expect(categories[0].type).toBe("regular");
      expect(categories[1].id).toBe("category-2");
      expect(categories[1].name).toBe("MIT Unit");
      expect(categories[1].type).toBe("mit");
    });

    it("should return cached categories if available", async () => {
      const mockPageId = "test-page-id";
      const cachedCategories = [
        { id: "cached-1", name: "Cached Category", type: "regular" as const },
      ];

      // Set up private cache (using any to access private property)
      (notionContent as any).categoryCache.set(mockPageId, cachedCategories);

      const result = await notionContent.extractCategories(mockPageId);

      // Should return cached content without API calls
      expect(mockClient.blocks.children.list).not.toHaveBeenCalled();
      expect(result).toEqual(cachedCategories);
    });

    it("should return empty array when no categories are found", async () => {
      const mockPageId = "test-page-id";
      const mockBlocks = {
        results: [
          {
            id: "not-category",
            type: "paragraph",
            paragraph: { rich_text: [] },
            has_children: false,
          },
        ],
        has_more: false,
      };

      mockClient.blocks.children.list.mockResolvedValue(mockBlocks);

      const categories = await notionContent.extractCategories(mockPageId);

      expect(categories).toHaveLength(0);
    });
  });

  describe("extractValidContent", () => {
    it("should extract valid content pages from categories", async () => {
      // Mock extractCategories to return predefined categories
      const mockCategories = [
        { id: "category-1", name: "Category 1", type: "regular" as const },
      ];
      vi.spyOn(notionContent, "extractCategories").mockResolvedValue(
        mockCategories
      );

      // Mock blocks for category-1
      const mockCategoryBlocks = {
        results: [
          {
            id: "content-page-1",
            type: "child_page",
            child_page: { title: "Content Page 1" },
            has_children: true,
          },
        ],
        has_more: false,
      };

      // Mock content page details
      const mockContentPage = {
        id: "content-page-1",
        properties: {
          title: {
            title: [{ plain_text: "Content Page 1" }],
          },
        },
        created_time: "2023-01-01T00:00:00Z",
        last_edited_time: "2023-01-02T00:00:00Z",
      };

      const mockContentBlocks = {
        results: [
          {
            id: "block-1",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: "Test content" } }],
            },
            has_children: false,
          },
        ],
        has_more: false,
      };

      mockClient.blocks.children.list.mockImplementation((params) => {
        if (params.block_id === "category-1") {
          return Promise.resolve(mockCategoryBlocks);
        } else if (params.block_id === "content-page-1") {
          return Promise.resolve(mockContentBlocks);
        }
        return Promise.resolve({ results: [], has_more: false });
      });

      mockClient.pages.retrieve.mockResolvedValue(mockContentPage);

      const contentPages =
        await notionContent.extractValidContent("source-page-id");

      expect(contentPages).toHaveLength(1);
      expect(contentPages[0].id).toBe("content-page-1");
      expect(contentPages[0].title).toBe("Content Page 1");
      expect(contentPages[0].parentId).toBe("category-1");
      expect(contentPages[0].category).toBe("Category 1");
      expect(contentPages[0].content).toBeDefined();
    });

    it("should handle MIT unit categories correctly", async () => {
      // Mock extractCategories to return MIT category
      const mockCategories = [
        { id: "mit-category", name: "3100", type: "mit" as const },
      ];
      vi.spyOn(notionContent, "extractCategories").mockResolvedValue(
        mockCategories
      );

      // Mock blocks for mit-category
      const mockCategoryBlocks = {
        results: [
          {
            id: "content-page-1",
            type: "child_page",
            child_page: { title: "MIT Page" },
            has_children: true,
          },
        ],
        has_more: false,
      };

      // Mock content page details
      const mockContentPage = {
        id: "content-page-1",
        properties: {
          title: {
            title: [{ plain_text: "MIT Page" }],
          },
        },
        created_time: "2023-01-01T00:00:00Z",
        last_edited_time: "2023-01-02T00:00:00Z",
      };

      const mockContentBlocks = {
        results: [
          {
            id: "block-1",
            type: "paragraph",
            paragraph: {
              rich_text: [{ type: "text", text: { content: "MIT content" } }],
            },
            has_children: false,
          },
        ],
        has_more: false,
      };

      mockClient.blocks.children.list.mockImplementation((params) => {
        if (params.block_id === "mit-category") {
          return Promise.resolve(mockCategoryBlocks);
        } else if (params.block_id === "content-page-1") {
          return Promise.resolve(mockContentBlocks);
        }
        return Promise.resolve({ results: [], has_more: false });
      });

      mockClient.pages.retrieve.mockResolvedValue(mockContentPage);

      const contentPages =
        await notionContent.extractValidContent("source-page-id");

      expect(contentPages).toHaveLength(1);
      expect(contentPages[0].category).toBe("CITS3100");
    });

    it("should return empty array when no categories are found", async () => {
      vi.spyOn(notionContent, "extractCategories").mockResolvedValue([]);

      const contentPages =
        await notionContent.extractValidContent("source-page-id");

      expect(contentPages).toHaveLength(0);
    });
  });

  describe("generateExcerpt", () => {
    it("should generate an excerpt with default length", () => {
      const content =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.";
      const excerpt = notionContent.generateExcerpt(content);

      expect(excerpt.length).toBeLessThanOrEqual(200);
      expect(excerpt).toContain("Lorem ipsum");
      // The actual implementation might end with a period instead of "..." if it cuts at a sentence
      // We'll check that it's either a valid ending
      const validEnding = excerpt.endsWith(".") || excerpt.endsWith("...");
      expect(validEnding).toBe(true);
    });

    it("should generate an excerpt with custom length", () => {
      const content =
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
      const excerpt = notionContent.generateExcerpt(content, 15);

      expect(excerpt.length).toBeLessThanOrEqual(15);
      expect(excerpt).toContain("Lorem");
      expect(excerpt.endsWith("...")).toBe(true);
    });

    it("should not add ellipsis if content is shorter than max length", () => {
      const content = "Short content";
      const excerpt = notionContent.generateExcerpt(content, 20);

      expect(excerpt).toBe(content);
      expect(excerpt.endsWith("...")).toBe(false);
    });

    it("should handle empty content", () => {
      const excerpt = notionContent.generateExcerpt("");
      expect(excerpt).toBe("");
    });

    it("should cut at sentence break when available", () => {
      const content =
        "This is a sentence. This is another sentence. And a third.";
      const excerpt = notionContent.generateExcerpt(content, 30);

      expect(excerpt).toBe("This is a sentence.");
    });
  });

  describe("extractTags", () => {
    it("should extract tags from content", () => {
      const content =
        "This is some JavaScript content about React and TypeScript development";
      const title = "Web Development Guide";
      const category = "Programming";

      const tags = notionContent.extractTags(content, title, category);

      // Handle case sensitivity by checking for lowercase versions
      const lowerTags = tags.map((tag) => tag.toLowerCase());
      expect(lowerTags).toContain("programming");
      expect(lowerTags).toContain("development");
      expect(lowerTags).toContain("guide");
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    it("should deduplicate tags", () => {
      const content = "Web Development Web Development Web Development";
      const title = "Web Development";

      const tags = notionContent.extractTags(content, title, "");

      // Should only contain "web" and "development" once each
      expect(tags.filter((tag) => tag === "development").length).toBe(1);
    });

    it("should limit to 10 tags", () => {
      // Create content with many potential keywords
      const words = Array.from({ length: 20 }, (_, i) => `keyword${i}`).join(
        " "
      );
      const title = "Test Title with Many Keywords";
      const category = "Test Category";

      const tags = notionContent.extractTags(words, title, category);

      expect(tags.length).toBeLessThanOrEqual(10);
    });
  });

  describe("estimateReadingTime", () => {
    it("should estimate reading time based on word count", () => {
      // Average reading speed is ~200-250 words per minute
      // Test with content containing 300 words (should be ~1-2 minutes)
      const words = Array(300).fill("word").join(" ");
      const readingTime = notionContent.estimateReadingTime(words);

      expect(readingTime).toBeGreaterThanOrEqual(1);
      expect(readingTime).toBeLessThanOrEqual(2);
    });

    it("should return minimum reading time for very short content", () => {
      const content = "Just a few words";
      const readingTime = notionContent.estimateReadingTime(content);

      expect(readingTime).toBe(1); // Minimum reading time
    });

    it("should return 0 for empty content", () => {
      const readingTime = notionContent.estimateReadingTime("");
      expect(readingTime).toBe(0);
    });
  });
});
