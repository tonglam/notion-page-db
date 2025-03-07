import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import {
  AIConfig,
  NotionConfig,
  StorageConfig,
  ValidationResult,
} from '../../types';
import { IConfigManager } from './ConfigManager.interface';

/**
 * Implementation of the ConfigManager
 * Manages application configuration using environment variables and config files
 */
export class ConfigManager implements IConfigManager {
  private config: Record<string, any>;

  /**
   * Creates a new ConfigManager instance
   */
  constructor() {
    // Load environment variables from .env file
    dotenv.config();

    // Initialize config
    this.config = {
      notion: {
        apiKey: process.env.NOTION_API_KEY,
        sourcePageId: process.env.SOURCE_PAGE_ID,
        databaseId: process.env.NOTION_DATABASE_ID,
        rateLimitDelay: parseInt(
          process.env.NOTION_RATE_LIMIT_DELAY || '350',
          10
        ),
      },
      ai: {
        provider: process.env.AI_PROVIDER || 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
        modelId: process.env.AI_MODEL_ID || 'deepseek-r1-chat',
        imageModel: process.env.IMAGE_MODEL || 'dall-e-3',
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || '3', 10),
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER || 'r2',
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicUrlPrefix: process.env.R2_PUBLIC_URL,
      },
      app: {
        logLevel: process.env.LOG_LEVEL || 'info',
        batchSize: parseInt(process.env.BATCH_SIZE || '5', 10),
        delayBetweenBatches: parseInt(
          process.env.DELAY_BETWEEN_BATCHES || '1000',
          10
        ),
        maxConcurrentOperations: parseInt(
          process.env.MAX_CONCURRENT_OPERATIONS || '3',
          10
        ),
        stateFilePath: process.env.STATE_FILE_PATH || './processing-state.json',
      },
    };
  }

  /**
   * Gets the Notion configuration
   */
  getNotionConfig(): NotionConfig {
    return this.config.notion;
  }

  /**
   * Gets the AI service configuration
   */
  getAIConfig(): AIConfig {
    return this.config.ai;
  }

  /**
   * Gets the storage service configuration
   */
  getStorageConfig(): StorageConfig {
    return this.config.storage;
  }

  /**
   * Gets a configuration value
   * @param key The key to get
   * @param defaultValue The default value if not found
   */
  getConfigValue<T>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let current: any = this.config;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return defaultValue as T;
      }
    }

    return (current as T) || (defaultValue as T);
  }

  /**
   * Loads configuration from a file
   * @param path The path to the config file
   */
  loadConfig(configPath?: string): void {
    if (!configPath) return;

    try {
      const resolvedPath = path.resolve(process.cwd(), configPath);
      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const fileConfig = JSON.parse(fileContent);

        // Deep merge the file config with the current config
        this.mergeConfigs(this.config, fileConfig);
      }
    } catch (error) {
      console.error(`Error loading config from ${configPath}:`, error);
    }
  }

  /**
   * Validates all configuration
   */
  validate(): ValidationResult {
    const result: ValidationResult = {
      isValid: true,
      valid: true,
      errors: [],
    };

    // Validate Notion config
    if (!this.config.notion?.apiKey) {
      result.isValid = false;
      result.valid = false;
      result.errors.push('Notion API key is required');
    }

    if (!this.config.notion?.sourcePageId) {
      result.isValid = false;
      result.valid = false;
      result.errors.push('Notion source page ID is required');
    }

    // Validate AI configuration
    if (!this.config.ai.apiKey) {
      result.isValid = false;
      result.errors.push(`AI_API_KEY (${this.config.ai.provider}) is required`);
    }

    // Validate Storage configuration
    if (this.config.storage.provider === 'r2') {
      if (!this.config.storage.accountId) {
        result.isValid = false;
        result.errors.push('R2_ACCOUNT_ID is required');
      }

      if (!this.config.storage.accessKeyId) {
        result.isValid = false;
        result.errors.push('R2_ACCESS_KEY_ID is required');
      }

      if (!this.config.storage.secretAccessKey) {
        result.isValid = false;
        result.errors.push('R2_SECRET_ACCESS_KEY is required');
      }

      if (!this.config.storage.bucketName) {
        result.isValid = false;
        result.errors.push('R2_BUCKET_NAME is required');
      }

      if (!this.config.storage.publicUrlPrefix) {
        result.errors.push(
          'R2_PUBLIC_URL is not set. Public URLs cannot be generated.'
        );
      }
    }

    return result;
  }

  /**
   * Deep merges two config objects
   */
  private mergeConfigs(
    target: Record<string, any>,
    source: Record<string, any>
  ): Record<string, any> {
    if (!source) return target;

    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        if (!target[key]) target[key] = {};
        this.mergeConfigs(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    });

    return target;
  }
}
