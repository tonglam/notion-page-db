import { IAIService } from '../../core/ai/AIService.interface';
import { IStorageService } from '../../core/storage/StorageService.interface';
import { ContentPage, ImageProcessingResult } from '../../types';
/**
 * Image Processor
 * Handles image generation, downloading, and storage
 */
export declare class ImageProcessor {
    private aiService;
    private storageService;
    private tempDir;
    /**
     * Creates a new ImageProcessor instance
     * @param aiService The AI service for image generation
     * @param storageService The storage service for image storage
     */
    constructor(aiService: IAIService, storageService: IStorageService);
    /**
     * Initializes the image processor
     */
    initialize(): Promise<void>;
    /**
     * Processes images for a content page
     * @param contentPage The content page to process images for
     * @param generateIfMissing Whether to generate images if missing
     */
    processImages(contentPage: ContentPage, generateIfMissing?: boolean): Promise<ImageProcessingResult>;
    /**
     * Processes images for multiple content pages
     * @param contentPages The content pages to process images for
     * @param generateIfMissing Whether to generate images if missing
     */
    processAllImages(contentPages: ContentPage[], generateIfMissing?: boolean): Promise<ImageProcessingResult[]>;
    /**
     * Downloads and stores an image
     * @param imageUrl URL of the image to download
     * @param contentPage The content page the image belongs to
     */
    private downloadAndStoreImage;
    /**
     * Generates and stores an image
     * @param contentPage The content page to generate an image for
     */
    private generateAndStoreImage;
    /**
     * Checks if a URL is from the storage service
     * @param url URL to check
     */
    private isStorageUrl;
    /**
     * Cleans up temporary files
     */
    cleanup(): Promise<void>;
}
