# API Integration

This document outlines the external API integrations used by the NotionPageDb Migration System and provides details on how they are implemented.

## Overview

The system integrates with several external APIs:

1. **Notion API** - For database and content operations
2. **AI Service APIs** - For text generation and reasoning:
   - DeepSeek API
   - Google Gemini API
   - Alibaba DashScope API
   - OpenAI API (optional)
3. **Image Generation API** - For AI-powered image creation
4. **Cloudflare R2 API** - For cloud storage

## Notion API

### Purpose

The Notion API is used to:

- Access source page content
- Create and verify the target database
- Create and update database entries
- Query database content

### Integration Details

**API Version**: `2022-06-28` or later

**Authentication**:

- Bearer token authentication
- Integration token with appropriate permissions

**Endpoints Used**:

- `GET /v1/databases/{database_id}` - Retrieve database details
- `POST /v1/databases` - Create a new database
- `PATCH /v1/databases/{database_id}` - Update database properties
- `GET /v1/databases/{database_id}/query` - Query database entries
- `GET /v1/pages/{page_id}` - Retrieve page details
- `POST /v1/pages` - Create new pages
- `PATCH /v1/pages/{page_id}` - Update page properties
- `GET /v1/blocks/{block_id}` - Retrieve block content
- `GET /v1/blocks/{block_id}/children` - Retrieve child blocks

**Rate Limiting**:

- 3 requests per second (average)
- 90 requests per minute (burst)
- Exponential backoff implemented for 429 responses

**Implementation**:

```typescript
import { Client } from "@notionhq/client";

export class NotionService implements INotionDatabase {
  private client: Client;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    this.client = new Client({ auth: apiKey });
    this.rateLimiter = new RateLimiter({
      requestsPerSecond: 3,
      maxConcurrent: 5,
    });
  }

  async queryDatabase(
    databaseId: string,
    filter?: QueryFilter
  ): Promise<NotionEntry[]> {
    return this.rateLimiter.schedule(() =>
      this.client.databases.query({
        database_id: databaseId,
        filter: this.transformFilter(filter),
        // ... other parameters
      })
    );
  }

  // ... other methods
}
```

## AI Service APIs

The system supports multiple AI providers through a unified interface, allowing for flexibility and fallback options.

### DeepSeek API

#### Purpose

The DeepSeek API is used for:

- Primary text reasoning and generation
- Content summarization and analysis
- Metadata extraction

#### Integration Details

**API Version**: Latest available

**Authentication**:

- API key authentication
- Environment variable: `DEEPSEEK_API_KEY`

**Implementation**:

```typescript
import axios from "axios";

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await axios.post(
      "https://api.deepseek.com/v1/chat/completions",
      {
        model: options?.model || "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content;
  }

  // ... other methods
}
```

### Google Gemini API

#### Purpose

The Gemini API is used for:

- Specialized reasoning tasks
- Alternative text generation
- Fallback for DeepSeek

#### Integration Details

**API Version**: Latest available

**Authentication**:

- API key authentication
- Environment variable: `GEMINI_API_KEY`

**Implementation**:

```typescript
import axios from "axios";

export class GeminiProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${this.apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: options?.temperature || 0.7,
          maxOutputTokens: options?.maxTokens || 1000,
        },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }

  // ... other methods
}
```

### Alibaba DashScope API

#### Purpose

The DashScope API is used for:

- Specialized content generation
- Alternative text reasoning
- Additional fallback option

#### Integration Details

**API Version**: Latest available

**Authentication**:

- API key authentication
- Environment variable: `DASHSCOPE_API_KEY`

**Implementation**:

```typescript
import axios from "axios";

export class DashScopeProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateText(
    prompt: string,
    options?: GenerationOptions
  ): Promise<string> {
    const response = await axios.post(
      "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
      {
        model: options?.model || "qwen-max",
        input: {
          prompt: prompt,
        },
        parameters: {
          temperature: options?.temperature || 0.7,
          max_tokens: options?.maxTokens || 1000,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.output.text;
  }

  // ... other methods
}
```

### AI Service Factory

The system uses a factory pattern to create and manage AI providers:

```typescript
export class AIServiceFactory {
  private providers: Record<string, AIProvider> = {};

  constructor(config: AIConfigOptions) {
    if (config.deepseek?.apiKey) {
      this.providers.deepseek = new DeepSeekProvider(config.deepseek.apiKey);
    }

    if (config.gemini?.apiKey) {
      this.providers.gemini = new GeminiProvider(config.gemini.apiKey);
    }

    if (config.dashscope?.apiKey) {
      this.providers.dashscope = new DashScopeProvider(config.dashscope.apiKey);
    }

    if (config.openai?.apiKey) {
      this.providers.openai = new OpenAIProvider(config.openai.apiKey);
    }
  }

  getProvider(name?: string): AIProvider {
    if (name && this.providers[name]) {
      return this.providers[name];
    }

    // Default provider logic
    const defaultProvider = process.env.AI_PROVIDER || "deepseek";
    if (this.providers[defaultProvider]) {
      return this.providers[defaultProvider];
    }

    // Fallback to any available provider
    const availableProviders = Object.keys(this.providers);
    if (availableProviders.length > 0) {
      return this.providers[availableProviders[0]];
    }

    throw new Error("No AI provider available");
  }
}
```

## Image Generation API

### Purpose

The Image Generation API is used for:

