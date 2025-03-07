import { DatabaseSchema, EntryData, NotionEntry, QueryFilter } from '../../types';
/**
 * Interface for the NotionDatabase component
 * Manages all interactions with the Notion database API
 */
export interface INotionDatabase {
    /**
     * Verifies that the database exists and has the correct schema
     */
    verifyDatabase(): Promise<boolean>;
    /**
     * Creates a new database with the specified schema
     * @param schema The database schema to create
     */
    createDatabase(schema: DatabaseSchema): Promise<string>;
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
    batchUpdateEntries(entries: Array<{
        id: string;
        data: Partial<EntryData>;
    }>): Promise<void>;
}
