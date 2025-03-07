"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionContent = void 0;
const client_1 = require("@notionhq/client");
/**
 * Implementation of the NotionContent service
 * Handles content extraction and transformation from Notion pages
 */
class NotionContent {
    /**
     * Creates a new NotionContent instance
     * @param config The Notion configuration
     */
    constructor(config) {
        this.client = new client_1.Client({ auth: config.apiKey });
        this.rateLimitDelay = config.rateLimitDelay || 350;
        this.contentCache = new Map();
        this.categoryCache = new Map();
    }
    /**
     * Fetches content from a Notion page
     * @param pageId ID of the page to fetch
     */
    async fetchPageContent(pageId) {
        // Check cache first
        if (this.contentCache.has(pageId)) {
            return this.contentCache.get(pageId);
        }
        // Fetch the page
        await this.delay();
        const page = (await this.client.pages.retrieve({
            page_id: pageId,
        }));
        // Get the page title
        let title = 'Untitled';
        if (page.properties && 'title' in page.properties) {
            const titleProperty = page.properties.title;
            if ('title' in titleProperty &&
                Array.isArray(titleProperty.title) &&
                titleProperty.title.length > 0) {
                title = titleProperty.title.map((item) => item.plain_text).join('');
            }
        }
        // Fetch blocks
        const blocks = await this.fetchBlocks(pageId);
        // Create the page content
        const pageContent = {
            title,
            blocks,
            properties: page.properties,
            createdTime: page.created_time,
            lastEditedTime: page.last_edited_time,
        };
        // Cache the result
        this.contentCache.set(pageId, pageContent);
        return pageContent;
    }
    /**
     * Extracts categories from a page
     * @param pageId ID of the page to extract categories from
     */
    async extractCategories(pageId) {
        // Check cache first
        if (this.categoryCache.has(pageId)) {
            return this.categoryCache.get(pageId);
        }
        // Fetch blocks to find child pages
        const blocks = await this.fetchBlocks(pageId);
        const categories = [];
        // Find child pages/subpages as categories
        for (const block of blocks) {
            if (block.type === 'child_page' && block.hasChildren) {
                // Determine if this is a regular category or MIT unit
                const isMITUnit = block.content?.title?.toLowerCase().includes('mit') || false;
                categories.push({
                    id: block.id,
                    name: block.content?.title || 'Untitled',
                    type: isMITUnit ? 'mit' : 'regular',
                });
            }
        }
        // Cache the results
        this.categoryCache.set(pageId, categories);
        return categories;
    }
    /**
     * Extracts valid content pages
     * @param pageId ID of the page to extract content from
     */
    async extractValidContent(pageId) {
        const contentPages = [];
        const categories = await this.extractCategories(pageId);
        // Process each category
        for (const category of categories) {
            // Get the blocks within this category
            const blocks = await this.fetchBlocks(category.id);
            // Find child pages in this category
            for (const block of blocks) {
                if (block.type === 'child_page') {
                    // Get the content of this page
                    const pageContent = await this.fetchPageContent(block.id);
                    const textContent = this.convertBlocksToText(pageContent.blocks);
                    // Create a ContentPage object
                    contentPages.push({
                        id: block.id,
                        title: pageContent.title,
                        parentId: category.id,
                        category: category.type === 'mit' ? `CITS${category.name}` : category.name,
                        content: textContent,
                        createdTime: pageContent.createdTime,
                        lastEditedTime: pageContent.lastEditedTime,
                    });
                }
            }
        }
        return contentPages;
    }
    /**
     * Generates an excerpt from content
     * @param content Content to generate excerpt from
     * @param maxLength Maximum length of the excerpt
     */
    generateExcerpt(content, maxLength = 200) {
        if (!content)
            return '';
        // Remove extra whitespace
        const cleanContent = content.replace(/\s+/g, ' ').trim();
        // Check if content is already shorter than max length
        if (cleanContent.length <= maxLength) {
            return cleanContent;
        }
        // Try to find a sentence break near the max length
        const sentenceBreak = cleanContent.slice(0, maxLength).lastIndexOf('.');
        if (sentenceBreak !== -1 && sentenceBreak > maxLength / 2) {
            return cleanContent.slice(0, sentenceBreak + 1);
        }
        // Fall back to word boundary
        const wordBreak = cleanContent.slice(0, maxLength).lastIndexOf(' ');
        if (wordBreak !== -1) {
            return cleanContent.slice(0, wordBreak) + '...';
        }
        // Last resort: just cut at maxLength
        return cleanContent.slice(0, maxLength) + '...';
    }
    /**
     * Extracts tags from content
     * @param content Content to extract tags from
     * @param title Title of the content
     * @param category Optional category of the content
     */
    extractTags(content, title, category) {
        const tags = new Set();
        // Add category as a tag if present
        if (category) {
            tags.add(category);
        }
        // Extract keywords from title
        const titleWords = title
            .split(/\s+/)
            .filter((word) => word.length > 3)
            .map((word) => word.toLowerCase());
        for (const word of titleWords) {
            tags.add(word);
        }
        // Extract keywords from content
        // This is a simple implementation - in a real system, you would use
        // more sophisticated techniques like TF-IDF or NLP
        const contentKeywords = content
            .split(/\s+/)
            .filter((word) => word.length > 5)
            .filter((word) => /^[A-Za-z]+$/.test(word)) // Only alphabetic
            .map((word) => word.toLowerCase());
        // Count keyword frequencies
        const keywordCounts = new Map();
        for (const word of contentKeywords) {
            keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1);
        }
        // Get the top keywords by frequency
        const topKeywords = Array.from(keywordCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word]) => word);
        for (const word of topKeywords) {
            tags.add(word);
        }
        // Convert to array and limit to 10 tags
        return Array.from(tags).slice(0, 10);
    }
    /**
     * Estimates reading time for content
     * @param content Content to estimate reading time for
     */
    estimateReadingTime(content) {
        if (!content)
            return 0;
        // Average reading speed: 200 words per minute
        const wordsPerMinute = 200;
        const wordCount = content.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / wordsPerMinute);
        // Return at least 1 minute
        return Math.max(1, readingTime);
    }
    /**
     * Fetches blocks from a page
     * @param pageId ID of the page to fetch blocks from
     */
    async fetchBlocks(pageId) {
        await this.delay();
        const blocks = [];
        let hasMore = true;
        let startCursor = undefined;
        while (hasMore) {
            await this.delay();
            const response = await this.client.blocks.children.list({
                block_id: pageId,
                start_cursor: startCursor,
            });
            const transformedBlocks = response.results.map((block) => this.transformBlock(block));
            blocks.push(...transformedBlocks);
            hasMore = response.has_more && !!response.next_cursor;
            startCursor = response.next_cursor || undefined;
        }
        // Recursively fetch nested blocks
        const blocksWithChildren = await this.fetchNestedBlocks(blocks);
        return blocksWithChildren;
    }
    /**
     * Recursively fetches nested blocks
     * @param blocks Blocks to check for children
     */
    async fetchNestedBlocks(blocks) {
        const result = [];
        for (const block of blocks) {
            if (block.hasChildren) {
                // Fetch child blocks
                const childBlocks = await this.fetchBlocks(block.id);
                // Add the block with its children
                result.push({
                    ...block,
                    content: {
                        ...block.content,
                        children: childBlocks,
                    },
                });
            }
            else {
                // Add the block without changes
                result.push(block);
            }
        }
        return result;
    }
    /**
     * Transforms a Notion block to our Block type
     * @param block The Notion block to transform
     */
    transformBlock(block) {
        const blockType = block.type;
        const hasChildren = block.has_children || false;
        let content = {};
        // Handle different block types
        if (blockType === 'paragraph') {
            content = this.extractTextContent(block.paragraph?.rich_text);
        }
        else if (blockType === 'heading_1') {
            content = this.extractTextContent(block.heading_1?.rich_text);
        }
        else if (blockType === 'heading_2') {
            content = this.extractTextContent(block.heading_2?.rich_text);
        }
        else if (blockType === 'heading_3') {
            content = this.extractTextContent(block.heading_3?.rich_text);
        }
        else if (blockType === 'bulleted_list_item') {
            content = this.extractTextContent(block.bulleted_list_item?.rich_text);
        }
        else if (blockType === 'numbered_list_item') {
            content = this.extractTextContent(block.numbered_list_item?.rich_text);
        }
        else if (blockType === 'to_do') {
            content = {
                text: this.extractTextContent(block.to_do?.rich_text),
                checked: block.to_do?.checked || false,
            };
        }
        else if (blockType === 'code') {
            content = {
                text: this.extractTextContent(block.code?.rich_text),
                language: block.code?.language || 'plain text',
            };
        }
        else if (blockType === 'image') {
            content = {
                type: block.image?.type,
                url: block.image?.file?.url || block.image?.external?.url,
                caption: this.extractTextContent(block.image?.caption),
            };
        }
        else if (blockType === 'child_page') {
            content = {
                title: block.child_page?.title || 'Untitled',
            };
        }
        else {
            // Generic handling for other block types
            content = { type: blockType };
        }
        return {
            id: block.id,
            type: blockType,
            content,
            hasChildren,
        };
    }
    /**
     * Extracts text content from rich text
     * @param richText Rich text to extract content from
     */
    extractTextContent(richText) {
        if (!richText || !Array.isArray(richText)) {
            return '';
        }
        return richText.map((item) => item.plain_text).join('');
    }
    /**
     * Converts blocks to plain text
     * @param blocks Blocks to convert
     */
    convertBlocksToText(blocks) {
        let text = '';
        for (const block of blocks) {
            if (block.type === 'paragraph') {
                text += block.content + '\n\n';
            }
            else if (block.type === 'heading_1') {
                text += block.content + '\n\n';
            }
            else if (block.type === 'heading_2') {
                text += block.content + '\n\n';
            }
            else if (block.type === 'heading_3') {
                text += block.content + '\n\n';
            }
            else if (block.type === 'bulleted_list_item') {
                text += '• ' + block.content + '\n';
            }
            else if (block.type === 'numbered_list_item') {
                text += '1. ' + block.content + '\n';
            }
            else if (block.type === 'to_do') {
                const checkbox = block.content.checked ? '[x]' : '[ ]';
                text += checkbox + ' ' + block.content.text + '\n';
            }
            else if (block.type === 'code') {
                text += '```' + block.content.language + '\n';
                text += block.content.text + '\n';
                text += '```\n\n';
            }
            // Recursively process children
            if (block.content?.children) {
                text += this.convertBlocksToText(block.content.children);
            }
        }
        return text;
    }
    /**
     * Delays execution to respect API rate limits
     */
    async delay() {
        return new Promise((resolve) => setTimeout(resolve, this.rateLimitDelay));
    }
}
exports.NotionContent = NotionContent;
//# sourceMappingURL=NotionContent.js.map