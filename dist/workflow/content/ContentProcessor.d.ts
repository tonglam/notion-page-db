import { IAIService } from '../../core/ai/AIService.interface';
import { INotionContent } from '../../core/notion/NotionContent.interface';
import { ContentPage, FetchResult } from '../../types';
/**
 * Content Processor
 * Handles the extraction and processing of content from Notion pages
 */
export declare class ContentProcessor {
    private notionContent;
    private aiService;
    private sourcePageId;
    private processedContent;
    /**
     * Creates a new ContentProcessor instance
     * @param notionContent The Notion content service
     * @param aiService The AI service for content enhancement
     * @param sourcePageId The source page ID to extract content from
     */
    constructor(notionContent: INotionContent, aiService: IAIService, sourcePageId: string);
    /**
     * Fetches content from the source page
     * Extracts categories and valid content pages
     */
    fetchContent(): Promise<FetchResult>;
    /**
     * Enhances content with AI services
     * @param pageId ID of the page to enhance
     * @param enhanceImages Whether to generate images for the content
     */
    enhanceContent(pageId: string, enhanceImages?: boolean): Promise<ContentPage | null>;
    /**
     * Enhances all content pages
     * @param enhanceImages Whether to generate images for the content
     */
    enhanceAllContent(enhanceImages?: boolean): Promise<ContentPage[]>;
    /**
     * Gets all processed content pages
     */
    getAllContentPages(): ContentPage[];
    /**
     * Gets a specific content page by ID
     * @param pageId ID of the page to get
     */
    getContentPage(pageId: string): ContentPage | null;
}
