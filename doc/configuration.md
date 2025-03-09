# Configuration Guide

This document provides a comprehensive guide for configuring the NotionPageDb Migration System. It covers environment variables, configuration files, and runtime options.

## Environment Variables

The system uses environment variables for most configuration. These can be set in a `.env` file in the project root or through your system's environment.

### Required Environment Variables

| Variable                    | Description                       | Example                                    |
| --------------------------- | --------------------------------- | ------------------------------------------ |
| `NOTION_API_KEY`            | Notion API integration token      | `ntn_34083349933AmK...`                    |
| `NOTION_SOURCE_PAGE_ID`     | ID of the source Notion page      | `d5e4e5143d2c4a6fa8ca3ab2f162c22c`         |
| `STORAGE_ACCESS_KEY_ID`     | Storage access key ID (or R2\_\*) | `AKIAIOSFODNN7EXAMPLE`                     |
| `STORAGE_SECRET_ACCESS_KEY` | Storage secret key (or R2\_\*)    | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `STORAGE_ACCOUNT_ID`        | Storage account ID (or R2\_\*)    | `abcdef123456...`                          |
| `STORAGE_BUCKET_NAME`       | Storage bucket name (or R2\_\*)   | `notion-images`                            |
| `STORAGE_PUBLIC_URL`        | Public URL prefix (or R2\_\*)     | `https://pub-12345.r2.dev`                 |

### AI Provider Configuration

The system supports multiple AI providers. At least one provider must be configured:

| Provider  | Required Variable   | Description                   | Example                |
| --------- | ------------------- | ----------------------------- | ---------------------- |
| DeepSeek  | `DEEPSEEK_API_KEY`  | API key for DeepSeek          | `sk-16cb220c7147...`   |
| Gemini    | `GEMINI_API_KEY`    | API key for Google Gemini     | `AIzaSyCSoVGji6I9j...` |
| DashScope | `DASHSCOPE_API_KEY` | API key for Alibaba DashScope | `sk-150a78023f63...`   |
| OpenAI    | `AI_API_KEY`        | API key for OpenAI            | `sk-abc123...`         |

### Optional Environment Variables

| Variable                      | Description                           | Default                   | Example            |
| ----------------------------- | ------------------------------------- | ------------------------- | ------------------ |
| `NOTION_TARGET_DATABASE_NAME` | Name of the target Notion database    | `Content Database`        | `Blog Posts`       |
| `NOTION_RATE_LIMIT_DELAY`     | Delay between Notion API calls (ms)   | `350`                     | `500`              |
| `AI_PROVIDER`                 | Default AI provider for text services | `deepseek`                | `openai`           |
| `AI_MODEL`                    | Model for text generation             | Provider-specific default | `gpt-3.5-turbo`    |
| `AI_IMAGE_MODEL`              | Model for image generation            | `dall-e-3`                | `sd-xl`            |
| `AI_MAX_TOKENS`               | Max tokens for AI responses           | `1000`                    | `2000`             |
| `AI_TEMPERATURE`              | Temperature for AI responses          | `0.7`                     | `0.5`              |
| `STORAGE_REGION`              | Storage region (or R2\_\*)            | `auto`                    | `us-east-1`        |
| `STORAGE_USE_PRESIGNED_URLS`  | Use presigned URLs (or R2\_\*)        | `false`                   | `true`             |
| `LOG_LEVEL`                   | Logging level                         | `info`                    | `debug`            |
| `BATCH_SIZE`                  | Number of items to process in a batch | `5`                       | `10`               |
| `DELAY_BETWEEN_BATCHES`       | Delay between processing batches (ms) | `1000`                    | `2000`             |
| `MAX_CONCURRENT_OPERATIONS`   | Maximum concurrent operations         | `3`                       | `5`                |
| `STATE_FILE_PATH`             | Path to state file                    | `./processing-state.json` | `/data/state.json` |

### Storage Variable Naming Conventions

The system supports two naming conventions for storage variables:

1. `STORAGE_*` prefix (e.g., `STORAGE_ACCESS_KEY_ID`)
2. `R2_*` prefix (e.g., `R2_ACCESS_KEY_ID`)

Both naming conventions are equivalent and the system will check for both. If both are provided, the `STORAGE_*` variables take precedence.

