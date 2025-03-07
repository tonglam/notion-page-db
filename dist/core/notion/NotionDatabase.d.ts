import { DatabaseSchema, EntryData, NotionConfig, NotionEntry, QueryFilter } from '../../types';
import { INotionDatabase } from './NotionDatabase.interface';
/**
 * Implementation of the NotionDatabase service
 */
export declare class NotionDatabase implements INotionDatabase {
    private client;
    private databaseId;
    private rateLimitDelay;
    /**
     * Creates a new NotionDatabase instance
     * @param config The Notion configuration
     */
    constructor(config: NotionConfig);
    /**
     * Verifies that the database exists
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
    /**
     * Transforms a query filter to Notion's filter format
     * @param filter The filter to transform
     */
    private transformFilter;
    /**
     * Transforms data to Notion's property format
     * @param data The data to transform
     */
    private transformDataToProperties;
    /**
     * Creates a property definition for Notion's database
     * @param definition The property definition
     */
    private createPropertyDefinition;
    /**
     * Delays execution to respect API rate limits
     */
    private delay;
}
