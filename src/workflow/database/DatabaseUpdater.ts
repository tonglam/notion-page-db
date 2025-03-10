import { INotionDatabase } from "../../core/notion/NotionDatabase.interface";
import { ContentPage, NotionEntry, UpdateResult } from "../../types";

/**
 * Database Updater
 * Updates the Notion database with processed content
 */
export class DatabaseUpdater {
  private notionDatabase: INotionDatabase;
  private databaseId: string | undefined;
  private existingEntries: Map<string, NotionEntry>;

  /**
   * Creates a new DatabaseUpdater instance
   * @param notionDatabase The Notion database service
   * @param databaseId Optional ID of the database to update
   */
  constructor(notionDatabase: INotionDatabase, databaseId?: string) {
    this.notionDatabase = notionDatabase;
    this.databaseId = databaseId;
    this.existingEntries = new Map<string, NotionEntry>();
  }

  /**
   * Sets the database ID after construction
   * @param databaseId The database ID to use
   */
  setDatabaseId(databaseId: string): void {
    this.databaseId = databaseId;
  }

  /**
   * Gets the current database ID
   * @returns The current database ID
   */
  getDatabaseId(): string | undefined {
    return this.databaseId;
  }

  /**
   * Initializes the updater by fetching existing entries
   */
  async initialize(): Promise<void> {
    try {
      if (!this.databaseId) {
        throw new Error("Database ID must be set before initialization");
      }

      console.log(
        `Initializing database updater for database: ${this.databaseId}`
      );

      // Query all entries in the database
      const queryResult = await this.notionDatabase.queryEntries({
        database_id: this.databaseId,
        page_size: 100,
      });

      // Store entries in the map for quick lookup
      if (queryResult && queryResult.length > 0) {
        queryResult.forEach((entry) => {
          // Use the Original Page URL as the key if available
          const originalPageUrl = entry.properties["Original Page"]?.url;
          const pageId = entry.id;

          if (originalPageUrl) {
            this.existingEntries.set(originalPageUrl, entry);
          }

          // Also store by ID for direct lookups
          this.existingEntries.set(pageId, entry);
        });
      }

      console.log(`Loaded ${this.existingEntries.size} existing entries`);
    } catch (error) {
      console.error("Error initializing database updater:", error);
      throw error;
    }
  }

