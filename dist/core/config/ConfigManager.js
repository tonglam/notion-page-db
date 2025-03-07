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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Implementation of the ConfigManager
 * Manages application configuration using environment variables and config files
 */
class ConfigManager {
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
                rateLimitDelay: parseInt(process.env.NOTION_RATE_LIMIT_DELAY || '350', 10),
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
                delayBetweenBatches: parseInt(process.env.DELAY_BETWEEN_BATCHES || '1000', 10),
                maxConcurrentOperations: parseInt(process.env.MAX_CONCURRENT_OPERATIONS || '3', 10),
                stateFilePath: process.env.STATE_FILE_PATH || './processing-state.json',
            },
        };
    }
    /**
     * Gets the Notion configuration
     */
    getNotionConfig() {
        return this.config.notion;
    }
    /**
     * Gets the AI service configuration
     */
    getAIConfig() {
        return this.config.ai;
    }
    /**
     * Gets the storage service configuration
     */
    getStorageConfig() {
        return this.config.storage;
    }
    /**
     * Gets a configuration value
     * @param key The key to get
     * @param defaultValue The default value if not found
     */
    getConfigValue(key, defaultValue) {
        const parts = key.split('.');
        let current = this.config;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            }
            else {
                return defaultValue;
            }
        }
        return current || defaultValue;
    }
    /**
     * Loads configuration from a file
     * @param path The path to the config file
     */
    loadConfig(configPath) {
        if (!configPath)
            return;
        try {
            const resolvedPath = path.resolve(process.cwd(), configPath);
            if (fs.existsSync(resolvedPath)) {
                const fileContent = fs.readFileSync(resolvedPath, 'utf8');
                const fileConfig = JSON.parse(fileContent);
                // Deep merge the file config with the current config
                this.mergeConfigs(this.config, fileConfig);
            }
        }
        catch (error) {
            console.error(`Error loading config from ${configPath}:`, error);
        }
    }
    /**
     * Validates all configuration
     */
    validate() {
        const result = {
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
                result.errors.push('R2_PUBLIC_URL is not set. Public URLs cannot be generated.');
            }
        }
        return result;
    }
    /**
     * Deep merges two config objects
     */
    mergeConfigs(target, source) {
        if (!source)
            return target;
        Object.keys(source).forEach((key) => {
            if (source[key] &&
                typeof source[key] === 'object' &&
                !Array.isArray(source[key])) {
                if (!target[key])
                    target[key] = {};
                this.mergeConfigs(target[key], source[key]);
            }
            else {
                target[key] = source[key];
            }
        });
        return target;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map