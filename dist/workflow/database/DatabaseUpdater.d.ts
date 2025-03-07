import { INotionDatabase } from '../../core/notion/NotionDatabase.interface';
import { ContentPage, NotionEntry, UpdateResult } from '../../types';
/**
 * Database Updater
 * Updates the Notion database with processed content
 */
export declare class DatabaseUpdater {
    private notionDatabase;
    private databaseId;
    private existingEntries;
    /**
     * Creates a new DatabaseUpdater instance
     * @param notionDatabase The Notion database service
     * @param databaseId ID of the database to update
     */
    constructor(notionDatabase: INotionDatabase, databaseId: string);
    /**
     * Initializes the updater by fetching existing entries
     */
    initialize(): Promise<void>;
    /**
     * Updates or creates an entry in the database
     * @param contentPage The content page to update or create
     */
    updateEntry(contentPage: ContentPage): Promise<UpdateResult>;
    /**
     * Updates multiple entries in the database
     * @param contentPages The content pages to update
     */
    updateEntries(contentPages: ContentPage[]): Promise<UpdateResult[]>;
    /**
     * Gets an existing entry by ID or URL
     * @param idOrUrl ID or URL of the entry to get
     */
    getExistingEntry(idOrUrl: string): NotionEntry | undefined;
    /**
     * Gets all existing entries
     */
    getAllExistingEntries(): NotionEntry[];
}
