import { Category, ContentPage, NotionConfig, PageContent } from '../../types';
import { INotionContent } from './NotionContent.interface';
/**
 * Implementation of the NotionContent service
 * Handles content extraction and transformation from Notion pages
 */
export declare class NotionContent implements INotionContent {
    private client;
    private rateLimitDelay;
    private contentCache;
    private categoryCache;
    /**
     * Creates a new NotionContent instance
     * @param config The Notion configuration
     */
    constructor(config: NotionConfig);
    /**
     * Fetches content from a Notion page
     * @param pageId ID of the page to fetch
     */
    fetchPageContent(pageId: string): Promise<PageContent>;
    /**
     * Extracts categories from a page
     * @param pageId ID of the page to extract categories from
     */
    extractCategories(pageId: string): Promise<Category[]>;
    /**
     * Extracts valid content pages
     * @param pageId ID of the page to extract content from
     */
    extractValidContent(pageId: string): Promise<ContentPage[]>;
    /**
     * Generates an excerpt from content
     * @param content Content to generate excerpt from
     * @param maxLength Maximum length of the excerpt
     */
    generateExcerpt(content: string, maxLength?: number): string;
    /**
     * Extracts tags from content
     * @param content Content to extract tags from
     * @param title Title of the content
     * @param category Optional category of the content
     */
    extractTags(content: string, title: string, category?: string): string[];
    /**
     * Estimates reading time for content
     * @param content Content to estimate reading time for
     */
    estimateReadingTime(content: string): number;
    /**
     * Fetches blocks from a page
     * @param pageId ID of the page to fetch blocks from
     */
    private fetchBlocks;
    /**
     * Recursively fetches nested blocks
     * @param blocks Blocks to check for children
     */
    private fetchNestedBlocks;
    /**
     * Transforms a Notion block to our Block type
     * @param block The Notion block to transform
     */
    private transformBlock;
    /**
     * Extracts text content from rich text
     * @param richText Rich text to extract content from
     */
    private extractTextContent;
    /**
     * Converts blocks to plain text
     * @param blocks Blocks to convert
     */
    private convertBlocksToText;
    /**
     * Delays execution to respect API rate limits
     */
    private delay;
}
