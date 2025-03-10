import { ContentPage, Status, SummaryOptions } from "../../types";
import { IAIService } from "../ai/AIService.interface";

/**
 * Service for enhancing content pages with additional metadata
 */
export class ContentEnhancer {
  constructor(private aiService: IAIService) {}

  /**
   * Enhances a content page with generated metadata
   */
  async enhanceContent(page: ContentPage): Promise<ContentPage> {
    const enhanced = { ...page };

    // Generate summary if not present
    if (!enhanced.summary) {
      try {
        enhanced.summary = await this.generateSummary(page.content);
      } catch (error) {
        console.error(`Error generating summary for page ${page.id}:`, error);
        // Keep field empty instead of using placeholder
      }
    }

    // Generate excerpt if not present
    if (!enhanced.excerpt) {
      try {
        enhanced.excerpt = this.generateExcerpt(page.content);
      } catch (error) {
        console.error(`Error generating excerpt for page ${page.id}:`, error);
        // Keep field empty instead of using placeholder
      }
    }

    // Extract or generate tags
    if (!enhanced.tags || enhanced.tags.length === 0) {
      try {
        enhanced.tags = await this.generateTags(
          page.content,
          page.title,
          page.category
        );
      } catch (error) {
        console.error(`Error generating tags for page ${page.id}:`, error);
        enhanced.tags = []; // Initialize as empty array rather than null
      }
    }

    // Calculate reading time
    if (!enhanced.minsRead) {
      try {
        enhanced.minsRead = this.calculateReadingTime(page.content);
      } catch (error) {
        console.error(
          `Error calculating reading time for page ${page.id}:`,
          error
        );
        // Keep field empty instead of using placeholder
      }
    }

    // Set default status if not present
    if (!enhanced.status) {
      enhanced.status = Status.Draft;
    }

    return enhanced;
  }

  /**
   * Generates a summary of the content using AI
   */
  private async generateSummary(content: string): Promise<string> {
    const options: SummaryOptions = {
      maxLength: 250,
      style: "detailed",
    };
    return this.aiService.generateSummary(content, options);
  }

  /**
   * Generates an excerpt from the content
   */
  private generateExcerpt(content: string, maxLength: number = 150): string {
    const firstParagraph = content.split("\n\n")[0] || "";
    if (firstParagraph.length <= maxLength) return firstParagraph;
    return firstParagraph.substring(0, maxLength) + "...";
  }

  /**
   * Generates tags for the content using AI
   */
  private async generateTags(
    content: string,
    title: string,
    category?: string
  ): Promise<string[]> {
    // Start with basic tags
    const tags = new Set<string>();

    // Always include category as a tag if present
    if (category) {
      tags.add(category);
    }

    // Generate additional tags using AI
    const aiTags = await this.aiService.generateKeywords(content, 5);
    aiTags.forEach((tag) => tags.add(tag));

    return Array.from(tags);
  }

  /**
   * Calculates estimated reading time in minutes
   */
  private calculateReadingTime(content: string): number {
    const wordsPerMinute = 200;
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / wordsPerMinute);
    return Math.max(1, minutes); // Minimum 1 minute
  }
}
