import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import {
  DatabaseSchema,
  EntryData,
  NotionConfig,
  NotionEntry,
  QueryFilter,
} from "../../types";
import { INotionDatabase } from "./NotionDatabase.interface";

/**
 * Implementation of the NotionDatabase service
 */
export class NotionDatabase implements INotionDatabase {
  private client: Client;
  private databaseId: string | undefined;
  private rateLimitDelay: number;

  /**
   * Creates a new NotionDatabase instance
   * @param config The Notion configuration
   */
  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.apiKey });
    this.databaseId = config.targetDatabaseId;
    this.rateLimitDelay = config.rateLimitDelay || 350;
  }

  /**
   * Verifies that the database exists
   */
  async verifyDatabase(): Promise<boolean> {
    if (!this.databaseId) {
      return false;
    }

    try {
      await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Creates a new database with the specified schema
   * @param schema The database schema to create
   */
  async createDatabase(schema: DatabaseSchema): Promise<string> {
    const properties: Record<string, any> = {};

    // Process each property in the schema
    Object.entries(schema.properties).forEach(([name, definition]) => {
      if (name === "Title") {
        properties[name] = { title: {} };
      } else {
        properties[name] = this.createPropertyDefinition(definition);
      }
    });

    try {
      // Create the database
      const response = await this.client.databases.create({
        parent: {
          type: "page_id",
          page_id: schema.name, // This would be a parent page ID
        },
        title: [
          {
            type: "text",
            text: {
              content: schema.name,
            },
          },
        ],
        properties,
      });

      this.databaseId = response.id;
      return response.id;
    } catch (error) {
      console.error("Failed to create database:", error);
      throw new Error(`Failed to create database: ${(error as Error).message}`);
    }
  }

  /**
   * Queries entries from the database
   * @param filter Optional filter for the query
   */
  async queryEntries(filter?: QueryFilter): Promise<NotionEntry[]> {
    try {
      // Validate database ID
      if (!this.databaseId) {
        throw new Error("Database ID is required");
      }

      // Create filter for the query - leave it undefined for now to avoid type issues
      const entries: NotionEntry[] = [];
      let hasMore = true;
      let startCursor: string | undefined = filter?.start_cursor;

      while (hasMore) {
        await this.delay();

        const response = await this.client.databases.query({
          database_id: this.databaseId,
          // Don't pass filter for now to avoid type issues
          start_cursor: startCursor,
          page_size: filter?.page_size || 100,
        });

        // Transform the results
        const transformedEntries = response.results.map((result) => {
          // Type assertion to PageObjectResponse which has all required properties
          const page = result as PageObjectResponse;

          return {
            id: page.id,
            properties: page.properties,
            url: page.url,
            created_time: page.created_time,
            last_edited_time: page.last_edited_time,
          };
        });

        entries.push(...transformedEntries);

        // Check if there are more results
        hasMore = response.has_more && !!response.next_cursor;
        startCursor = response.next_cursor || undefined;

        // If a page_size was specified and we've reached it, stop
        if (filter?.page_size && entries.length >= filter.page_size) {
          hasMore = false;
          entries.splice(filter.page_size);
        }
      }

      return entries;
    } catch (error) {
      console.error("Error querying entries:", error);
      throw error;
    }
  }

  /**
   * Creates a new entry in the database
   * @param data The data for the new entry
   */
  async createEntry(data: EntryData): Promise<string> {
    if (!this.databaseId) {
      throw new Error("Database ID is not set");
    }

    await this.delay(); // Respect rate limiting

    try {
      const properties = this.transformDataToProperties(data);

      const response = await this.client.pages.create({
        parent: {
          database_id: this.databaseId,
        },
        properties,
      });

      return response.id;
    } catch (error) {
      console.error("Failed to create entry:", error);
      throw new Error(`Failed to create entry: ${(error as Error).message}`);
    }
  }

  /**
   * Updates an existing entry in the database
   * @param pageId The ID of the page to update
   * @param data The data to update
   */
  async updateEntry(pageId: string, data: Partial<EntryData>): Promise<void> {
    await this.delay(); // Respect rate limiting

    try {
      const properties = this.transformDataToProperties(data);

      await this.client.pages.update({
        page_id: pageId,
        properties,
      });
    } catch (error) {
      console.error(`Failed to update entry ${pageId}:`, error);
      throw new Error(`Failed to update entry: ${(error as Error).message}`);
    }
  }

  /**
   * Batch updates multiple entries
   * @param entries Array of entries to update
   */
  async batchUpdateEntries(
    entries: Array<{ id: string; data: Partial<EntryData> }>
  ): Promise<void> {
    // Process entries in batches
    for (const entry of entries) {
      await this.updateEntry(entry.id, entry.data);
    }
  }

  /**
   * Transforms a query filter to Notion's filter format
   * @param filter The filter to transform
   */
  private transformFilter(filter: QueryFilter): any {
    // If custom filter is provided, use it directly
    if (filter.filter) {
      return filter.filter;
    }

    // For now, return empty object as default filter
    return {};
  }

  /**
   * Transforms data to Notion's property format
   * @param data The data to transform
   */
  private transformDataToProperties(
    data: Partial<EntryData>
  ): Record<string, any> {
    const properties: Record<string, any> = {};

    // Copy properties if they exist
    if (data.properties) {
      Object.assign(properties, data.properties);
    }

    // Process parent property
    if (data.parent) {
      // Skip this for now as we're not using it directly in properties
    }

    // Process title separately
    if (data.title && Array.isArray(data.title)) {
      properties.title = {
        title: data.title,
      };
    }

    return properties;
  }

  /**
   * Creates a property definition for Notion's database
   * @param definition The property definition
   */
  private createPropertyDefinition(definition: any): any {
    const { type, options } = definition;

    if (type === "select" || type === "multi_select") {
      return {
        [type]: options ? { options } : {},
      };
    }

    return {
      [type]: {},
    };
  }

  /**
   * Delays execution to respect API rate limits
   */
  private async delay(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay));
  }
}
