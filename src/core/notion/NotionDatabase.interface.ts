import { Client } from "@notionhq/client";
import {
  DatabaseSchema,
  EntryData,
  NotionEntry,
  QueryFilter,
} from "../../types";

/**
 * Interface for the NotionDatabase component
 * Manages all interactions with the Notion database API
 */
export interface INotionDatabase {
  /**
   * The Notion API client instance
   */
  client: Client;

  /**
   * Gets the current database ID
   * @returns The current database ID or undefined
   */
  getDatabaseId(): string | undefined;

  /**
   * Sets the database ID after resolution
   * @param databaseId The resolved database ID
   */
  setDatabaseId(databaseId: string): void;

  /**
   * Finds a database by name from user's Notion workspace
   * @returns The database ID if found, otherwise undefined
   */
  findDatabaseByName(): Promise<string | undefined>;

  /**
   * Verifies that the database exists and has the correct schema
   */
  verifyDatabase(): Promise<boolean>;

  /**
   * Initializes the database by finding it by name or creating it if needed
   * @param parentPageId The parent page ID to create the database under if needed
   * @param schema Optional schema to use when creating the database
   * @returns The database ID
   */
  initializeDatabase(
    parentPageId?: string,
    schema?: DatabaseSchema
  ): Promise<string>;

  /**
   * Creates a new database with the specified schema
   * @param schema The database schema to create
   * @param parentPageId The parent page ID to create the database under
   */
  createDatabase(schema: DatabaseSchema, parentPageId: string): Promise<string>;

  /**
   * Creates or updates an entry in the database based on title
   * If an entry with the same title exists, it will be updated
   * @param data The data for the entry
   * @returns Object containing the entry ID and whether it was created or updated
   */
  upsertEntry(data: EntryData): Promise<{ id: string; isNew: boolean }>;

  /**
   * Queries entries from the database
   * @param filter Optional filter for the query
   */
  queryEntries(filter?: QueryFilter): Promise<NotionEntry[]>;

  /**
   * Creates a new entry in the database
   * @param data The data for the new entry
   */
  createEntry(data: EntryData): Promise<string>;

  /**
   * Updates an existing entry in the database
   * @param pageId The ID of the page to update
   * @param data The data to update
   */
  updateEntry(pageId: string, data: Partial<EntryData>): Promise<void>;

  /**
   * Batch updates multiple entries
   * @param entries Array of entries to update
   */
  batchUpdateEntries(
    entries: Array<{ id: string; data: Partial<EntryData> }>
  ): Promise<void>;
}
