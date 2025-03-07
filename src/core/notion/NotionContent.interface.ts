import { Category, ContentPage, PageContent } from '../../types';

/**
 * Interface for the NotionContent component
 * Handles content extraction and transformation from Notion pages
 */
export interface INotionContent {
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
}
