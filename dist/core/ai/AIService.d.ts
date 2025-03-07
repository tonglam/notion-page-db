import { AIConfig, ImageOptions, ImageResult, SummaryOptions } from '../../types';
import { IAIService } from './AIService.interface';
/**
 * Implementation of the AIService using OpenAI
 * Handles AI-powered content enhancement and image generation
 */
export declare class AIService implements IAIService {
    private openai;
    private config;
    private modelName;
    private imageModel;
    /**
     * Creates a new AIService instance
     * @param config The AI service configuration
     */
    constructor(config: AIConfig);
    /**
     * Generates a summary of the text content
     * @param content The content to summarize
     * @param options Options for summary generation
     */
    generateSummary(content: string, options?: SummaryOptions): Promise<string>;
    /**
     * Generates an optimized title based on content
     * @param content The content to base the title on
     * @param currentTitle The current title, if any
     * @param maxLength Maximum length of the title
     */
    generateTitle(content: string, currentTitle?: string, maxLength?: number): Promise<string>;
    /**
     * Generates keywords and tags from content
     * @param content The content to extract keywords from
     * @param maxKeywords Maximum number of keywords to extract
     */
    generateKeywords(content: string, maxKeywords?: number): Promise<string[]>;
    /**
     * Generates an image for the content
     * @param prompt The text prompt to generate the image from
     * @param options Options for image generation
     */
    generateImage(prompt: string, options?: ImageOptions): Promise<ImageResult>;
    /**
     * Validates the content based on business rules
     * @param content The content to validate
     * @param rules The validation rules to apply
     */
    validateContent(content: string, rules: string[]): Promise<boolean>;
    /**
     * Downloads an image from a URL to a local path
     * @param url URL of the image to download
     * @param localPath Path to save the image to
     */
    private downloadImage;
}
