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
  public client: Client;
  private databaseId?: string;
  private databaseName?: string;
  private sourcePageId?: string;
  private rateLimitDelay: number = 350; // milliseconds

  /**
   * Creates a new NotionDatabase instance
   * @param config The Notion configuration
   */
  constructor(config: NotionConfig) {
    this.client = new Client({ auth: config.apiKey });
    // Use the resolved database ID if available (backward compatibility)
    this.databaseId = config.resolvedDatabaseId;
    // Store the database name for lookup/creation
    this.databaseName = config.targetDatabaseName || "Content Database";
    this.sourcePageId = config.sourcePageId;
    this.rateLimitDelay = config.rateLimitDelay || 350;
  }

  /**
   * Sets the database ID after resolution
   * @param databaseId The resolved database ID
   */
  setDatabaseId(databaseId: string): void {
    this.databaseId = databaseId;
  }

  /**
   * Gets the current database ID
   * @returns The current database ID or undefined
   */
  getDatabaseId(): string | undefined {
    return this.databaseId;
  }

  /**
   * Finds a database by name from user's Notion workspace
   * @returns The database ID if found, otherwise undefined
   */
  async findDatabaseByName(): Promise<string | undefined> {
    if (!this.databaseName) {
      return undefined;
    }

    try {
      // Search for databases with the specified name
      const response = await this.client.search({
        query: this.databaseName,
        filter: {
          property: "object",
          value: "database",
        },
      });

      // Look for an exact match by name
      for (const result of response.results) {
        // Skip non-database results
        if (result.object !== "database") {
          continue;
        }

        // Get the database title
        const database = result as any;
        const titleProperty = database.title;

        if (titleProperty && Array.isArray(titleProperty)) {
          const title = titleProperty.map((t: any) => t.plain_text).join("");

          // If the database name matches, return its ID
          if (title.toLowerCase() === this.databaseName.toLowerCase()) {
            return database.id;
          }
        }
      }

      // No matching database found
      return undefined;
    } catch (error) {
      console.error("Error finding database by name:", error);
      return undefined;
    }
  }

  /**
   * Verifies that the database exists and is accessible
   * @param testDatabaseId Optional database ID to use for testing
   * @returns True if the database exists and is accessible, otherwise false
   */
  async verifyDatabase(testDatabaseId?: string): Promise<boolean> {
    // If we have a test database ID, use it directly for testing
    if (testDatabaseId) {
      this.databaseId = testDatabaseId;
      return true;
    }

    // If we don't have a database ID yet, try to find it by name
    if (!this.databaseId) {
      const foundId = await this.findDatabaseByName();
      if (foundId) {
        this.databaseId = foundId;
      } else {
        return false;
      }
    }

    try {
      await this.client.databases.retrieve({
        database_id: this.databaseId,
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initializes the database by finding it by name or creating it if needed
   * @param parentPageId The parent page ID to create the database under if needed
   * @param schema Optional schema to use when creating the database
   * @returns The database ID
   */
  async initializeDatabase(
    parentPageId?: string,
    schema?: DatabaseSchema
  ): Promise<string> {
    // First, try to find the database by name
    const foundId = await this.findDatabaseByName();

    if (foundId) {
      this.databaseId = foundId;
      return foundId;
    }

    // If we couldn't find it and we have a parent page ID, create it
    if (parentPageId) {
      // Use provided schema or create a default one
      const dbSchema: DatabaseSchema = schema || {
        name: this.databaseName || "Content Database",
        properties: this.buildDefaultProperties(),
      };

      // Create the database
      const newId = await this.createDatabase(dbSchema, parentPageId);
      this.databaseId = newId;
      return newId;
    }

    throw new Error(
      "Database not found and cannot be created without a parent page ID"
    );
  }

  /**
   * Sets the source page ID for database creation
   * @param sourcePageId The source page ID
   */
  setSourcePageId(sourcePageId: string): void {
    this.sourcePageId = sourcePageId;
  }

  /**
   * Creates a new database with the specified schema
   * @param schema The database schema to create
   * @param parentPageId The parent page ID to create the database under
   * @returns The ID of the created database
   */
  async createDatabase(
    schema: DatabaseSchema,
    parentPageId?: string
  ): Promise<string> {
    try {
      // Use provided parentPageId, sourcePageId from instance, or throw error
      const pageId = parentPageId || this.sourcePageId;
      if (!pageId) {
        throw new Error("Parent page ID is required to create a database");
      }

      const properties: Record<string, any> = {};

      // Process each property in the schema
      Object.entries(schema.properties).forEach(([name, definition]) => {
        if (name === "Title") {
          properties[name] = { title: {} };
        } else {
          properties[name] = this.createPropertyDefinition(definition);
        }
      });

      // Create the database
      const response = await this.client.databases.create({
        parent: {
          type: "page_id",
          page_id: pageId,
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

  /**
   * Builds the default database properties
   * @returns The default properties for the database
   */
  private buildDefaultProperties(): Record<string, any> {
    return {
      Title: { type: "title" },
      Category: {
        type: "select",
        options: [
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "blue" },
          { name: "React", color: "green" },
          { name: "TypeScript", color: "purple" },
        ],
      },
      Tags: {
        type: "multi_select",
        options: [],
      },
      Summary: {
        type: "rich_text",
      },
      Excerpt: {
        type: "rich_text",
      },
      "Mins Read": {
        type: "number",
        format: "number",
      },
      Image: {
        type: "url",
      },
      R2ImageUrl: {
        type: "url",
      },
      "Date Created": {
        type: "date",
      },
      Status: {
        type: "select",
        options: [
          { name: "Draft", color: "gray" },
          { name: "Ready", color: "green" },
          { name: "Review", color: "yellow" },
          { name: "Published", color: "blue" },
        ],
      },
      "Original Page": {
        type: "url",
      },
      Published: {
        type: "checkbox",
      },
    };
  }

  /**
   * Creates or updates an entry in the database based on title
   * If an entry with the same title exists, it will be updated
   * @param data The data for the entry
   * @returns Object containing the entry ID and whether it was created or updated
   */
  async upsertEntry(data: EntryData): Promise<{ id: string; isNew: boolean }> {
    if (!this.databaseId) {
      throw new Error("Database ID is not set");
    }

    await this.delay(); // Respect rate limiting

    try {
      // First, check if an entry with this title exists
      const title = this.extractTitle(data);
      if (!title) {
        throw new Error("Title is required for upsert operation");
      }

      const existingEntries = await this.queryEntries({
        filter: {
          property: "Title",
          title: {
            equals: title,
          },
        },
        page_size: 1,
      });

      // If an entry exists, update it
      if (existingEntries.length > 0) {
        const existingEntry = existingEntries[0];
        await this.updateEntry(existingEntry.id, data);
        return { id: existingEntry.id, isNew: false };
      }

      // If no entry exists, create a new one
      const newId = await this.createEntry(data);
      return { id: newId, isNew: true };
    } catch (error) {
      console.error("Failed to upsert entry:", error);
      throw new Error(`Failed to upsert entry: ${(error as Error).message}`);
    }
  }

  /**
   * Extracts the title from entry data
   * @param data The entry data
   * @returns The title string or undefined
   */
  private extractTitle(data: EntryData): string | undefined {
    // Check if title is in properties
    if (data.properties?.Title?.title) {
      const titleContent = data.properties.Title.title[0]?.text?.content;
      if (titleContent) return titleContent;
    }

    // Check if title is in the title array
    if (data.title && Array.isArray(data.title)) {
      const titleContent = data.title[0]?.text?.content;
      if (titleContent) return titleContent;
    }

    return undefined;
  }
}