### Database Resolution Process

The system uses the following process to determine which Notion database to use:

1. It will search for a database with the name specified in `NOTION_TARGET_DATABASE_NAME`.
2. If a database with that name is found, it will use that database.
3. If no matching database is found, it will create a new database with that name under the source page.

This flexibility allows you to either use an existing database or have the system automatically create a database for you.

### Example .env File

```env
# NotionPageDb Migration System Configuration

# Notion API Configuration
NOTION_API_KEY=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
NOTION_SOURCE_PAGE_ID=d5e4e5143d2c4a6fa8ca3ab2f162c22c
NOTION_TARGET_DATABASE_NAME=Content Database
NOTION_RATE_LIMIT_DELAY=350

# AI API Keys
# DeepSeek Configuration
DEEPSEEK_API_KEY=sk-16cb220c7147444986d602174c192c2e

# Gemini Configuration
GEMINI_API_KEY=AIzaSyCSoVGji6I9jI69GJPoBsW_3Ywc06sGJlE

# DashScope Configuration
# Get one from https://dashscope.aliyun.com/
DASHSCOPE_API_KEY=sk-150a78023f634e0591345cfba57adf40

# Cloudflare R2 Configuration
# Using R2_* prefix variables - these are equivalent to STORAGE_* variables
R2_ACCOUNT_ID=9edbc126b7b35ff11191d10bfc0ecb18
R2_ACCESS_KEY_ID=0ed5d101c7165118e35abf546379ed72
R2_SECRET_ACCESS_KEY=b9bd86205f6d53bd643f68ebb17c735b62f287b30af92d504c11f4c4cc28abe0
R2_BUCKET_NAME=portfolio
R2_PUBLIC_URL=https://pub-d90b0cc85d7d46818dd84dcb9bb4e33d.r2.dev
R2_REGION=auto
R2_USE_PRESIGNED_URLS=false
```

## Configuration Files

In addition to environment variables, certain aspects of the system can be configured through JSON files.

### Database Schema Configuration

The database schema can be customized through a schema configuration file:

**File Path**: `config/database-schema.json`

**Example**:

```json
{
  "properties": {
    "Category": {
      "type": "select",
      "options": [
        { "name": "JavaScript", "color": "yellow" },
        { "name": "Python", "color": "blue" },
        { "name": "React", "color": "green" },
        { "name": "TypeScript", "color": "purple" }
      ]
    },
    "Status": {
      "type": "select",
      "options": [
        { "name": "Draft", "color": "gray" },
        { "name": "Ready", "color": "green" },
        { "name": "Review", "color": "yellow" },
        { "name": "Published", "color": "blue" }
      ]
    },
    "Published": {
      "type": "checkbox",
      "description": "Whether the content is published"
    }
  }
}
```

### AI Prompts Configuration

AI prompts can be customized through a prompts configuration file:

**File Path**: `config/ai-prompts.json`

**Example**:

```json
{
  "summary": {
    "template": "Generate a concise summary (2-3 sentences) for the following technical content:\n\n{{content}}\n\nSummary:",
    "maxTokens": 100,
    "temperature": 0.3
  },
  "readingTime": {
    "template": "Estimate the reading time in minutes for the following content. Return only a number:\n\n{{content}}\n\nReading time (minutes):",
    "maxTokens": 10,
    "temperature": 0.1
  },
  "imagePrompt": {
    "template": "Create a vivid, conceptual image for an article titled '{{title}}' about {{summary}}. The image should represent the technical concept in a clear, memorable way.",
    "maxTokens": 100,
    "temperature": 0.7
  }
}
```

### Category Mapping Configuration

Custom category mapping can be configured through a mapping file:

**File Path**: `config/category-mapping.json`

**Example**:

```json
{
  "mappings": [
    {
      "source": "JavaScript",
      "target": "Web Development",
      "prefix": "",
      "applyToChildren": true
    },
    {
      "source": "MIT Units",
      "pattern": ".*",
      "prefix": "CITS",
      "exclude": ["Overview", "Introduction"]
    }
  ],
  "defaultCategory": "Uncategorized"
}
```

## Command-Line Options

The application supports various command-line options for controlling execution:

