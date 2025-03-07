/**
 * Common type definitions for the NotionPageDb Migration System
 */

// Configuration Types
export interface NotionConfig {
  apiKey: string;
  sourcePageId: string;
  targetDatabaseId: string;
  rateLimitDelay?: number;
}

export interface AIConfig {
  apiKey: string;
  provider: string;
  modelId: string;
  model?: string;
  imageModel?: string;
  maxTokens?: number;
  temperature?: number;
  rateLimitDelay?: number;
}

/**
 * Storage Config
 */
export interface StorageConfig {
  provider: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  accountId?: string; // Cloudflare R2 account ID
  region?: string;
  usePresignedUrls?: boolean;
  baseUrl?: string; // Public URL for R2 bucket
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  valid?: boolean; // Alias for backward compatibility
  errors: string[];
}

// Database Schema Types
export interface DatabaseSchema {
  name: string;
  properties: Record<string, PropertyDefinition>;
}

export interface PropertyDefinition {
  type:
    | 'title'
    | 'rich_text'
    | 'select'
    | 'multi_select'
    | 'number'
    | 'url'
    | 'date'
    | 'files'
    | 'checkbox';
  options?: Array<{ name: string; color?: string }>; // For select/multi_select
  description?: string;
}

// Notion Database Types
export interface QueryFilter {
  database_id: string;
  filter?: Record<string, any>;
  sorts?: Array<Record<string, any>>;
  page_size?: number;
  start_cursor?: string;
}

export interface NotionEntry {
  id: string;
  properties: Record<string, any>;
  url: string;
  created_time: string;
  last_edited_time: string;
}

/**
 * Data for creating or updating a Notion entry
 */
export interface EntryData {
  parent?: { database_id: string; page_id?: string };
  properties: Record<string, any>;
  title?: Array<{ type: string; text: { content: string } }>;
}

// Content Types
export interface PageContent {
  title: string;
  blocks: Block[];
  properties?: Record<string, any>;
  createdTime: string;
  lastEditedTime: string;
}

export interface Block {
  id: string;
  type: string;
  content: any;
  hasChildren: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'regular' | 'mit'; // Regular category or MIT unit with CITS prefix
}

/**
 * Content page data
 */
export interface ContentPage {
  id: string;
  title: string;
  parentId: string;
  category: string;
  content: string;
  summary?: string;
  excerpt?: string;
  tags?: string[];
  minsRead?: number;
  imageUrl?: string;
  createdTime: string;
  lastEditedTime: string;
}

// AI Service Types
export interface SummaryOptions {
  maxLength?: number;
  style?: 'concise' | 'detailed' | 'technical';
  includeKeyPoints?: boolean;
}

export interface ImageOptions {
  width?: number;
  height?: number;
  size?: string;
  style?: string;
  quality?: string;
  localPath?: string;
}

export interface ImageResult {
  url: string;
  width?: number;
  height?: number;
  localPath?: string;
  prompt?: string;
  success: boolean;
  error?: string;
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  title?: string;
  description?: string;
  alt?: string;
  author?: string;
  sourceUrl?: string;
  tags?: string[];
  width?: number;
  height?: number;
  format?: string;
}

/**
 * Result of storage operations
 */
export interface StorageResult {
  key: string;
  url: string;
  contentType?: string;
  size?: number;
  success: boolean;
  error?: string;
}

export interface StorageItem {
  key: string;
  size: number;
  lastModified: Date;
  eTag: string;
}

// Workflow Types
export interface VerificationResult {
  success: boolean;
  databaseId?: string;
  message?: string;
  errors?: string[];
  missingProperties?: string[];
  invalidPropertyTypes?: string[];
}

export interface SchemaValidationResult {
  valid: boolean;
  missingProperties: PropertyDefinition[];
  incorrectProperties: {
    name: string;
    expected: PropertyDefinition;
    actual: PropertyDefinition;
  }[];
}

/**
 * Result of fetching content
 */
export interface FetchResult {
  success: boolean;
  error?: string;
  categories?: Category[];
  contentPages?: ContentPage[];
}

export interface UpdateOptions {
  skipExisting?: boolean;
  overwriteFields?: string[];
  preserveDates?: boolean;
  dryRun?: boolean;
}

export interface BatchUpdateResult {
  successful: string[];
  failed: {
    id: string;
    error: string;
  }[];
  skipped: string[];
}

export interface EnrichmentResult {
  pageId: string;
  summary: string;
  readingTime: number;
  success: boolean;
  error?: string;
}

export interface BatchEnrichmentResult {
  successful: EnrichmentResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}

export interface ImageGenerationResult {
  pageId: string;
  imageUrl: string;
  width: number;
  height: number;
  format: string;
  success: boolean;
  promptUsed?: string;
  error?: string;
}

export interface BatchImageResult {
  successful: ImageGenerationResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}

export enum GenerationStatus {
  NotStarted = 'not_started',
  Pending = 'pending',
  Completed = 'completed',
  Failed = 'failed',
}

export interface UploadResult {
  pageId: string;
  storageKey: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}

export enum ProcessingStage {
  Metadata = 'metadata',
  Content = 'content',
  ImageGeneration = 'image_generation',
  ImageUpload = 'image_upload',
  Complete = 'complete',
}

export interface ProcessingResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface ProcessingStats {
  totalRecords: number;
  processed: Record<ProcessingStage, number>;
  failed: Record<ProcessingStage, number>;
  pending: Record<ProcessingStage, number>;
}

export interface FailedRecord {
  id: string;
  stage: ProcessingStage;
  error: string;
  attempts: number;
  lastAttempt: Date;
}

/**
 * Result of updating a database entry
 */
export interface UpdateResult {
  success: boolean;
  entryId?: string;
  isNew?: boolean;
  message?: string;
  error?: string;
}

/**
 * Result of image processing
 */
export interface ImageProcessingResult {
  success: boolean;
  imageUrl?: string;
  storageUrl?: string;
  isNew?: boolean;
  isGenerated?: boolean;
  error?: string;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  enhanceContent?: boolean;
  processImages?: boolean;
  generateImages?: boolean;
}

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean;
  totalPages?: number;
  updatedPages?: number;
  failedPages?: number;
  categories?: Category[];
  error?: string;
}
