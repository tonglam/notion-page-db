import { AIConfig, NotionConfig, StorageConfig, ValidationResult } from '../../types';
import { IConfigManager } from './ConfigManager.interface';
/**
 * Implementation of the ConfigManager
 * Manages application configuration using environment variables and config files
 */
export declare class ConfigManager implements IConfigManager {
    private config;
    /**
     * Creates a new ConfigManager instance
     */
    constructor();
    /**
     * Gets the Notion configuration
     */
    getNotionConfig(): NotionConfig;
    /**
     * Gets the AI service configuration
     */
    getAIConfig(): AIConfig;
    /**
     * Gets the storage service configuration
     */
    getStorageConfig(): StorageConfig;
    /**
     * Gets a configuration value
     * @param key The key to get
     * @param defaultValue The default value if not found
     */
    getConfigValue<T>(key: string, defaultValue?: T): T;
    /**
     * Loads configuration from a file
     * @param path The path to the config file
     */
    loadConfig(configPath?: string): void;
    /**
     * Validates all configuration
     */
    validate(): ValidationResult;
    /**
     * Deep merges two config objects
     */
    private mergeConfigs;
}
