"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentProcessor = void 0;
/**
 * Content Processor
 * Handles the extraction and processing of content from Notion pages
 */
class ContentProcessor {
    /**
     * Creates a new ContentProcessor instance
     * @param notionContent The Notion content service
     * @param aiService The AI service for content enhancement
     * @param sourcePageId The source page ID to extract content from
     */
    constructor(notionContent, aiService, sourcePageId) {
        this.notionContent = notionContent;
        this.aiService = aiService;
        this.sourcePageId = sourcePageId;
        this.processedContent = new Map();
    }
    /**
     * Fetches content from the source page
     * Extracts categories and valid content pages
     */
    async fetchContent() {
        try {
            console.log(`Fetching content from page: ${this.sourcePageId}`);
            // Extract categories
            const categories = await this.notionContent.extractCategories(this.sourcePageId);
            if (categories.length === 0) {
                return {
                    success: false,
                    error: 'No categories found in the source page',
                };
            }
            console.log(`Found ${categories.length} categories`);
            // Extract content pages
            const contentPages = await this.notionContent.extractValidContent(this.sourcePageId);
            if (contentPages.length === 0) {
                return {
                    success: false,
                    error: 'No valid content pages found',
                    categories,
                };
            }
            console.log(`Found ${contentPages.length} content pages`);
            // Store content pages in the map for later use
            contentPages.forEach((page) => {
                this.processedContent.set(page.id, page);
            });
            return {
                success: true,
                categories,
                contentPages,
            };
        }
        catch (error) {
            console.error('Error fetching content:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Enhances content with AI services
     * @param pageId ID of the page to enhance
     * @param enhanceImages Whether to generate images for the content
     */
    async enhanceContent(pageId, enhanceImages = false) {
        try {
            // Check if the page is already processed
            const existingPage = this.processedContent.get(pageId);
            if (!existingPage) {
                console.error(`Page with ID ${pageId} not found in processed content`);
                return null;
            }
            console.log(`Enhancing content for page: ${existingPage.title}`);
            // Generate a better title if the current one is generic
            if (existingPage.title.toLowerCase().includes('untitled') ||
                existingPage.title.length < 10) {
                const enhancedTitle = await this.aiService.generateTitle(existingPage.content, existingPage.title);
                console.log(`Enhanced title: ${enhancedTitle}`);
                existingPage.title = enhancedTitle;
            }
            // Generate a summary for the content
            if (!existingPage.summary || existingPage.summary.length < 10) {
                const summary = await this.aiService.generateSummary(existingPage.content, {
                    maxLength: 250,
                    style: 'detailed',
                });
                console.log(`Generated summary (${summary.length} chars)`);
                existingPage.summary = summary;
            }
            // Generate an excerpt for the content
            if (!existingPage.excerpt || existingPage.excerpt.length < 10) {
                const excerpt = this.notionContent.generateExcerpt(existingPage.content, 150);
                console.log(`Generated excerpt (${excerpt.length} chars)`);
                existingPage.excerpt = excerpt;
            }
            // Extract or generate tags
            if (!existingPage.tags || existingPage.tags.length === 0) {
                const tags = this.notionContent.extractTags(existingPage.content, existingPage.title, existingPage.category);
                console.log(`Generated ${tags.length} tags`);
                existingPage.tags = tags;
            }
            // Estimate reading time
            if (!existingPage.minsRead || existingPage.minsRead === 0) {
                const readingTime = this.notionContent.estimateReadingTime(existingPage.content);
                console.log(`Estimated reading time: ${readingTime} minutes`);
                existingPage.minsRead = readingTime;
            }
            // Generate image if needed and requested
            if (enhanceImages && !existingPage.imageUrl) {
                console.log('Generating image for content...');
                // Create an image prompt based on the content
                const imagePrompt = `Create a professional, striking image for an article titled "${existingPage.title}" about ${existingPage.category}. The article discusses: ${existingPage.summary?.substring(0, 200)}`;
                // Generate the image
                const imageResult = await this.aiService.generateImage(imagePrompt, {
                    size: '1024x1024',
                    style: 'vivid',
                    quality: 'standard',
                });
                if (imageResult.success && imageResult.url) {
                    console.log(`Generated image: ${imageResult.url}`);
                    existingPage.imageUrl = imageResult.url;
                }
                else {
                    console.error('Failed to generate image:', imageResult.error);
                }
            }
            // Update the processed content map
            this.processedContent.set(pageId, existingPage);
            return existingPage;
        }
        catch (error) {
            console.error('Error enhancing content:', error);
            return null;
        }
    }
    /**
     * Enhances all content pages
     * @param enhanceImages Whether to generate images for the content
     */
    async enhanceAllContent(enhanceImages = false) {
        const enhancedPages = [];
        // Use Array.from to convert the keys iterator to an array
        const pageIds = Array.from(this.processedContent.keys());
        for (const pageId of pageIds) {
            const enhancedPage = await this.enhanceContent(pageId, enhanceImages);
            if (enhancedPage) {
                enhancedPages.push(enhancedPage);
            }
        }
        return enhancedPages;
    }
    /**
     * Gets all processed content pages
     */
    getAllContentPages() {
        return Array.from(this.processedContent.values());
    }
    /**
     * Gets a specific content page by ID
     * @param pageId ID of the page to get
     */
    getContentPage(pageId) {
        return this.processedContent.get(pageId) || null;
    }
}
exports.ContentProcessor = ContentProcessor;
//# sourceMappingURL=ContentProcessor.js.map