| Option                | Description                        | Default             |
| --------------------- | ---------------------------------- | ------------------- |
| `--verify-only`       | Only verify database, don't modify | `false`             |
| `--limit <n>`         | Limit processing to N entries      | All entries         |
| `--single-entry <id>` | Process only a single entry        | None                |
| `--skip-images`       | Skip image generation              | `false`             |
| `--skip-summaries`    | Skip summary generation            | `false`             |
| `--force-update`      | Force update existing entries      | `false`             |
| `--dry-run`           | Simulate execution without changes | `false`             |
| `--config <path>`     | Path to custom config file         | Default paths       |
| `--verbose`           | Enable verbose logging             | `false`             |
| `--reset-pending`     | Reset pending operations           | `false`             |
| `--clean-mapping`     | Clean mapping file                 | `false`             |
| `--batch-size <n>`    | Set batch size                     | From env or default |
| `--delay <ms>`        | Set delay between operations       | From env or default |

### Example Commands

```bash
# Verify database only
npm run start -- --verify-only

# Process a single entry
npm run start -- --single-entry d5e4e5143d2c4a6fa8ca3ab2f162c22c

# Process with custom batch size and delay
npm run start -- --batch-size 3 --delay 500

# Skip image generation and force update
npm run start -- --skip-images --force-update

# Run with custom config file
npm run start -- --config ./custom-config.json
```

## Runtime Configuration

Certain aspects of the system can be configured during runtime through the application interface or API:

### Feature Flags

Feature flags can be used to enable or disable specific features:

| Flag                       | Description                        | Default |
| -------------------------- | ---------------------------------- | ------- |
| `enableImageGeneration`    | Enable/disable image generation    | `true`  |
| `enableSummaryGeneration`  | Enable/disable summary generation  | `true`  |
| `enableR2Upload`           | Enable/disable R2 uploads          | `true`  |
| `enableAtomicUpdates`      | Enable/disable atomic updates      | `true`  |
| `enableParallelProcessing` | Enable/disable parallel processing | `true`  |

### Rate Limiting Configuration

Rate limiting can be configured at runtime:

| Setting                    | Description                     | Default |
| -------------------------- | ------------------------------- | ------- |
| `notionRequestsPerSecond`  | Notion API requests per second  | `3`     |
| `aiRequestsPerMinute`      | AI API requests per minute      | `50`    |
| `storageRequestsPerSecond` | Storage API requests per second | `10`    |

### Caching Configuration

Caching can be configured at runtime:

| Setting                 | Description                     | Default |
| ----------------------- | ------------------------------- | ------- |
| `enableResponseCaching` | Enable/disable response caching | `true`  |
| `cacheTTL`              | Cache time-to-live (seconds)    | `3600`  |
| `maxCacheSize`          | Maximum cache size (items)      | `1000`  |

## Configuration Validation

The system validates all configuration on startup:

1. **Required Fields**: Checks that all required fields are present
2. **Format Validation**: Validates format of IDs, keys, and URLs
3. **Connectivity Tests**: Verifies connectivity to external services
4. **Permission Checks**: Verifies API keys have necessary permissions
5. **Compatibility Checks**: Ensures configured services are compatible

## Configuration Best Practices

1. **Security**:

   - Never commit `.env` files to version control
   - Use environment variables for sensitive data
   - Rotate API keys periodically

2. **Performance**:

   - Adjust batch sizes based on system capabilities
   - Configure rate limits appropriate for your API quotas
   - Enable caching for improved performance

3. **Reliability**:

   - Configure appropriate retry counts and delays
   - Use atomic updates to prevent data corruption
   - Implement proper error handling with logging

4. **Maintenance**:
   - Document custom configurations
   - Use version control for configuration files
   - Keep a backup of working configurations

## Troubleshooting

Common configuration issues and their solutions:

1. **API Key Issues**:

   - Ensure keys have proper permissions
   - Check for whitespace in copied keys
   - Verify keys haven't expired

2. **Rate Limiting**:

   - Increase delays between requests
   - Reduce batch sizes
   - Implement exponential backoff

3. **Memory Issues**:

   - Reduce concurrent operations
   - Process data in smaller batches
   - Implement garbage collection hooks

4. **Database Issues**:
   - Verify database IDs are correct
   - Check for permission issues
   - Validate schema compatibility
