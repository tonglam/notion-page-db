# NotionPageDb Migration System

A TypeScript-based system for migrating content from Notion pages to a structured Notion database with AI-powered enhancements and Cloudflare R2 storage integration.

## Features

- **Content Extraction**: Extract content from Notion pages and subpages
- **AI Enhancement**: Generate summaries, excerpts, tags, and images using AI
- **Database Management**: Create or update entries in a Notion database
- **Image Processing**: Download, generate, and store images
- **Cloudflare R2 Storage**: Store and serve images using Cloudflare's S3-compatible storage
- **Configurable**: Customize the migration process through environment variables

## Installation

```bash
# Clone the repository
git clone https://github.com/tonglam/notion-page-db.git
cd notion-page-db

# Install dependencies
npm install

# Build the project
npm run build
```

## Configuration

The system is configured using environment variables through a `.env` file.

### Environment Variables

Copy the `.env.example` file to `.env` and fill in your values:

```bash
cp .env.example .env
```

> See the [Configuration Guide](./doc/configuration.md) for a comprehensive list of all supported environment variables.

### Cloudflare R2 Setup

This project uses Cloudflare R2 for storing and serving images. To set up R2:

1. Create a Cloudflare account if you don't have one
2. Navigate to R2 in the Cloudflare dashboard
3. Create a new bucket for your images
4. Create API tokens with read/write access
5. Configure the public access for your bucket
6. Update your `.env` file with the R2 credentials

## Usage

### Command Line

```bash
# Run with default options
npm start

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

// Run with custom options
await migrate({
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
- `R2ImageUrl` (url): URL of the stored image in Cloudflare R2
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
