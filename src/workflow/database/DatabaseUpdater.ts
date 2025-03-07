import { INotionDatabase } from "../../core/notion/NotionDatabase.interface";
import { ContentPage, NotionEntry, UpdateResult } from "../../types";

/**
 * Database Updater
 * Updates the Notion database with processed content
 */
export class DatabaseUpdater {
  private notionDatabase: INotionDatabase;
  private databaseId: string;
  private existingEntries: Map<string, NotionEntry>;

  /**
   * Creates a new DatabaseUpdater instance
   * @param notionDatabase The Notion database service
   * @param databaseId ID of the database to update
   */
  constructor(notionDatabase: INotionDatabase, databaseId: string) {
    this.notionDatabase = notionDatabase;
    this.databaseId = databaseId;
    this.existingEntries = new Map<string, NotionEntry>();
  }

  /**
   * Initializes the updater by fetching existing entries
   */
  async initialize(): Promise<void> {
    try {
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
   * Updates or creates an entry in the database
   * @param contentPage The content page to update or create
   */
  async updateEntry(contentPage: ContentPage): Promise<UpdateResult> {
    try {
      console.log(`Updating entry for page: ${contentPage.title}`);

      // Check if an entry already exists for this page
      const originalPageUrl = `https://www.notion.so/${contentPage.id.replace(/-/g, "")}`;
      const existingEntry = this.existingEntries.get(originalPageUrl);

      // Prepare the properties to update
      const properties: Record<string, any> = {
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
        "Original Page": {
          url: originalPageUrl,
        },
        "Date Created": {
          date: {
            start: contentPage.createdTime,
          },
        },
      };

      // Add image URL if available
      if (contentPage.imageUrl) {
        properties.Image = {
          url: contentPage.imageUrl,
        };
      }

      // Add tags if available
      if (contentPage.tags && contentPage.tags.length > 0) {
        properties.Tags = {
          multi_select: contentPage.tags.map((tag) => ({ name: tag })),
        };
      }

      // If entry exists, update it
      if (existingEntry) {
        console.log(`Updating existing entry: ${existingEntry.id}`);

        // Call updateEntry method with proper parameters
        await this.notionDatabase.updateEntry(existingEntry.id, {
          properties,
        });

        // Return the result
        return {
          success: true,
          entryId: existingEntry.id,
          isNew: false,
          message: `Updated entry: ${existingEntry.id}`,
        };
      }

      // Otherwise, create a new entry
      console.log("Creating new entry");

      // Set default status for new entries
      properties.Status = {
        select: {
          name: "Draft",
        },
      };

      // Set published to false by default
      properties.Published = {
        checkbox: false,
      };

      // Create a new entry
      const entryId = await this.notionDatabase.createEntry({
        properties: properties,
      });

      // Add the new entry to the map
      const newEntry = {
        id: entryId,
        properties,
        url: originalPageUrl,
        created_time: new Date().toISOString(),
        last_edited_time: new Date().toISOString(),
      };

      this.existingEntries.set(originalPageUrl, newEntry);
      this.existingEntries.set(entryId, newEntry);

      return {
        success: true,
        entryId: entryId,
        isNew: true,
        message: `Created new entry: ${entryId}`,
      };
    } catch (error) {
      console.error("Error updating entry:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Updates multiple entries in the database
   * @param contentPages The content pages to update
   */
  async updateEntries(contentPages: ContentPage[]): Promise<UpdateResult[]> {
    const results: UpdateResult[] = [];

    for (const contentPage of contentPages) {
      const result = await this.updateEntry(contentPage);
      results.push(result);
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
}
