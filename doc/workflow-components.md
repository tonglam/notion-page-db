# Workflow Components

This document provides detailed specifications for the workflow components of the NotionPageDb Migration System. These components implement the business logic and orchestrate the migration process.

## 1. DatabaseVerifier

**Purpose**: Verify database existence and schema.

### Responsibilities

- Check if the database exists
- Validate database schema against requirements
- Create database if needed
- Update schema if mismatched

### Interface

```typescript
interface IDatabaseVerifier {
  verifyDatabase(): Promise<VerificationResult>;
  createDatabaseIfNeeded(): Promise<string>;
  ensurePropertyExists(property: PropertyDefinition): Promise<void>;
  validateSchema(): Promise<SchemaValidationResult>;
}

interface VerificationResult {
  exists: boolean;
  id?: string;
  schemaValid: boolean;
  missingProperties?: string[];
}

interface SchemaValidationResult {
  valid: boolean;
  missingProperties: PropertyDefinition[];
  incorrectProperties: {
    name: string;
    expected: PropertyDefinition;
    actual: PropertyDefinition;
  }[];
}
```

### Required Database Schema

The database schema includes the following properties:

| Property Name | Type         | Description                 |
| ------------- | ------------ | --------------------------- |
| Title         | title        | Title of the article        |
| Category      | select       | Category of the content     |
| Tags          | multi_select | Relevant tags               |
| Summary       | rich_text    | AI-generated summary        |
| Excerpt       | rich_text    | Brief excerpt from content  |
| Mins Read     | number       | Estimated reading time      |
| Image         | url          | URL to original image       |
| R2ImageUrl    | url          | Public URL for the R2 image |
| Date Created  | date         | Entry creation date         |
| Status        | select       | Publication status          |
| Original Page | url          | URL to original Notion page |
| Published     | checkbox     | Publication flag            |

### Implementation Notes

- Defines a standard schema for the Notion database
- Ensures backward compatibility
- Uses NotionDatabase service for verification
- Creates missing properties when needed
- Reports detailed validation results

## 2. ContentFetcher

**Purpose**: Extract content from source Notion pages.

### Responsibilities

- Identify top-level categories
- Extract valid content pages
- Process MIT Units with CITS prefix
- Organize content hierarchy

### Interface

```typescript
interface IContentFetcher {
  fetchAllContent(): Promise<FetchResult>;
  fetchCategories(): Promise<Category[]>;
  fetchContentPages(): Promise<ContentPage[]>;
  fetchContentByCategory(category: string): Promise<ContentPage[]>;
  processMITUnits(): Promise<Category[]>;
}

interface FetchResult {
  categories: Category[];
  contentPages: ContentPage[];
  totalCategories: number;
  totalContentPages: number;
}

// Category and ContentPage interfaces are defined in the NotionContent component
```

### Implementation Notes

- Recursively processes the source page structure
- Identifies categories based on top-level pages
- Applies special handling for MIT Units (prefix with CITS)
- Excludes specifically named categories
- Optimizes API calls with batching and pagination
- Handles rate limiting gracefully

## 3. MetadataUpdater

**Purpose**: Update basic metadata for database entries.

### Responsibilities

- Update title, URL, category, tags
- Handle slug generation
- Preserve original creation dates
- Skip existing fields if specified

### Interface

```typescript
interface IMetadataUpdater {
  updateEntryMetadata(
    entry: ContentPage,
    options?: UpdateOptions
  ): Promise<string>;
  batchUpdateMetadata(
    entries: ContentPage[],
    options?: UpdateOptions
  ): Promise<BatchUpdateResult>;
  generateSlug(title: string, category?: string): string;
  identifyTags(content: string, title: string): string[];
}

interface UpdateOptions {
  skipExisting?: boolean;
  overwriteFields?: string[];
  preserveDates?: boolean;
  dryRun?: boolean;
}

interface BatchUpdateResult {
  successful: string[];
  failed: {
    id: string;
    error: string;
  }[];
  skipped: string[];
}
```

### Implementation Notes

- Uses NotionDatabase service for updates
- Generates unique slugs with collision detection
- Implements intelligent tag extraction
- Preserves original creation and modified dates
- Supports atomic updates (skip if exists)
- Provides detailed reporting on batch operations

## 4. ContentEnricher

**Purpose**: Enrich content with AI-generated information.

### Responsibilities

- Generate summary using text-based AI
- Estimate reading time
- Integrate with DeepSeek R1 or similar models
- Manage API rate limits

### Interface

