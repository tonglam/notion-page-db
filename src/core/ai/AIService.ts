import axios from "axios";
import * as fs from "fs-extra";
import * as path from "path";
import {
  AIConfig,
  ImageOptions,
  ImageResult,
  SummaryOptions,
} from "../../types";
import { IAIService } from "./AIService.interface";

/**
 * Implementation of the AIService using API services
 * Handles AI-powered content enhancement and image generation
 */
export class AIService implements IAIService {
  private config: AIConfig;
  private dashscopeApiKey: string;
  private openaiApiKey: string;
  private modelName: string;

  /**
   * Creates a new AIService instance
   * @param config The AI service configuration
   */
  constructor(config: AIConfig) {
    this.config = config;
    this.modelName = config.model || "gpt-3.5-turbo";
    this.openaiApiKey = config.apiKey;

    // Get DashScope API key from environment variable
    this.dashscopeApiKey = process.env.DASHSCOPE_API_KEY || "";

    if (!this.dashscopeApiKey) {
      console.warn(
        "DASHSCOPE_API_KEY environment variable is not set. Image generation will not work."
      );
    }

    if (!this.openaiApiKey) {
      console.warn("OpenAI API key is not set. Text generation will not work.");
    }
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
    const style = options?.style || "concise";

    // Create the system message based on style
    let systemMessage = "You are a professional content summarizer. ";

    if (style === "concise") {
      systemMessage += "Create concise and to-the-point summaries.";
    } else if (style === "detailed") {
      systemMessage += "Create detailed summaries that highlight key points.";
    } else if (style === "technical") {
      systemMessage +=
        "Create technical summaries focusing on technical aspects using appropriate terminology.";
    } else {
      systemMessage += "Create casual, conversational summaries.";
    }

    try {
      // Use OpenAI API directly
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.modelName,
          messages: [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: `Summarize the following content in ${maxLength} characters or less:\n\n${content}`,
            },
          ],
          max_tokens: Math.ceil(maxLength / 4), // Approximate token count
          temperature: 0.7,
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const summary = response.data.choices[0]?.message?.content?.trim() || "";

      // Ensure the summary is within the maxLength constraint
      return summary.length > maxLength
        ? summary.substring(0, maxLength - 3) + "..."
        : summary;
    } catch (error) {
      console.error("Error generating summary:", error);
      // Fallback to a simple summary if AI fails
      return content.substring(0, maxLength - 3) + "...";
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
      content.length > 2000 ? content.substring(0, 2000) + "..." : content;

    let prompt = "";
    if (currentTitle) {
      prompt = `Based on the following content, suggest an improved, engaging title that is SEO-friendly. The current title is "${currentTitle}", but feel free to suggest a completely different title if appropriate. Title should be no longer than ${maxLength} characters:\n\n${truncatedContent}`;
    } else {
      prompt = `Create an engaging, SEO-friendly title for the following content, no longer than ${maxLength} characters:\n\n${truncatedContent}`;
    }

    try {
      // Use OpenAI API directly
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: "You are a professional headline writer and SEO expert.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 50, // Titles are short
          temperature: 0.8, // Allow some creativity
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      let title = response.data.choices[0]?.message?.content?.trim() || "";

      // Remove quotes if present (AI often puts titles in quotes)
      title = title.replace(/^['"](.*)['"]$/, "$1");

      // Ensure the title is within length constraints
      return title.length > maxLength
        ? title.substring(0, maxLength - 3) + "..."
        : title;
    } catch (error) {
      console.error("Error generating title:", error);
      // Fallback to current title or a generic one
      return currentTitle || "Untitled";
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
      content.length > 3000 ? content.substring(0, 3000) + "..." : content;

    const prompt = `Extract ${maxKeywords} relevant keywords or keyphrases from the following content. Provide them as a comma-separated list. Focus on terms that would work well as tags or for SEO:\n\n${truncatedContent}`;

    try {
      // Use OpenAI API directly
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content: "You are an SEO expert and keyword analyst.",
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 150,
          temperature: 0.5, // Lower temperature for more focused responses
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const keywordsText =
        response.data.choices[0]?.message?.content?.trim() || "";

      // Split by commas and clean up each keyword
      const keywords = keywordsText
        .split(/,\s*/)
        .map((keyword: string) => keyword.trim())
        .filter((keyword: string) => keyword.length > 0)
        .slice(0, maxKeywords);

      return keywords;
    } catch (error) {
      console.error("Error generating keywords:", error);
      // Fallback to simple word extraction
      return content
        .split(/\s+/)
        .filter((word: string) => word.length > 5)
        .slice(0, maxKeywords);
    }
  }

  /**
   * Generates an image for the content using DashScope API
   * @param prompt The text prompt to generate the image from
   * @param options Options for image generation
   */
  async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    const size = options?.size || "1024*1024"; // DashScope format uses asterisk

    if (!this.dashscopeApiKey) {
      console.error("DASHSCOPE_API_KEY is not set. Cannot generate image.");
      return {
        url: "",
        prompt,
        success: false,
        error: "DASHSCOPE_API_KEY is not set. Cannot generate image.",
      };
    }

    try {
      // Clean and enhance the prompt
      const cleanPrompt = prompt.replace(/['"]/g, "").trim();

      // Create a structured prompt based on the advanced formula
      // 提示词 = 主体描述 + 场景描述 + 风格定义 + 镜头语言 + 光线设置 + 氛围词 + 细节修饰 + 技术参数

      // Main subject description
      const subjectDescription = `a professional technical illustration representing the concept of "${cleanPrompt}" WITHOUT ANY TEXT OR LABELS`;

      // Scene description
      const sceneDescription =
        "in a clean, minimalist digital environment with subtle tech-related background elements";

      // Style definition
      const styleDefinition =
        "modern digital art style with clean lines and a professional look, suitable for technical articles";

      // Camera language
      const cameraLanguage =
        "frontal perspective with balanced composition, moderate depth of field focusing on the central concept";

      // Lighting setup
      const lightingSetup =
        "soft, even lighting with subtle highlights to emphasize important elements, cool blue accent lighting";

      // Atmosphere words
      const atmosphereWords =
        "informative, innovative, precise, and engaging atmosphere";

      // Detail modifiers
      const detailModifiers =
        "with subtle grid patterns, simplified icons or symbols related to the prompt, using a cohesive color palette of blues, teals, and neutral tones";

      // Technical parameters
      const technicalParameters =
        "high-resolution, sharp details, professional vector-like quality";

      // Combine all components into a comprehensive prompt
      const enhancedPrompt = `${subjectDescription} ${sceneDescription}. 
      Style: ${styleDefinition}. 
      Composition: ${cameraLanguage}. 
      Lighting: ${lightingSetup}. 
      Atmosphere: ${atmosphereWords}. 
      Details: ${detailModifiers}. 
      Quality: ${technicalParameters}.
      
      The illustration should visually communicate the key concepts: ${cleanPrompt}
      
      IMPORTANT: DO NOT INCLUDE ANY TEXT, WORDS, LABELS, OR CHARACTERS IN THE IMAGE. The illustration should be entirely visual without any textual elements.`;

      // Enhanced negative prompt to avoid unwanted elements
      const negative_prompt =
        "text, words, writing, watermark, signature, blurry, low quality, ugly, distorted, photorealistic, photograph, human faces, hands, cluttered, chaotic layout, overly complex, childish, cartoon-like, unprofessional, Chinese characters, Chinese text, Asian characters, characters, text overlay, letters, numbers, any text, Asian text";

      console.log("Creating image generation task with DashScope API");

      // Step 1: Create an image generation task
      const createTaskResponse = await axios.post(
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis",
        {
          model: "wanx2.1-t2i-turbo",
          input: {
            prompt: enhancedPrompt,
            negative_prompt: negative_prompt,
          },
          parameters: {
            size: size,
            n: 1,
          },
        },
        {
          headers: {
            "X-DashScope-Async": "enable",
            Authorization: `Bearer ${this.dashscopeApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Extract task_id from the response
      if (
        !createTaskResponse.data ||
        !createTaskResponse.data.output ||
        !createTaskResponse.data.output.task_id
      ) {
        throw new Error("No task ID returned from DashScope API");
      }

      const taskId = createTaskResponse.data.output.task_id;
      console.log(`Task created successfully with ID: ${taskId}`);

      // Step 2: Poll for the task result
      const imageUrl = await this.getDashScopeImageResult(taskId);

      if (!imageUrl) {
        throw new Error("Failed to get image URL from DashScope API");
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
      console.error("Error generating image with DashScope:", error);
      return {
        url: "",
        prompt,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Polls for the DashScope image generation task result
   * @param taskId The task ID to check
   * @param maxAttempts Maximum number of attempts
   * @param checkInterval Interval between checks in milliseconds
   * @returns The URL of the generated image, or null if generation failed
   */
  private async getDashScopeImageResult(
    taskId: string,
    maxAttempts = 15,
    checkInterval = 5000
  ): Promise<string | null> {
    try {
      console.log(`Checking status for DashScope task: ${taskId}`);
      let attempts = 0;

      while (attempts < maxAttempts) {
        attempts++;
        console.log(`Attempt ${attempts}/${maxAttempts}...`);

        const response = await axios.get(
          `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${this.dashscopeApiKey}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.data || !response.data.output) {
          console.error("Unexpected response format:", response.data);
          return null;
        }

        const status = response.data.output.task_status;
        console.log(`Current status: ${status}`);

        if (status === "SUCCEEDED") {
          console.log("Task completed successfully!");
          // Extract the image URL from the result
          if (
            response.data.output.results &&
            response.data.output.results.length > 0
          ) {
            const imageUrl = response.data.output.results[0].url;
            console.log(`Generated image URL: ${imageUrl}`);
            return imageUrl;
          } else {
            console.error("No image URL in successful response");
            return null;
          }
        } else if (status === "FAILED") {
          console.error("Task failed:", response.data.output.error);
          return null;
        }

        console.log(
          `Waiting ${checkInterval / 1000} seconds before next check...`
        );
        await this.delay(checkInterval);
      }

      console.error(`Max attempts (${maxAttempts}) reached without completion`);
      return null;
    } catch (error) {
      console.error("Error checking task status:", error);
      return null;
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
      content.length > 3000 ? content.substring(0, 3000) + "..." : content;

    // Format rules into a readable string
    const rulesText = rules
      .map((rule, index) => `Rule ${index + 1}: ${rule}`)
      .join("\n");

    const prompt = `Validate if the following content complies with all the rules specified. Respond with ONLY "true" if all rules are satisfied, or "false" if any rule is violated.\n\nRULES:\n${rulesText}\n\nCONTENT:\n${truncatedContent}`;

    try {
      // Use OpenAI API directly
      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: this.modelName,
          messages: [
            {
              role: "system",
              content:
                'You are a content validator checking if text complies with specified rules. You respond with ONLY "true" or "false".',
            },
            { role: "user", content: prompt },
          ],
          max_tokens: 10,
          temperature: 0.1, // Very low temperature for consistent responses
        },
        {
          headers: {
            Authorization: `Bearer ${this.openaiApiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result =
        response.data.choices[0]?.message?.content?.trim().toLowerCase() || "";
      return result === "true";
    } catch (error) {
      console.error("Error validating content:", error);
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
        method: "GET",
        responseType: "stream",
      });

      // Create write stream and save
      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      // Return a promise that resolves when the file is saved
      return new Promise<string>((resolve, reject) => {
        writer.on("finish", () => resolve(localPath));
        writer.on("error", reject);
      });
    } catch (error) {
      console.error("Error downloading image:", error);
      throw error;
    }
  }

  /**
   * Utility method to delay execution
   * @param ms Milliseconds to delay
   */
  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
