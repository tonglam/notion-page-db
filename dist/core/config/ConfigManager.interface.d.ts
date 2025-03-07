import { AIConfig, NotionConfig, StorageConfig, ValidationResult } from '../../types';
/**
 * Interface for the ConfigManager component
 * Responsible for loading and validating configuration values
 */
export interface IConfigManager {
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
     * Validates the configuration
     */
    validate(): ValidationResult;
    /**
     * Gets a specific configuration value
     * @param key The configuration key
     * @param defaultValue The default value if not found
     */
    getConfigValue<T>(key: string, defaultValue?: T): T;
    /**
     * Loads configuration from a specified path
     * @param path Optional path to a config file
     */
    loadConfig(path?: string): void;
}
