import axios from 'axios';
import * as fs from 'fs-extra';
import OpenAI from 'openai';
import * as path from 'path';
import {
  AIConfig,
  ImageOptions,
  ImageResult,
  SummaryOptions,
} from '../../types';
import { IAIService } from './AIService.interface';

/**
 * Implementation of the AIService using OpenAI
 * Handles AI-powered content enhancement and image generation
 */
export class AIService implements IAIService {
  private openai: OpenAI;
  private config: AIConfig;
  private modelName: string;
  private imageModel: string;

  /**
   * Creates a new AIService instance
   * @param config The AI service configuration
   */
  constructor(config: AIConfig) {
    this.config = config;

    this.openai = new OpenAI({
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
  async generateSummary(
    content: string,
    options?: SummaryOptions
  ): Promise<string> {
    const maxLength = options?.maxLength || 250;
    const style = options?.style || 'concise';

    // Create the prompt based on style
    let prompt = '';

    if (style === 'concise') {
      prompt = `Summarize the following content concisely in ${maxLength} characters or less:\n\n${content}`;
    } else if (style === 'detailed') {
      prompt = `Create a detailed summary of the following content, highlighting key points, in ${maxLength} characters or less:\n\n${content}`;
    } else if (style === 'technical') {
      prompt = `Create a technical summary of the following content, focusing on technical aspects and using appropriate terminology, in ${maxLength} characters or less:\n\n${content}`;
    } else {
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
    } catch (error) {
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
  async generateTitle(
    content: string,
    currentTitle?: string,
    maxLength = 70
  ): Promise<string> {
    // Truncate content if too long
    const truncatedContent =
      content.length > 2000 ? content.substring(0, 2000) + '...' : content;

    let prompt = '';
    if (currentTitle) {
      prompt = `Based on the following content, suggest an improved, engaging title that is SEO-friendly. The current title is "${currentTitle}", but feel free to suggest a completely different title if appropriate. Title should be no longer than ${maxLength} characters:\n\n${truncatedContent}`;
    } else {
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
    } catch (error) {
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
  async generateKeywords(content: string, maxKeywords = 10): Promise<string[]> {
    // Truncate content if too long
    const truncatedContent =
      content.length > 3000 ? content.substring(0, 3000) + '...' : content;

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
    } catch (error) {
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
  async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    const size = options?.size || '1024x1024';
    const style = options?.style || 'vivid';
    const quality = options?.quality || 'standard';

    try {
      const response = await this.openai.images.generate({
        model: this.imageModel,
        prompt: prompt,
        n: 1,
        size: size as any,
        style: style as any,
        quality: quality as any,
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
    } catch (error) {
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
  async validateContent(content: string, rules: string[]): Promise<boolean> {
    // Truncate content if too long
    const truncatedContent =
      content.length > 3000 ? content.substring(0, 3000) + '...' : content;

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
            content:
              'You are a content validator checking if text complies with specified rules. You respond with ONLY "true" or "false".',
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 10,
        temperature: 0.1, // Very low temperature for consistent responses
      });

      const result =
        response.choices[0]?.message?.content?.trim().toLowerCase() || '';
      return result === 'true';
    } catch (error) {
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
  private async downloadImage(url: string, localPath: string): Promise<string> {
    try {
      // Create directory if it doesn't exist
      await fs.ensureDir(path.dirname(localPath));

      // Download the image
      const response = await axios({
        url,
        method: 'GET',
        responseType: 'stream',
      });

      // Create write stream and save
      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      // Return a promise that resolves when the file is saved
      return new Promise<string>((resolve, reject) => {
        writer.on('finish', () => resolve(localPath));
        writer.on('error', reject);
      });
    } catch (error) {
      console.error('Error downloading image:', error);
      throw error;
    }
  }
}
