import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotionContent } from "../../../src/core/notion/NotionContent";
import { Block, Category, NotionConfig, PageContent } from "../../../src/types";

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

describe("NotionContent Complete Coverage", () => {
  let notionContent: NotionContent;
  const mockConfig: NotionConfig = {
    apiKey: "test-api-key",
    sourcePageId: "test-source-page-id",
    targetDatabaseId: "test-database-id",
    rateLimitDelay: 0, // Set to 0 for faster tests
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Create instance with mock
    notionContent = new NotionContent(mockConfig);
  });

  describe("extractTextContent", () => {
    it("should handle undefined or non-array input", () => {
      // Access the private method using type assertion
      const result1 = (notionContent as any).extractTextContent(undefined);
      expect(result1).toBe("");

      const result2 = (notionContent as any).extractTextContent(null);
      expect(result2).toBe("");

      const result3 = (notionContent as any).extractTextContent("not an array");
      expect(result3).toBe("");
    });

    it("should extract text from rich text array", () => {
      const mockRichText = [{ plain_text: "Hello " }, { plain_text: "world" }];

      const result = (notionContent as any).extractTextContent(mockRichText);
      expect(result).toBe("Hello world");
    });
  });

  describe("transformBlock", () => {
    it("should transform paragraph blocks", () => {
      const mockBlock = {
        id: "block-id-1",
        type: "paragraph",
        has_children: false,
        paragraph: {
          rich_text: [{ plain_text: "Paragraph content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-1",
        type: "paragraph",
        content: "Paragraph content",
        hasChildren: false,
      });
    });

    it("should transform heading_1 blocks", () => {
      const mockBlock = {
        id: "block-id-2",
        type: "heading_1",
        has_children: false,
        heading_1: {
          rich_text: [{ plain_text: "Heading 1 content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-2",
        type: "heading_1",
        content: "Heading 1 content",
        hasChildren: false,
      });
    });

    it("should transform heading_2 blocks", () => {
      const mockBlock = {
        id: "block-id-3",
        type: "heading_2",
        has_children: false,
        heading_2: {
          rich_text: [{ plain_text: "Heading 2 content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-3",
        type: "heading_2",
        content: "Heading 2 content",
        hasChildren: false,
      });
    });

    it("should transform heading_3 blocks", () => {
      const mockBlock = {
        id: "block-id-4",
        type: "heading_3",
        has_children: false,
        heading_3: {
          rich_text: [{ plain_text: "Heading 3 content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-4",
        type: "heading_3",
        content: "Heading 3 content",
        hasChildren: false,
      });
    });

    it("should transform bulleted_list_item blocks", () => {
      const mockBlock = {
        id: "block-id-5",
        type: "bulleted_list_item",
        has_children: false,
        bulleted_list_item: {
          rich_text: [{ plain_text: "Bullet point content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-5",
        type: "bulleted_list_item",
        content: "Bullet point content",
        hasChildren: false,
      });
    });

    it("should transform numbered_list_item blocks", () => {
      const mockBlock = {
        id: "block-id-6",
        type: "numbered_list_item",
        has_children: false,
        numbered_list_item: {
          rich_text: [{ plain_text: "Numbered item content" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-6",
        type: "numbered_list_item",
        content: "Numbered item content",
        hasChildren: false,
      });
    });

    it("should transform to_do blocks", () => {
      const mockBlock = {
        id: "block-id-7",
        type: "to_do",
        has_children: false,
        to_do: {
          rich_text: [{ plain_text: "Task content" }],
          checked: true,
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-7",
        type: "to_do",
        content: {
          text: "Task content",
          checked: true,
        },
        hasChildren: false,
      });
    });

    it("should transform unchecked to_do blocks", () => {
      const mockBlock = {
        id: "block-id-8",
        type: "to_do",
        has_children: false,
        to_do: {
          rich_text: [{ plain_text: "Unchecked task" }],
          checked: false,
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-8",
        type: "to_do",
        content: {
          text: "Unchecked task",
          checked: false,
        },
        hasChildren: false,
      });
    });

    it("should transform code blocks", () => {
      const mockBlock = {
        id: "block-id-9",
        type: "code",
        has_children: false,
        code: {
          rich_text: [{ plain_text: "console.log('Hello world');" }],
          language: "javascript",
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-9",
        type: "code",
        content: {
          text: "console.log('Hello world');",
          language: "javascript",
        },
        hasChildren: false,
      });
    });

    it("should use default language for code blocks without specified language", () => {
      const mockBlock = {
        id: "block-id-10",
        type: "code",
        has_children: false,
        code: {
          rich_text: [{ plain_text: "Some code" }],
          // No language specified
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result.content.language).toEqual("plain text");
    });

    it("should transform image blocks with file URL", () => {
      const mockBlock = {
        id: "block-id-11",
        type: "image",
        has_children: false,
        image: {
          type: "file",
          file: {
            url: "https://example.com/image.jpg",
          },
          caption: [{ plain_text: "Image caption" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-11",
        type: "image",
        content: {
          type: "file",
          url: "https://example.com/image.jpg",
          caption: "Image caption",
        },
        hasChildren: false,
      });
    });

    it("should transform image blocks with external URL", () => {
      const mockBlock = {
        id: "block-id-12",
        type: "image",
        has_children: false,
        image: {
          type: "external",
          external: {
            url: "https://example.com/external-image.jpg",
          },
          caption: [{ plain_text: "External image" }],
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-12",
        type: "image",
        content: {
          type: "external",
          url: "https://example.com/external-image.jpg",
          caption: "External image",
        },
        hasChildren: false,
      });
    });

    it("should transform child_page blocks", () => {
      const mockBlock = {
        id: "block-id-13",
        type: "child_page",
        has_children: true,
        child_page: {
          title: "Child Page Title",
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-13",
        type: "child_page",
        content: {
          title: "Child Page Title",
        },
        hasChildren: true,
      });
    });

    it("should use 'Untitled' for child_page blocks without title", () => {
      const mockBlock = {
        id: "block-id-14",
        type: "child_page",
        has_children: true,
        child_page: {
          // No title specified
        },
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result.content.title).toEqual("Untitled");
    });

    it("should handle unknown block types", () => {
      const mockBlock = {
        id: "block-id-15",
        type: "unknown_type",
        has_children: false,
      };

      const result = (notionContent as any).transformBlock(mockBlock);

      expect(result).toEqual({
        id: "block-id-15",
        type: "unknown_type",
        content: {
          type: "unknown_type",
        },
        hasChildren: false,
      });
    });
  });

  describe("convertBlocksToText", () => {
    it("should handle various block types when converting to text", () => {
      const mockBlocks: Block[] = [
        {
          id: "1",
          type: "paragraph",
          content: "This is a paragraph",
          hasChildren: false,
        },
        {
          id: "2",
          type: "heading_1",
          content: "Heading 1",
          hasChildren: false,
        },
        {
          id: "3",
          type: "heading_2",
          content: "Heading 2",
          hasChildren: false,
        },
        {
          id: "4",
          type: "heading_3",
          content: "Heading 3",
          hasChildren: false,
        },
        {
          id: "5",
          type: "bulleted_list_item",
          content: "Bullet point",
          hasChildren: false,
        },
        {
          id: "6",
          type: "numbered_list_item",
          content: "Numbered item",
          hasChildren: false,
        },
        {
          id: "7",
          type: "to_do",
          content: {
            checked: true,
            text: "Completed task",
          },
          hasChildren: false,
        },
        {
          id: "8",
          type: "to_do",
          content: {
            checked: false,
            text: "Incomplete task",
          },
          hasChildren: false,
        },
        {
          id: "9",
          type: "code",
          content: {
            language: "javascript",
            text: "console.log('Hello world');",
          },
          hasChildren: false,
        },
      ];

      const result = (notionContent as any).convertBlocksToText(mockBlocks);

      // Check that each block type is properly converted
      expect(result).toContain("This is a paragraph");
      expect(result).toContain("Heading 1");
      expect(result).toContain("Heading 2");
      expect(result).toContain("Heading 3");
      expect(result).toContain("• Bullet point");
      expect(result).toContain("1. Numbered item");
      expect(result).toContain("[x] Completed task");
      expect(result).toContain("[ ] Incomplete task");
      expect(result).toContain("```javascript");
      expect(result).toContain("console.log('Hello world');");
    });

    it("should recursively process nested blocks", () => {
      const mockBlocks: Block[] = [
        {
          id: "1",
          type: "paragraph",
          content: {
            text: "Parent paragraph",
            children: [
              {
                id: "2",
                type: "paragraph",
                content: "Child paragraph",
                hasChildren: false,
              },
            ],
          },
          hasChildren: true,
        },
      ];

      const result = (notionContent as any).convertBlocksToText(mockBlocks);
      expect(result).toContain("Child paragraph");
    });
  });

  describe("extractTags", () => {
    it("should extract tags from title and content", () => {
      const title = "JavaScript Programming Tutorial";
      const content =
        "This is a comprehensive tutorial about JavaScript programming. Learn about variables, functions, and advanced concepts. comprehensive comprehensive comprehensive";

      const tags = notionContent.extractTags(content, title);

      // Should extract words from title that are > 3 chars
      expect(tags).toContain("javascript");
      expect(tags).toContain("programming");
      expect(tags).toContain("tutorial");

      // Should extract words from content that are > 5 chars AND alphabetic only
      // But only top 5 by frequency
      expect(tags).toContain("comprehensive"); // This appears multiple times
      expect(tags).toContain("javascript");

      // The total number of tags should be limited
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    it("should include category as a tag when provided", () => {
      const title = "JavaScript Basics";
      const content = "Introduction to JavaScript";
      const category = "Programming";

      const tags = notionContent.extractTags(content, title, category);

      // Should include the category with original case
      expect(tags).toContain("Programming");

      // Should still include other tags
      expect(tags).toContain("javascript");
      expect(tags).toContain("basics");
    });

    it("should limit the number of tags and prioritize by frequency", () => {
      // Create content with repeated words to test frequency prioritization
      let content = "";
      for (let i = 0; i < 20; i++) {
        content += "frequent ";
      }
      for (let i = 0; i < 10; i++) {
        content += "somewhat ";
      }
      for (let i = 0; i < 5; i++) {
        content += "infrequent ";
      }

      const title = "Test Title";
      const tags = notionContent.extractTags(content, title);

      // Should include the most frequent words (if they're > 5 chars)
      const frequentIncluded = tags.some((tag) =>
        ["frequent", "somewhat", "infrequent"].includes(tag)
      );
      expect(frequentIncluded).toBe(true);

      // The number of tags should be limited to 10
      expect(tags.length).toBeLessThanOrEqual(10);
    });

    it("should only include alphabetic words from content as tags", () => {
      const title = "Title";
      const content = "Content with alphanumeric123 and symbol$ words";

      const tags = notionContent.extractTags(content, title);

      // Should include title words > 3 chars
      expect(tags).toContain("title");

      // Content words must be > 5 chars AND alphabetic only
      const includesNonAlphabetic = tags.some(
        (tag) => tag === "alphanumeric123" || tag === "symbol$"
      );
      expect(includesNonAlphabetic).toBe(false);

      // Should include alphabetic words > 5 chars
      const includesAlphabetic = tags.some((tag) => tag === "content");
      expect(includesAlphabetic).toBe(true);
    });
  });

  describe("generateExcerpt", () => {
    it("should truncate content to the specified length", () => {
      const longText =
        "This is a very long text that should be truncated to a shorter length according to the maxLength parameter provided to the generateExcerpt method.";

      const excerpt50 = notionContent.generateExcerpt(longText, 50);
      expect(excerpt50.length).toBeLessThanOrEqual(53); // 50 + "..." length
      expect(excerpt50.endsWith("...")).toBe(true);

      const excerpt20 = notionContent.generateExcerpt(longText, 20);
      expect(excerpt20.length).toBeLessThanOrEqual(23); // 20 + "..." length
      expect(excerpt20.endsWith("...")).toBe(true);
    });

    it("should not truncate content shorter than maxLength", () => {
      const shortText = "Short text";

      const excerpt50 = notionContent.generateExcerpt(shortText, 50);
      expect(excerpt50).toBe(shortText);
      expect(excerpt50.endsWith("...")).toBe(false);
    });

    it("should handle text with no spaces for the last resort truncation", () => {
      // Create a long text with no spaces to force the last resort truncation
      const longContinuousText =
        "ThisIsAVeryLongTextWithNoSpacesThatWillForceTheLastResortTruncationLogicToBeUsedAsThereAreNoSpacesToUseForWordBreak";

      const excerpt20 = notionContent.generateExcerpt(longContinuousText, 20);

      // Should truncate at exactly maxLength and add "..."
      expect(excerpt20).toBe(longContinuousText.slice(0, 20) + "...");
      expect(excerpt20.length).toBe(23); // 20 + "..." length
    });

    it("should truncate at sentence break if it's after half the max length", () => {
      const content =
        "This is a short sentence. This is a longer sentence that goes beyond the max length.";
      const maxLength = 40;
      const result = notionContent.generateExcerpt(content, maxLength);
      expect(result).toBe("This is a short sentence.");
    });
  });

  describe("estimateReadingTime", () => {
    it("should calculate reading time based on word count", () => {
      // Average reading speed is often estimated at 200-250 words per minute
      // Let's test with texts of different lengths

      const shortText = "This is a very short text with only a few words.";
      const shortTextReadingTime = notionContent.estimateReadingTime(shortText);
      expect(shortTextReadingTime).toBe(1); // Should be 1 minute minimum

      // Create a longer text - around 500 words (about 2-3 minutes of reading)
      let longText = "";
      for (let i = 0; i < 500; i++) {
        longText += "word ";
      }

      const longTextReadingTime = notionContent.estimateReadingTime(longText);
      expect(longTextReadingTime).toBeGreaterThan(1);
    });
  });

  describe("fetchBlocks", () => {
    it("should handle pagination and nested blocks", async () => {
      // Mock client.blocks.children.list to return paginated results
      const mockListResponse = {
        object: "list",
        results: [
          {
            type: "paragraph",
            has_children: true,
            id: "block1",
            paragraph: { rich_text: [{ plain_text: "Test" }] },
          },
        ],
        has_more: true,
        next_cursor: "cursor1",
      };

      const mockListResponse2 = {
        object: "list",
        results: [
          {
            type: "paragraph",
            has_children: false,
            id: "block2",
            paragraph: { rich_text: [{ plain_text: "Test 2" }] },
          },
        ],
        has_more: false,
      };

      // Mock the fetchNestedBlocks method to avoid infinite recursion
      vi.spyOn(notionContent as any, "fetchNestedBlocks").mockImplementation(
        async (blocks) => blocks
      );

      // Mock the client's blocks.children.list method
      const mockList = vi
        .fn()
        .mockResolvedValueOnce(mockListResponse)
        .mockResolvedValueOnce(mockListResponse2);

      (notionContent as any).client = {
        blocks: {
          children: {
            list: mockList,
          },
        },
      };

      const blocks = await (notionContent as any).fetchBlocks("test-page-id");

      expect(blocks).toHaveLength(2);
      expect(mockList).toHaveBeenCalledTimes(2);
      expect(mockList).toHaveBeenCalledWith({
        block_id: "test-page-id",
        start_cursor: undefined,
      });
      expect(mockList).toHaveBeenCalledWith({
        block_id: "test-page-id",
        start_cursor: "cursor1",
      });
    });
  });

  describe("fetchNestedBlocks", () => {
    it("should recursively fetch child blocks", async () => {
      const mockBlocks = [
        {
          id: "block1",
          type: "paragraph",
          hasChildren: true,
          content: { text: "Parent" },
        },
        {
          id: "block2",
          type: "paragraph",
          hasChildren: false,
          content: { text: "No children" },
        },
      ];

      // Mock fetchBlocks to return child blocks
      const mockChildBlocks = [
        {
          id: "child1",
          type: "paragraph",
          hasChildren: false,
          content: { text: "Child" },
        },
      ];

      vi.spyOn(notionContent as any, "fetchBlocks").mockResolvedValue(
        mockChildBlocks
      );

      const result = await (notionContent as any).fetchNestedBlocks(mockBlocks);

      expect(result).toHaveLength(2);
      expect(result[0].content.children).toEqual(mockChildBlocks);
      expect(result[1]).toEqual(mockBlocks[1]);
      expect((notionContent as any).fetchBlocks).toHaveBeenCalledWith("block1");
    });
  });

  describe("delay", () => {
    it("should delay for the configured time", async () => {
      const startTime = Date.now();
      await (notionContent as any).delay();
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(350); // Default delay
    });
  });

  describe("fetchPageContent", () => {
    it("should fetch and cache page content", async () => {
      const mockPage = {
        properties: {
          title: {
            title: [{ plain_text: "Test Page" }],
          },
        },
        created_time: "2024-03-08T00:00:00.000Z",
        last_edited_time: "2024-03-08T01:00:00.000Z",
      };

      const mockBlocks = [
        {
          type: "paragraph",
          has_children: false,
          id: "block1",
          paragraph: { rich_text: [{ plain_text: "Test content" }] },
        },
      ];

      // Mock the client's pages.retrieve method
      (notionContent as any).client = {
        pages: {
          retrieve: vi.fn().mockResolvedValue(mockPage),
        },
      };

      // Mock fetchBlocks method
      vi.spyOn(notionContent as any, "fetchBlocks").mockResolvedValue(
        mockBlocks
      );

      // First call should fetch from API
      const result1 = await notionContent.fetchPageContent("test-page-id");
      expect(result1.title).toBe("Test Page");
      expect(result1.blocks).toEqual(mockBlocks);
      expect(
        (notionContent as any).client.pages.retrieve
      ).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await notionContent.fetchPageContent("test-page-id");
      expect(result2).toEqual(result1);
      expect(
        (notionContent as any).client.pages.retrieve
      ).toHaveBeenCalledTimes(1);
    });

    it("should handle missing title property", async () => {
      const mockPage = {
        properties: {},
        created_time: "2024-03-08T00:00:00.000Z",
        last_edited_time: "2024-03-08T01:00:00.000Z",
      };

      // Mock the client's pages.retrieve method
      (notionContent as any).client = {
        pages: {
          retrieve: vi.fn().mockResolvedValue(mockPage),
        },
      };

      // Mock fetchBlocks method
      vi.spyOn(notionContent as any, "fetchBlocks").mockResolvedValue([]);

      const result = await notionContent.fetchPageContent("test-page-id");
      expect(result.title).toBe("Untitled");
    });
  });

  describe("extractCategories", () => {
    it("should extract and cache categories from blocks", async () => {
      const mockBlocks = [
        {
          id: "category1",
          type: "child_page",
          hasChildren: true,
          content: {
            title: "Regular Category",
          },
        },
        {
          id: "category2",
          type: "child_page",
          hasChildren: true,
          content: {
            title: "MIT Unit 1",
          },
        },
      ];

      // Mock fetchBlocks method
      vi.spyOn(notionContent as any, "fetchBlocks").mockResolvedValue(
        mockBlocks
      );

      // First call should fetch from API
      const result1 = await notionContent.extractCategories("test-page-id");
      expect(result1).toHaveLength(2);
      expect(result1[0].type).toBe("regular");
      expect(result1[1].type).toBe("mit");
      expect((notionContent as any).fetchBlocks).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await notionContent.extractCategories("test-page-id");
      expect(result2).toEqual(result1);
      expect((notionContent as any).fetchBlocks).toHaveBeenCalledTimes(1);
    });
  });

  describe("extractValidContent", () => {
    it("should extract content pages from categories", async () => {
      const mockCategories: Category[] = [
        {
          id: "category1",
          name: "Regular Category",
          type: "regular",
        },
        {
          id: "category2",
          name: "3701",
          type: "mit",
        },
      ];

      const mockCategoryBlocks = [
        {
          type: "child_page",
          has_children: false,
          id: "page1",
          child_page: { title: "Page 1" },
        },
      ];

      const mockPageContent: PageContent = {
        title: "Page 1",
        blocks: [
          {
            id: "block1",
            type: "paragraph",
            hasChildren: false,
            content: "Test content",
          },
        ],
        properties: {},
        createdTime: "2024-03-08T00:00:00.000Z",
        lastEditedTime: "2024-03-08T01:00:00.000Z",
      };

      // Mock extractCategories method
      vi.spyOn(notionContent, "extractCategories").mockResolvedValue(
        mockCategories
      );

      // Mock fetchBlocks method
      vi.spyOn(notionContent as any, "fetchBlocks").mockResolvedValue(
        mockCategoryBlocks
      );

      // Mock fetchPageContent method
      vi.spyOn(notionContent, "fetchPageContent").mockResolvedValue(
        mockPageContent
      );

      // Mock convertBlocksToText method
      vi.spyOn(notionContent as any, "convertBlocksToText").mockReturnValue(
        "Test content"
      );

      const result = await notionContent.extractValidContent("test-page-id");
      expect(result).toHaveLength(2);
      expect(result[0].category).toBe("Regular Category");
      expect(result[1].category).toBe("CITS3701");
    });
  });
});
