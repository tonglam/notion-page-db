import { ImageMetadata, StorageConfig, StorageItem, StorageResult } from '../../types';
import { IStorageService } from './StorageService.interface';
/**
 * Implementation of the StorageService using AWS S3
 * Handles image and file storage
 */
export declare class StorageService implements IStorageService {
    private s3Client;
    private config;
    private bucketName;
    /**
     * Creates a new StorageService instance
     * @param config The storage configuration
     */
    constructor(config: StorageConfig);
    /**
     * Uploads an image to the storage service
     * @param imagePath Path to the image to upload
     * @param metadata Metadata for the image
     */
    uploadImage(imagePath: string, metadata?: ImageMetadata): Promise<StorageResult>;
    /**
     * Gets a public URL for a stored item
     * @param key Key of the item to get URL for
     * @param expiresIn Time in seconds until the URL expires (for presigned URLs)
     */
    getPublicUrl(key: string, expiresIn?: number): Promise<string>;
    /**
     * Lists items in a directory
     * @param prefix Directory prefix to list items from
     */
    listItems(prefix: string): Promise<StorageItem[]>;
    /**
     * Deletes an item from storage
     * @param key Key of the item to delete
     */
    deleteItem(key: string): Promise<boolean>;
    /**
     * Copies an item to a new location
     * @param sourceKey Source key of the item to copy
     * @param destinationKey Destination key for the copied item
     */
    copyItem(sourceKey: string, destinationKey: string): Promise<StorageResult>;
    /**
     * Gets the content type from a file key based on extension
     * @param key Key to get content type for
     */
    private getContentTypeFromKey;
}
