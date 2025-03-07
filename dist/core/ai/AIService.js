"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs-extra"));
const openai_1 = __importDefault(require("openai"));
const path = __importStar(require("path"));
/**
 * Implementation of the AIService using OpenAI
 * Handles AI-powered content enhancement and image generation
 */
class AIService {
    /**
     * Creates a new AIService instance
     * @param config The AI service configuration
     */
    constructor(config) {
        this.config = config;
        this.openai = new openai_1.default({
            apiKey: config.apiKey,
        });
        this.modelName = config.model || 'gpt-3.5-turbo';
        this.imageModel = config.imageModel || 'dall-e-3';
    }
    /**
     * Generates a summary of the text content
     * @param content The content to summarize
     * @param options Options for summary generation
     */
    async generateSummary(content, options) {
        const maxLength = options?.maxLength || 250;
        const style = options?.style || 'concise';
        // Create the prompt based on style
        let prompt = '';
        if (style === 'concise') {
            prompt = `Summarize the following content concisely in ${maxLength} characters or less:\n\n${content}`;
        }
        else if (style === 'detailed') {
            prompt = `Create a detailed summary of the following content, highlighting key points, in ${maxLength} characters or less:\n\n${content}`;
        }
        else if (style === 'technical') {
            prompt = `Create a technical summary of the following content, focusing on technical aspects and using appropriate terminology, in ${maxLength} characters or less:\n\n${content}`;
        }
        else {
            prompt = `Summarize the following content in a casual, conversational style in ${maxLength} characters or less:\n\n${content}`;
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional content summarizer.',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: Math.ceil(maxLength / 4), // Approximate token count
                temperature: 0.7,
            });
            const summary = response.choices[0]?.message?.content?.trim() || '';
            // Ensure the summary is within the maxLength constraint
            return summary.length > maxLength
                ? summary.substring(0, maxLength - 3) + '...'
                : summary;
        }
        catch (error) {
            console.error('Error generating summary:', error);
            // Fallback to a simple summary if AI fails
            return content.substring(0, maxLength - 3) + '...';
        }
    }
    /**
     * Generates an optimized title based on content
     * @param content The content to base the title on
     * @param currentTitle The current title, if any
     * @param maxLength Maximum length of the title
     */
    async generateTitle(content, currentTitle, maxLength = 70) {
        // Truncate content if too long
        const truncatedContent = content.length > 2000 ? content.substring(0, 2000) + '...' : content;
        let prompt = '';
        if (currentTitle) {
            prompt = `Based on the following content, suggest an improved, engaging title that is SEO-friendly. The current title is "${currentTitle}", but feel free to suggest a completely different title if appropriate. Title should be no longer than ${maxLength} characters:\n\n${truncatedContent}`;
        }
        else {
            prompt = `Create an engaging, SEO-friendly title for the following content, no longer than ${maxLength} characters:\n\n${truncatedContent}`;
        }
        try {
            const response = await this.openai.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a professional headline writer and SEO expert.',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 50, // Titles are short
                temperature: 0.8, // Allow some creativity
            });
            let title = response.choices[0]?.message?.content?.trim() || '';
            // Remove quotes if present (AI often puts titles in quotes)
            title = title.replace(/^['"](.*)['"]$/, '$1');
            // Ensure the title is within length constraints
            return title.length > maxLength
                ? title.substring(0, maxLength - 3) + '...'
                : title;
        }
        catch (error) {
            console.error('Error generating title:', error);
            // Fallback to current title or a generic one
            return currentTitle || 'Untitled';
        }
    }
    /**
     * Generates keywords and tags from content
     * @param content The content to extract keywords from
     * @param maxKeywords Maximum number of keywords to extract
     */
    async generateKeywords(content, maxKeywords = 10) {
        // Truncate content if too long
        const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '...' : content;
        const prompt = `Extract ${maxKeywords} relevant keywords or keyphrases from the following content. Provide them as a comma-separated list. Focus on terms that would work well as tags or for SEO:\n\n${truncatedContent}`;
        try {
            const response = await this.openai.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are an SEO expert and keyword analyst.',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 150,
                temperature: 0.5, // Lower temperature for more focused responses
            });
            const keywordsText = response.choices[0]?.message?.content?.trim() || '';
            // Split by commas and clean up each keyword
            const keywords = keywordsText
                .split(/,\s*/)
                .map((keyword) => keyword.trim())
                .filter((keyword) => keyword.length > 0)
                .slice(0, maxKeywords);
            return keywords;
        }
        catch (error) {
            console.error('Error generating keywords:', error);
            // Fallback to simple word extraction
            return content
                .split(/\s+/)
                .filter((word) => word.length > 5)
                .slice(0, maxKeywords);
        }
    }
    /**
     * Generates an image for the content
     * @param prompt The text prompt to generate the image from
     * @param options Options for image generation
     */
    async generateImage(prompt, options) {
        const size = options?.size || '1024x1024';
        const style = options?.style || 'vivid';
        const quality = options?.quality || 'standard';
        try {
            const response = await this.openai.images.generate({
                model: this.imageModel,
                prompt: prompt,
                n: 1,
                size: size,
                style: style,
                quality: quality,
                response_format: 'url',
            });
            const imageUrl = response.data[0]?.url;
            if (!imageUrl) {
                throw new Error('No image URL returned from API');
            }
            // Download the image if a local path is specified
            if (options?.localPath) {
                const localPath = await this.downloadImage(imageUrl, options.localPath);
                return {
                    url: imageUrl,
                    localPath,
                    prompt,
                    success: true,
                };
            }
            return {
                url: imageUrl,
                prompt,
                success: true,
            };
        }
        catch (error) {
            console.error('Error generating image:', error);
            return {
                url: '',
                prompt,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Validates the content based on business rules
     * @param content The content to validate
     * @param rules The validation rules to apply
     */
    async validateContent(content, rules) {
        // Truncate content if too long
        const truncatedContent = content.length > 3000 ? content.substring(0, 3000) + '...' : content;
        // Format rules into a readable string
        const rulesText = rules
            .map((rule, index) => `Rule ${index + 1}: ${rule}`)
            .join('\n');
        const prompt = `Validate if the following content complies with all the rules specified. Respond with ONLY "true" if all rules are satisfied, or "false" if any rule is violated.\n\nRULES:\n${rulesText}\n\nCONTENT:\n${truncatedContent}`;
        try {
            const response = await this.openai.chat.completions.create({
                model: this.modelName,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a content validator checking if text complies with specified rules. You respond with ONLY "true" or "false".',
                    },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 10,
                temperature: 0.1, // Very low temperature for consistent responses
            });
            const result = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
            return result === 'true';
        }
        catch (error) {
            console.error('Error validating content:', error);
            // Conservative approach: if validation fails, assume content doesn't meet rules
            return false;
        }
    }
    /**
     * Downloads an image from a URL to a local path
     * @param url URL of the image to download
     * @param localPath Path to save the image to
     */
    async downloadImage(url, localPath) {
        try {
            // Create directory if it doesn't exist
            await fs.ensureDir(path.dirname(localPath));
            // Download the image
            const response = await (0, axios_1.default)({
                url,
                method: 'GET',
                responseType: 'stream',
            });
            // Create write stream and save
            const writer = fs.createWriteStream(localPath);
            response.data.pipe(writer);
            // Return a promise that resolves when the file is saved
            return new Promise((resolve, reject) => {
                writer.on('finish', () => resolve(localPath));
                writer.on('error', reject);
            });
        }
        catch (error) {
            console.error('Error downloading image:', error);
            throw error;
        }
    }
}
exports.AIService = AIService;
//# sourceMappingURL=AIService.js.map