  /**
   * Updates a database entry with the processed content
   * @param contentPage The processed content page
   */
  async updateEntry(contentPage: ContentPage): Promise<UpdateResult> {
    try {
      if (!this.databaseId) {
        throw new Error("Database ID is required");
      }

      // Set the database ID for this operation
      this.notionDatabase.setDatabaseId(this.databaseId);

      // Check if the entry exists by originalPageUrl or title
      let existingEntry: NotionEntry | undefined;

      if (contentPage.originalPageUrl) {
        existingEntry = this.existingEntries.get(contentPage.originalPageUrl);
      }

      if (!existingEntry) {
        // Try to find by title
        const entriesByTitle = await this.notionDatabase.queryEntries({
          filter: {
            property: "Title",
            title: {
              equals: contentPage.title,
            },
          },
          page_size: 1,
        });

        if (entriesByTitle && entriesByTitle.length > 0) {
          existingEntry = entriesByTitle[0];
          // Store for future lookups
          this.existingEntries.set(existingEntry.id, existingEntry);
          if (contentPage.originalPageUrl) {
            this.existingEntries.set(
              contentPage.originalPageUrl,
              existingEntry
            );
          }
        }
      }

      // Determine if we need to create or update
      if (existingEntry) {
        // Check for fields that need updating
        const fieldsToUpdate = this.getFieldsNeedingUpdate(
          contentPage,
          existingEntry
        );

        if (fieldsToUpdate.length === 0) {
          return {
            success: true,
            entryId: existingEntry.id,
            isNew: false,
            message: `Entry already up to date: ${existingEntry.id}`,
          };
        }

        console.log(
          `Updating existing entry ${existingEntry.id}, fields to update: ${fieldsToUpdate.join(", ")}`
        );

        // Convert ContentPage to Notion properties
        const properties = this.mapContentToProperties(contentPage);

        // Update the existing entry
        await this.notionDatabase.updateEntry(existingEntry.id, { properties });

        return {
          success: true,
          entryId: existingEntry.id,
          isNew: false,
          message: `Updated entry: ${existingEntry.id}`,
        };
      } else {
        // Check for empty required fields
        const emptyFields = this.getEmptyFields(contentPage);
        if (emptyFields.includes("title") || emptyFields.includes("content")) {
          return {
            success: false,
            error: `Cannot create entry with empty required fields: ${emptyFields.join(", ")}`,
          };
        }

        // Convert ContentPage to Notion properties
        const properties = this.mapContentToProperties(contentPage);

        // Create a new entry
        const newId = await this.notionDatabase.createEntry({
          properties,
        });

        // Add the new entry to our map
        const newEntry: NotionEntry = {
          id: newId,
          properties: properties,
          url: `https://www.notion.so/${newId.replace(/-/g, "")}`,
          created_time: new Date().toISOString(),
          last_edited_time: new Date().toISOString(),
        };

        this.existingEntries.set(newId, newEntry);
        if (contentPage.originalPageUrl) {
          this.existingEntries.set(contentPage.originalPageUrl, newEntry);
        }

        return {
          success: true,
          entryId: newId,
          isNew: true,
          message: `Created new entry: ${newId}`,
        };
      }
    } catch (error) {
      console.error("Error updating database entry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Maps a ContentPage to Notion properties
   * @param contentPage The content page to map
   */
  private mapContentToProperties(
    contentPage: ContentPage
  ): Record<string, any> {
    return {
      Title: {
        title: [
          {
            type: "text",
            text: {
              content: contentPage.title,
            },
          },
        ],
      },
      Category: {
        select: {
          name: contentPage.category,
        },
      },
      Tags: {
        multi_select: contentPage.tags?.map((tag) => ({ name: tag })) || [],
      },
      Summary: {
        rich_text: [
          {
            type: "text",
            text: {
              content: contentPage.summary || "",
            },
          },
        ],
      },
      Excerpt: {
        rich_text: [
          {
            type: "text",
            text: {
              content: contentPage.excerpt || "",
            },
          },
        ],
      },
      "Mins Read": {
        number: contentPage.minsRead || 0,
      },
      Image: {
        url: contentPage.imageUrl || null,
      },
      R2ImageUrl: {
        url: contentPage.r2ImageUrl || null,
      },
      "Date Created": {
        date: {
          start: contentPage.createdTime,
        },
      },
      Status: {
        select: {
          name: contentPage.status || "Draft",
        },
      },
      "Original Page": {
        url: contentPage.originalPageUrl || "",
      },
      Published: {
        checkbox: contentPage.published || false,
      },
    };
  }

  /**
   * Updates multiple entries in the database
   * @param contentPages The content pages to update
   */
  async updateEntries(contentPages: ContentPage[]): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];
    const successful: ContentPage[] = [];
    const failed: { page: ContentPage; error: string }[] = [];

    // First check initialization
    if (!this.databaseId) {
      return [
        {
          success: false,
          error: "Database ID is required",
        },
      ];
    }

    // Make sure we're initialized
    if (this.existingEntries.size === 0) {
      try {
        await this.initialize();
      } catch (error) {
        return [
          {
            success: false,
            error: `Failed to initialize database updater: ${
              error instanceof Error ? error.message : String(error)
            }`,
          },
        ];
      }
    }

    // Process all entries in a transaction-like manner
    for (const contentPage of contentPages) {
      try {
        // Process each entry
        const result = await this.updateEntry(contentPage);
        results.push(result);

        if (result.success) {
          successful.push(contentPage);
        } else {
          failed.push({
            page: contentPage,
            error: result.error || "Unknown error",
          });
        }
      } catch (error) {
        // Handle unexpected errors
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          success: false,
          error: errorMessage,
        });
        failed.push({
          page: contentPage,
          error: errorMessage,
        });
      }
    }