```typescript
interface IContentEnricher {
  enrichContent(pageId: string, content: string): Promise<EnrichmentResult>;
  generateSummary(content: string, title: string): Promise<string>;
  calculateReadingTime(content: string): Promise<number>;
  batchEnrichContent(
    entries: { id: string; content: string }[]
  ): Promise<BatchEnrichmentResult>;
}

interface EnrichmentResult {
  pageId: string;
  summary: string;
  readingTime: number;
  success: boolean;
  error?: string;
}

interface BatchEnrichmentResult {
  successful: EnrichmentResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}
```

### Implementation Notes

- Uses AIService for AI model integration
- Implements Vercel AI SDK for robust AI calling
- Optimizes prompts for high-quality summaries
- Handles API rate limits and retries
- Implements caching to prevent redundant API calls
- Uses batch processing for efficiency

## 5. ImageGenerator

**Purpose**: Generate images for content using AI.

### Responsibilities

- Create prompts from content
- Call image generation APIs
- Track generation state
- Handle failures and retries

### Interface

```typescript
interface IImageGenerator {
  generateImage(
    pageId: string,
    title: string,
    summary: string
  ): Promise<ImageGenerationResult>;
  batchGenerateImages(
    entries: { id: string; title: string; summary: string }[]
  ): Promise<BatchImageResult>;
  createPrompt(title: string, summary: string): string;
  getGenerationStatus(pageId: string): GenerationStatus;
}

interface ImageGenerationResult {
  pageId: string;
  imageUrl: string;
  width: number;
  height: number;
  format: string;
  success: boolean;
  promptUsed?: string;
  error?: string;
}

interface BatchImageResult {
  successful: ImageGenerationResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}

enum GenerationStatus {
  NotStarted = "not_started",
  Pending = "pending",
  Completed = "completed",
  Failed = "failed",
}
```

### Implementation Notes

- Uses AIService for image generation
- Creates optimized prompts based on content
- Implements state tracking with a mapping file
- Provides retry mechanisms for failed generations
- Supports multiple image styles and formats
- Implements parallel processing with rate limiting

## 6. ImageUploader

**Purpose**: Upload images to Cloudflare R2 storage.

### Responsibilities

- Download images from temporary URLs
- Upload to R2 with appropriate metadata
- Generate and store public URLs
- Update database entries with URLs

### Interface

```typescript
interface IImageUploader {
  uploadImage(
    pageId: string,
    imageUrl: string,
    metadata?: ImageMetadata
  ): Promise<UploadResult>;
  batchUploadImages(
    entries: { id: string; imageUrl: string }[]
  ): Promise<BatchUploadResult>;
  getImagePublicUrl(key: string): string;
  checkImageExists(pageId: string): Promise<boolean>;
}

interface UploadResult {
  pageId: string;
  storageKey: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

interface BatchUploadResult {
  successful: UploadResult[];
  failed: {
    id: string;
    error: string;
  }[];
  totalProcessed: number;
}
```

### Implementation Notes

- Uses StorageService for cloud storage operations
- Implements temporary file downloads and cleanup
- Generates unique keys based on page ID and content hash
- Sets appropriate content types and metadata
- Updates Notion entries with the public URL
- Provides retries for failed uploads

## 7. RecordManager

**Purpose**: Track processing state and prevent duplication.

### Responsibilities

- Monitor which records have been processed
- Prevent redundant processing
- Provide progress reporting
- Enable resumable workflows

### Interface

```typescript
interface IRecordManager {
  recordProcessed(
    pageId: string,
    stage: ProcessingStage,
    result: ProcessingResult
  ): Promise<void>;
  isProcessed(pageId: string, stage: ProcessingStage): Promise<boolean>;
  getProcessingStats(): Promise<ProcessingStats>;
  resetFailedRecords(stage?: ProcessingStage): Promise<number>;
  getFailedRecords(stage?: ProcessingStage): Promise<FailedRecord[]>;
}

enum ProcessingStage {
  Metadata = "metadata",
  Content = "content",
  ImageGeneration = "image_generation",
  ImageUpload = "image_upload",
  Complete = "complete",
}

interface ProcessingResult {
  success: boolean;
  error?: string;
  data?: any;
}

interface ProcessingStats {
  totalRecords: number;
  processed: Record<ProcessingStage, number>;
  failed: Record<ProcessingStage, number>;
  pending: Record<ProcessingStage, number>;
}

interface FailedRecord {
  id: string;
  stage: ProcessingStage;
  error: string;
  attempts: number;
  lastAttempt: Date;
}
```

### Implementation Notes

- Uses a local JSON file for state persistence
- Implements atomic file updates for reliability
- Provides detailed statistics for monitoring
- Enables resumable processing
- Supports retry mechanisms for failed operations
- Implements progress tracking and reporting
