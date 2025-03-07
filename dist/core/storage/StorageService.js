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
exports.StorageService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Implementation of the StorageService using AWS S3
 * Handles image and file storage
 */
class StorageService {
    /**
     * Creates a new StorageService instance
     * @param config The storage configuration
     */
    constructor(config) {
        this.config = config;
        this.bucketName = config.bucketName;
        this.s3Client = new client_s3_1.S3Client({
            region: config.region || 'us-east-1',
            credentials: {
                accessKeyId: config.accessKeyId,
                secretAccessKey: config.secretAccessKey,
            },
        });
    }
    /**
     * Uploads an image to the storage service
     * @param imagePath Path to the image to upload
     * @param metadata Metadata for the image
     */
    async uploadImage(imagePath, metadata) {
        try {
            // Check if the file exists
            if (!(await fs.pathExists(imagePath))) {
                throw new Error(`File not found: ${imagePath}`);
            }
            // Read the file
            const fileContent = await fs.readFile(imagePath);
            // Get the file extension
            const fileExtension = path.extname(imagePath).toLowerCase();
            // Determine content type
            let contentType = 'application/octet-stream';
            if (fileExtension === '.jpg' || fileExtension === '.jpeg') {
                contentType = 'image/jpeg';
            }
            else if (fileExtension === '.png') {
                contentType = 'image/png';
            }
            else if (fileExtension === '.gif') {
                contentType = 'image/gif';
            }
            else if (fileExtension === '.webp') {
                contentType = 'image/webp';
            }
            // Create a key for the image using a timestamp and original filename
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = path.basename(imagePath);
            const key = `images/${timestamp}-${fileName}`;
            // Set up metadata object
            const s3Metadata = {};
            if (metadata) {
                if (metadata.title)
                    s3Metadata.title = metadata.title;
                if (metadata.description)
                    s3Metadata.description = metadata.description;
                if (metadata.alt)
                    s3Metadata.alt = metadata.alt;
                if (metadata.author)
                    s3Metadata.author = metadata.author;
                if (metadata.sourceUrl)
                    s3Metadata.sourceUrl = metadata.sourceUrl;
                // Convert tags array to string if present
                if (metadata.tags && Array.isArray(metadata.tags)) {
                    s3Metadata.tags = metadata.tags.join(',');
                }
            }
            // Upload to S3
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: key,
                Body: fileContent,
                ContentType: contentType,
                Metadata: s3Metadata,
            });
            await this.s3Client.send(command);
            // Get the public URL
            const url = await this.getPublicUrl(key);
            return {
                key,
                url,
                contentType,
                size: fileContent.length,
                success: true,
            };
        }
        catch (error) {
            console.error('Error uploading image:', error);
            return {
                key: '',
                url: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Gets a public URL for a stored item
     * @param key Key of the item to get URL for
     * @param expiresIn Time in seconds until the URL expires (for presigned URLs)
     */
    async getPublicUrl(key, expiresIn = 3600) {
        try {
            // If configured to use presigned URLs
            if (this.config.usePresignedUrls) {
                const command = new client_s3_1.GetObjectCommand({
                    Bucket: this.bucketName,
                    Key: key,
                });
                return await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, command, { expiresIn });
            }
            // Otherwise, construct the direct S3 URL
            const region = this.config.region || 'us-east-1';
            return `https://${this.bucketName}.s3.${region}.amazonaws.com/${key}`;
        }
        catch (error) {
            console.error('Error generating URL:', error);
            throw error;
        }
    }
    /**
     * Lists items in a directory
     * @param prefix Directory prefix to list items from
     */
    async listItems(prefix) {
        try {
            const command = new client_s3_1.ListObjectsV2Command({
                Bucket: this.bucketName,
                Prefix: prefix,
            });
            const response = await this.s3Client.send(command);
            if (!response.Contents) {
                return [];
            }
            // Convert S3 objects to StorageItems
            const items = await Promise.all(response.Contents.map(async (item) => {
                const key = item.Key || '';
                const url = await this.getPublicUrl(key);
                return {
                    key,
                    url,
                    size: item.Size || 0,
                    lastModified: item.LastModified || new Date(),
                    contentType: this.getContentTypeFromKey(key),
                    eTag: item.ETag || '',
                };
            }));
            return items;
        }
        catch (error) {
            console.error('Error listing items:', error);
            return [];
        }
    }
    /**
     * Deletes an item from storage
     * @param key Key of the item to delete
     */
    async deleteItem(key) {
        try {
            const command = new client_s3_1.DeleteObjectCommand({
                Bucket: this.bucketName,
                Key: key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            console.error('Error deleting item:', error);
            return false;
        }
    }
    /**
     * Copies an item to a new location
     * @param sourceKey Source key of the item to copy
     * @param destinationKey Destination key for the copied item
     */
    async copyItem(sourceKey, destinationKey) {
        try {
            const command = new client_s3_1.CopyObjectCommand({
                Bucket: this.bucketName,
                CopySource: `${this.bucketName}/${sourceKey}`,
                Key: destinationKey,
            });
            await this.s3Client.send(command);
            // Get the URL for the copied item
            const url = await this.getPublicUrl(destinationKey);
            return {
                key: destinationKey,
                url,
                contentType: this.getContentTypeFromKey(destinationKey),
                success: true,
            };
        }
        catch (error) {
            console.error('Error copying item:', error);
            return {
                key: '',
                url: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    }
    /**
     * Gets the content type from a file key based on extension
     * @param key Key to get content type for
     */
    getContentTypeFromKey(key) {
        const extension = path.extname(key).toLowerCase();
        switch (extension) {
            case '.jpg':
            case '.jpeg':
                return 'image/jpeg';
            case '.png':
                return 'image/png';
            case '.gif':
                return 'image/gif';
            case '.webp':
                return 'image/webp';
            case '.pdf':
                return 'application/pdf';
            case '.json':
                return 'application/json';
            case '.txt':
                return 'text/plain';
            case '.html':
                return 'text/html';
            case '.css':
                return 'text/css';
            case '.js':
                return 'application/javascript';
            default:
                return 'application/octet-stream';
        }
    }
}
exports.StorageService = StorageService;
//# sourceMappingURL=StorageService.js.map