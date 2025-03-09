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
   * @returns The database ID
   */
  initializeDatabase(parentPageId?: string): Promise<string>;

  /**
   * Creates a new database with the specified schema
   * @param schema The database schema to create
   * @param parentPageId The parent page ID to create the database under
   */
  createDatabase(schema: DatabaseSchema, parentPageId: string): Promise<string>;

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
