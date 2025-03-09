import { DatabaseSchema, EntryData, NotionConfig } from "../src/types";

/**
 * Standard test database schema
 */
export const testDatabaseSchema: DatabaseSchema = {
  name: "Test Database",
  properties: {
    Title: {
      type: "title",
    },
    Content: {
      type: "rich_text",
    },
    Keywords: {
      type: "multi_select",
      options: [
        { name: "Technology", color: "blue" },
        { name: "Science", color: "green" },
        { name: "Art", color: "orange" },
      ],
    },
    Status: {
      type: "select",
      options: [
        { name: "Draft", color: "gray" },
        { name: "Published", color: "green" },
        { name: "Archived", color: "red" },
      ],
    },
    ImageUrl: {
      type: "url",
    },
    LastUpdated: {
      type: "date",
    },
  },
};

/**
 * Helper to create a test entry data object
 */
export function createTestEntryData(
  overrides: Partial<EntryData> = {}
): EntryData {
  const now = new Date().toISOString();

  return {
    properties: {
      Title: {
        title: [
          {
            type: "text",
            text: {
              content: "Test Entry",
            },
          },
        ],
      },
      Content: {
        rich_text: [
          {
            type: "text",
            text: {
              content: "This is test content",
            },
          },
        ],
      },
      Keywords: {
        multi_select: [
          {
            name: "Technology",
          },
        ],
      },
      Status: {
        select: {
          name: "Draft",
        },
      },
      ImageUrl: {
        url: "https://example.com/image.jpg",
      },
      LastUpdated: {
        date: {
          start: now,
        },
      },
    },
    title: [
      {
        type: "text",
        text: {
          content: "Test Entry",
        },
      },
    ],
    ...overrides,
  };
}

/**
 * Helper to create a test Notion config
 */
export function createTestNotionConfig(
  overrides: Partial<NotionConfig> = {}
): NotionConfig {
  return {
    apiKey: "test-api-key",
    resolvedDatabaseId: "test-database-id",
    sourcePageId: "test-source-page-id",
    targetDatabaseName: "Test Database",
    rateLimitDelay: 0, // For faster tests
    ...overrides,
  };
}

/**
 * Mock Notion database search results
 */
export const mockDatabaseSearchResults = {
  results: [
    {
      object: "database",
      id: "test-database-id",
      title: [
        {
          type: "text",
          text: {
            content: "Test Database",
          },
        },
      ],
    },
  ],
  next_cursor: null,
  has_more: false,
};

/**
 * Mock Notion database query results
 */
export const mockDatabaseQueryResults = {
  results: [
    {
      id: "test-page-id-1",
      properties: {
        Title: {
          title: [
            {
              text: {
                content: "Test Entry 1",
              },
            },
          ],
        },
        Content: {
          rich_text: [
            {
              text: {
                content: "This is test content 1",
              },
            },
          ],
        },
        Keywords: {
          multi_select: [
            {
              name: "Technology",
            },
          ],
        },
        Status: {
          select: {
            name: "Draft",
          },
        },
        ImageUrl: {
          url: "https://example.com/image1.jpg",
        },
        LastUpdated: {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    },
    {
      id: "test-page-id-2",
      properties: {
        Title: {
          title: [
            {
              text: {
                content: "Test Entry 2",
              },
            },
          ],
        },
        Content: {
          rich_text: [
            {
              text: {
                content: "This is test content 2",
              },
            },
          ],
        },
        Keywords: {
          multi_select: [
            {
              name: "Science",
            },
          ],
        },
        Status: {
          select: {
            name: "Published",
          },
        },
        ImageUrl: {
          url: "https://example.com/image2.jpg",
        },
        LastUpdated: {
          date: {
            start: new Date().toISOString(),
          },
        },
      },
    },
  ],
  next_cursor: null,
  has_more: false,
};
