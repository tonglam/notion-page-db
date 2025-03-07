# Configuration Guide

This document provides a comprehensive guide for configuring the NotionPageDb Migration System. It covers environment variables, configuration files, and runtime options.

## Environment Variables

The system uses environment variables for most configuration. These can be set in a `.env` file in the project root or through your system's environment.

### Required Environment Variables

| Variable               | Description                      | Example                                    |
| ---------------------- | -------------------------------- | ------------------------------------------ |
| `NOTION_API_KEY`       | Notion API integration token     | `secret_abcd1234...`                       |
| `SOURCE_PAGE_ID`       | ID of the source Notion page     | `d5e4e5143d2c4a6fa8ca3ab2f162c22c`         |
| `NOTION_DATABASE_ID`   | ID of the target Notion database | `1ab7ef86-a5ad-81ab-a4cb-f8b8f37ec491`     |
| `DEEPSEEK_API_KEY`     | API key for DeepSeek             | `ds_key_1234abcd...`                       |
| `R2_ACCOUNT_ID`        | Cloudflare account ID            | `abcdef123456...`                          |
| `R2_ACCESS_KEY_ID`     | R2 access key ID                 | `AKIAIOSFODNN7EXAMPLE`                     |
| `R2_SECRET_ACCESS_KEY` | R2 secret access key             | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `R2_BUCKET_NAME`       | R2 bucket name                   | `notion-images`                            |
| `R2_PUBLIC_URL`        | Public URL prefix for R2 bucket  | `https://pub-12345.r2.dev`                 |

### Optional Environment Variables

| Variable                    | Description                           | Default                   | Example            |
| --------------------------- | ------------------------------------- | ------------------------- | ------------------ |
| `NOTION_RATE_LIMIT_DELAY`   | Delay between Notion API calls (ms)   | `350`                     | `500`              |
| `AI_PROVIDER`               | AI provider for text services         | `deepseek`                | `openai`           |
| `AI_MODEL_ID`               | Model ID for text generation          | `deepseek-r1-chat`        | `gpt-4`            |
| `IMAGE_MODEL`               | Model for image generation            | `dall-e-3`                | `sd-xl`            |
| `AI_MAX_RETRIES`            | Maximum retries for AI calls          | `3`                       | `5`                |
| `STORAGE_PROVIDER`          | Cloud storage provider                | `r2`                      | `s3`               |
| `LOG_LEVEL`                 | Logging level                         | `info`                    | `debug`            |
| `BATCH_SIZE`                | Number of items to process in a batch | `5`                       | `10`               |
| `DELAY_BETWEEN_BATCHES`     | Delay between processing batches (ms) | `1000`                    | `2000`             |
| `MAX_CONCURRENT_OPERATIONS` | Maximum concurrent operations         | `3`                       | `5`                |
| `STATE_FILE_PATH`           | Path to state file                    | `./processing-state.json` | `/data/state.json` |

### Example .env File

```env
# Notion API Configuration
NOTION_API_KEY=secret_abcd1234...
SOURCE_PAGE_ID=d5e4e5143d2c4a6fa8ca3ab2f162c22c
NOTION_DATABASE_ID=1ab7ef86-a5ad-81ab-a4cb-f8b8f37ec491
NOTION_RATE_LIMIT_DELAY=350

# AI Service Configuration
DEEPSEEK_API_KEY=ds_key_1234abcd...
AI_PROVIDER=deepseek
AI_MODEL_ID=deepseek-r1-chat
IMAGE_MODEL=dall-e-3
AI_MAX_RETRIES=3

# Storage Configuration
R2_ACCOUNT_ID=abcdef123456...
R2_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
R2_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
R2_BUCKET_NAME=notion-images
R2_PUBLIC_URL=https://pub-12345.r2.dev
STORAGE_PROVIDER=r2

# Processing Configuration
LOG_LEVEL=info
BATCH_SIZE=5
DELAY_BETWEEN_BATCHES=1000
MAX_CONCURRENT_OPERATIONS=3
STATE_FILE_PATH=./processing-state.json
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