- Creating featured images for content
- Generating visual representations of technical concepts

### Integration Options

The system supports multiple image generation providers:

**Option 1: DALL-E (OpenAI)**:

- API Version: Latest available
- Authentication: API key
- Endpoint: `/v1/images/generations`
- Features: High quality, good for conceptual images

**Option 2: Stable Diffusion API**:

- API Version: Latest available
- Authentication: API key
- Endpoint: Varies by provider
- Features: More customization, potentially lower cost

**Option 3: Midjourney API**:

- API Version: Latest available
- Authentication: API key
- Endpoint: Varies
- Features: Artistic quality, stylistic control

### Implementation Example

```typescript
import { OpenAI } from "@ai-sdk/openai";

export class OpenAIImageService implements IAIImageService {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
      options: {
        organization: process.env.OPENAI_ORG_ID,
      },
    });
  }

  async generateImage(
    prompt: string,
    options?: ImageOptions
  ): Promise<ImageResult> {
    const response = await this.client.images.generate({
      prompt,
      n: 1,
      size: options?.aspectRatio === "16:9" ? "1024x576" : "1024x1024",
      quality: options?.quality === "hd" ? "hd" : "standard",
      response_format: "url",
    });

    return {
      url: response.data[0].url,
      width: response.data[0].width,
      height: response.data[0].height,
      format: "png",
      expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour
    };
  }
}
```

## Cloudflare R2 Storage API

### Purpose

The Cloudflare R2 Storage API is used for:

- Storing generated images
- Creating permanent URLs for images
- Managing image lifecycle

### Integration Details

**API Compatibility**: S3-compatible API

**Authentication**:

- Access key ID
- Secret access key
- Account ID

**Endpoints Used**:

- `PUT /object/{key}` - Upload objects
- `GET /object/{key}` - Retrieve objects
- `HEAD /object/{key}` - Check if objects exist
- `DELETE /object/{key}` - Delete objects

**Implementation**:

```typescript
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

export class R2StorageService implements IStorageService {
  private client: S3Client;
  private bucketName: string;
  private publicUrlPrefix: string;

  constructor(config: R2Config) {
    this.client = new S3Client({
      region: "auto",
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });

    this.bucketName = config.bucketName;
    this.publicUrlPrefix = config.publicUrlPrefix;
  }

  async uploadImage(
    imageData: Buffer,
    metadata: ImageMetadata
  ): Promise<StorageResult> {
    const key = `images/${metadata.filename}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: imageData,
      ContentType: metadata.contentType,
      Metadata: this.formatMetadata(metadata.tags || {}),
    });

    const result = await this.client.send(command);

    return {
      key,
      url: `${this.publicUrlPrefix}/${key}`,
      eTag: result.ETag?.replace(/"/g, "") || "",
      size: imageData.length,
    };
  }

  // ... other methods
}
```

## API Configuration

All API configurations are managed through the ConfigManager component:

```typescript
export class ConfigManager implements IConfigManager {
  private config: Record<string, any>;

  constructor() {
    // Load from .env file
    this.config = {
      notion: {
        apiKey: process.env.NOTION_API_KEY,
        sourcePageId: process.env.SOURCE_PAGE_ID,
        databaseId: process.env.NOTION_DATABASE_ID,
        rateLimitDelay: parseInt(
          process.env.NOTION_RATE_LIMIT_DELAY || "350",
          10
        ),
      },
      ai: {
        provider: process.env.AI_PROVIDER || "deepseek",
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
        modelId: process.env.AI_MODEL_ID || "deepseek-r1-chat",
        imageModel: process.env.IMAGE_MODEL || "dall-e-3",
        maxRetries: parseInt(process.env.AI_MAX_RETRIES || "3", 10),
      },
      storage: {
        provider: process.env.STORAGE_PROVIDER || "r2",
        accountId: process.env.R2_ACCOUNT_ID,
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        bucketName: process.env.R2_BUCKET_NAME,
        publicUrlPrefix: process.env.R2_PUBLIC_URL,
      },
    };
  }

  getNotionConfig(): NotionConfig {
    return this.config.notion;
  }

  // ... other methods
}
```

## Error Handling

Each API integration includes proper error handling:

1. **Retries**: Automatic retries for transient errors
2. **Fallbacks**: Fallback to alternative providers when available
3. **Logging**: Detailed error logging for troubleshooting
4. **Rate Limiting**: Respect for API rate limits with exponential backoff

## Security Considerations

The system implements the following security measures:

1. **API Key Management**: Keys stored in environment variables, not in code
2. **Minimal Permissions**: Using the principle of least privilege
3. **Secure Transmission**: HTTPS for all API communication
4. **Content Validation**: Validating inputs and outputs to prevent injection
5. **Audit Logging**: Logging all significant API operations

## Monitoring and Observability

API interactions include:

1. **Performance Tracking**: Tracking response times
2. **Usage Metrics**: Monitoring API usage to prevent quota issues
3. **Error Rates**: Tracking error rates by API
4. **Cost Tracking**: Monitoring usage for cost control (especially for AI services)

## Future API Considerations

The system is designed to allow easy addition of new API integrations:

1. **Provider Abstraction**: Abstract interfaces allow swapping providers
2. **Configuration Driven**: API selection through configuration
3. **Feature Flags**: Enable/disable features based on available APIs
4. **Version Management**: Handle API version changes gracefully
