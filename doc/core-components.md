# Core Components

This document provides detailed specifications for the core components of the NotionPageDb Migration System. These components form the foundation of the system and provide essential services to the workflow components.

## 1. NotionDatabase

**Purpose**: Manage all interactions with the Notion database API.

### Responsibilities

- Verify database existence and schema
- Create database if needed with proper fields
- Query database entries efficiently
- Create/update database entries
- Handle rate limiting and retries

### Interface

```typescript
interface INotionDatabase {
  verifyDatabase(): Promise<boolean>;
  createDatabase(schema: DatabaseSchema): Promise<string>;
  queryEntries(filter?: QueryFilter): Promise<NotionEntry[]>;
  createEntry(data: EntryData): Promise<string>;
  updateEntry(pageId: string, data: Partial<EntryData>): Promise<void>;
  batchUpdateEntries(
    entries: Array<{ id: string; data: Partial<EntryData> }>
  ): Promise<void>;
}

interface DatabaseSchema {
  name: string;
  properties: Record<string, PropertyDefinition>;
}

interface PropertyDefinition {
  type:
    | "title"
    | "rich_text"
    | "select"
    | "multi_select"
    | "number"
    | "url"
    | "date"
    | "files"
    | "checkbox";
  options?: Array<{ name: string; color?: string }>; // For select/multi_select
}

interface QueryFilter {
  property?: string;
  value?: any;
  condition?:
    | "equals"
    | "contains"
    | "greater_than"
    | "less_than"
    | "is_empty"
    | "is_not_empty";
  limit?: number;
  startCursor?: string;
}

interface NotionEntry {
  id: string;
  properties: Record<string, any>;
  createdTime: string;
  lastEditedTime: string;
}

interface EntryData {
  title: string;
  [key: string]: any; // Other properties
}
```

### Implementation Notes

- Uses the `@notionhq/client` package
- Implements exponential backoff for rate limiting
- Batches requests where possible
- Validates inputs before API calls
- Handles error cases with detailed logging

## 2. NotionContent

**Purpose**: Extract and transform content from Notion pages.

### Responsibilities

- Fetch page content from source
- Identify categories and valid content pages
- Extract text from rich text blocks
- Generate excerpts and estimate reading time
- Extract tags and metadata

### Interface

```typescript
interface INotionContent {
  fetchPageContent(pageId: string): Promise<PageContent>;
  extractCategories(pageId: string): Promise<Category[]>;
  extractValidContent(pageId: string): Promise<ContentPage[]>;
  generateExcerpt(content: string, maxLength?: number): string;
  extractTags(content: string, title: string, category?: string): string[];
  estimateReadingTime(content: string): number;
}

interface PageContent {
  title: string;
  blocks: Block[];
  properties?: Record<string, any>;
  createdTime: string;
  lastEditedTime: string;
}

interface Block {
  id: string;
  type: string;
  content: any;
  hasChildren: boolean;
}

interface Category {
  id: string;
  name: string;
  type: "regular" | "mit"; // Regular category or MIT unit with CITS prefix
}

interface ContentPage {
  id: string;
  title: string;
  parentId: string;
  category?: string;
  content: string;
  createdTime: string;
  lastEditedTime: string;
}
```

### Implementation Notes

- Recursively processes Notion pages and blocks
- Handles different block types properly
- Extracts plain text with appropriate formatting
- Implements caching to prevent redundant fetches
- Identifies MIT units for CITS prefixing

## 3. AIService

**Purpose**: Integrate with various AI services for content enrichment.

### Responsibilities

- Generate summaries using text-based AI models
- Estimate reading time
- Generate images based on content
- Handle API rate limits and retries

### Interface

```typescript
interface IAIService {
  generateSummary(content: string, options?: SummaryOptions): Promise<string>;
  estimateReadingTime(content: string): Promise<number>;
  generateImage(
    title: string,
    summary: string,
    options?: ImageOptions
  ): Promise<ImageResult>;
}

interface SummaryOptions {
  maxLength?: number;
  style?: "concise" | "detailed" | "technical";
  includeKeyPoints?: boolean;
}

interface ImageOptions {
  style?: string;
  aspectRatio?: "1:1" | "16:9" | "4:3";
  quality?: "standard" | "hd";
}

interface ImageResult {
  url: string;
  width: number;
  height: number;
  format: string;
  expiresAt?: Date;
}
```

### Implementation Notes

- Uses Vercel AI SDK for model integration
- Supports DeepSeek R1 for text reasoning
- Implements proper prompt engineering
- Handles context limitations
- Implements caching for optimization
- Supports multiple image generation models

## 4. StorageService

**Purpose**: Manage cloud storage operations.

### Responsibilities

- Upload images to Cloudflare R2
- Generate public URLs
- Handle file operations
- Verify existing resources

### Interface

```typescript
interface IStorageService {
  uploadImage(
    imageData: Buffer | ReadableStream,
    metadata: ImageMetadata
  ): Promise<StorageResult>;
  getPublicUrl(key: string): string;
  resourceExists(key: string): Promise<boolean>;
  deleteResource(key: string): Promise<boolean>;
  listResources(prefix?: string): Promise<StorageItem[]>;
}

interface ImageMetadata {
  filename: string;
  contentType: string;
  tags?: Record<string, string>;
}

interface StorageResult {
  key: string;
  url: string;
  eTag: string;
  size: number;
}

interface StorageItem {
  key: string;
  size: number;
  lastModified: Date;
  eTag: string;
}
```

### Implementation Notes

- Uses AWS SDK for S3-compatible storage
- Implements proper error handling
- Optimizes uploads with the right content types
- Handles large files efficiently
- Implements connection pooling
- Retries failed operations

## 5. ConfigManager

**Purpose**: Manage application configuration.

### Responsibilities

- Load environment variables
- Validate required configuration
- Provide configuration to components

### Interface

```typescript
interface IConfigManager {
  getNotionConfig(): NotionConfig;
  getAIConfig(): AIConfig;
  getStorageConfig(): StorageConfig;
  validate(): ValidationResult;
  getConfigValue<T>(key: string, defaultValue?: T): T;
  loadConfig(path?: string): void;
}

interface NotionConfig {
  apiKey: string;
  sourcePageId: string;
  databaseId?: string;
  rateLimitDelay: number;
}

interface AIConfig {
  provider: "deepseek" | "openai" | "anthropic";
  apiKey: string;
  modelId: string;
  imageModel?: string;
  maxRetries: number;
}

interface StorageConfig {
  provider: "r2" | "s3";
  accountId?: string; // For R2
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicUrlPrefix: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
```

### Implementation Notes

- Uses dotenv for environment variable loading
- Validates required fields with helpful error messages
- Provides sensible defaults where appropriate
- Supports different configuration sources
- Masks sensitive information in logs
- Implements secure storage of secrets
