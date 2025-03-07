# NotionPageDb Migration System

A TypeScript-based system for migrating content from Notion pages to a structured Notion database with AI-powered enhancements.

## Features

- **Content Extraction**: Extract content from Notion pages and subpages
- **AI Enhancement**: Generate summaries, excerpts, tags, and images using AI
- **Database Management**: Create or update entries in a Notion database
- **Image Processing**: Download, generate, and store images
- **Configurable**: Customize the migration process via configuration files or environment variables

## Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/notionpagedb.git
cd notionpagedb

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

You can configure the system using environment variables or a configuration file.

### Environment Variables

Copy the `.env.example` file to `.env` and fill in your values:

```bash
cp .env.example .env
```

### Configuration File

Alternatively, you can create a JSON configuration file:

```json
{
  "notion": {
    "apiKey": "your-notion-api-key",
    "sourcePageId": "your-source-page-id",
    "targetDatabaseId": "your-target-database-id",
    "rateLimitDelay": 350
  },
  "ai": {
    "provider": "openai",
    "apiKey": "your-openai-api-key",
    "model": "gpt-3.5-turbo",
    "imageModel": "dall-e-3"
  },
  "storage": {
    "provider": "s3",
    "accessKeyId": "your-aws-access-key-id",
    "secretAccessKey": "your-aws-secret-access-key",
    "bucketName": "your-bucket-name",
    "region": "us-east-1"
  }
}
```

## Usage

### Command Line

```bash
# Run with default options
npm start

# Run with a custom configuration file
npm start -- --config ./config/custom.json

# Disable content enhancement
npm start -- --no-enhance

# Disable image processing
npm start -- --no-images

# Disable image generation
npm start -- --no-generate-images

# Show help
npm start -- --help
```

### Programmatic Usage

```typescript
import { migrate } from "notionpagedb";

// Run with default options
await migrate();

// Run with a custom configuration file
await migrate("./config/custom.json");

// Run with custom options
await migrate(undefined, {
  enhanceContent: true,
  processImages: true,
  generateImages: false,
});
```

## Database Schema

The system requires a Notion database with the following properties:

- `Title` (title): Title of the content
- `Category` (select): Category of the content
- `Tags` (multi-select): Tags for the content
- `Summary` (rich_text): AI-generated summary
- `Excerpt` (rich_text): Short excerpt for previews
- `Mins Read` (number): Estimated reading time
- `Image` (url): URL of the content image
- `R2ImageUrl` (url): URL of the stored image
- `Date Created` (date): Creation date of the content
- `Status` (select): Status of the content (Draft, Ready, Review, Published)
- `Original Page` (url): URL of the original Notion page
- `Published` (checkbox): Whether the content is published

## Development

```bash
# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## License

MIT