    // Log results
    console.log(
      `Database update completed: ${successful.length} successful, ${failed.length} failed`
    );

    if (failed.length > 0) {
      console.error("Failed entries:");
      failed.forEach(({ page, error }) => {
        console.error(`- ${page.title}: ${error}`);
      });
    }

    return results;
  }

  /**
   * Gets an existing entry by ID or URL
   * @param idOrUrl ID or URL of the entry to get
   */
  getExistingEntry(idOrUrl: string): NotionEntry | undefined {
    return this.existingEntries.get(idOrUrl);
  }

  /**
   * Gets all existing entries
   */
  getAllExistingEntries(): NotionEntry[] {
    // Use Set to deduplicate entries (since we store them by both ID and URL)
    const uniqueEntries = new Set<NotionEntry>();

    this.existingEntries.forEach((entry) => {
      uniqueEntries.add(entry);
    });

    return Array.from(uniqueEntries);
  }

  /**
   * Checks if a content page has empty fields that need processing
   * @param contentPage The content page to check
   * @returns Array of field names that are empty and need processing
   */
  getEmptyFields(contentPage: ContentPage): string[] {
    const emptyFields: string[] = [];

    // Check required fields
    if (!contentPage.title || contentPage.title.trim() === "") {
      emptyFields.push("title");
    }

    if (!contentPage.content || contentPage.content.trim() === "") {
      emptyFields.push("content");
    }

    // Check optional fields that should ideally be filled
    if (!contentPage.summary || contentPage.summary.trim() === "") {
      emptyFields.push("summary");
    }

    if (!contentPage.excerpt || contentPage.excerpt.trim() === "") {
      emptyFields.push("excerpt");
    }

    if (!contentPage.tags || contentPage.tags.length === 0) {
      emptyFields.push("tags");
    }

    if (!contentPage.minsRead) {
      emptyFields.push("minsRead");
    }

    if (!contentPage.status) {
      emptyFields.push("status");
    }

    if (contentPage.published === undefined) {
      emptyFields.push("published");
    }

    if (!contentPage.imageUrl || contentPage.imageUrl.trim() === "") {
      emptyFields.push("imageUrl");
    }

    return emptyFields;
  }

  /**
   * Checks if a content page needs processing by comparing to existing entry
   * @param contentPage The content page to check
   * @param existingEntry The existing database entry to compare against
   * @returns Array of field names that need to be updated
   */
  getFieldsNeedingUpdate(
    contentPage: ContentPage,
    existingEntry: NotionEntry
  ): string[] {
    const fieldsToUpdate: string[] = [];
    const properties = existingEntry.properties;

    // Check title
    if (properties.Title?.title?.[0]?.text?.content !== contentPage.title) {
      fieldsToUpdate.push("title");
    }

    // Check summary
    if (
      !properties.Summary?.rich_text?.[0]?.text?.content &&
      contentPage.summary
    ) {
      fieldsToUpdate.push("summary");
    }

    // Check excerpt
    if (
      !properties.Excerpt?.rich_text?.[0]?.text?.content &&
      contentPage.excerpt
    ) {
      fieldsToUpdate.push("excerpt");
    }

    // Check tags
    if (
      !properties.Tags?.multi_select ||
      properties.Tags.multi_select.length === 0
    ) {
      if (contentPage.tags && contentPage.tags.length > 0) {
        fieldsToUpdate.push("tags");
      }
    }

    // Check mins read
    if (!properties["Mins Read"]?.number && contentPage.minsRead) {
      fieldsToUpdate.push("minsRead");
    }

    // Check image
    if (!properties.Image?.url && contentPage.imageUrl) {
      fieldsToUpdate.push("imageUrl");
    }

    // Check R2ImageUrl
    if (!properties.R2ImageUrl?.url && contentPage.r2ImageUrl) {
      fieldsToUpdate.push("r2ImageUrl");
    }

    return fieldsToUpdate;
  }
}
