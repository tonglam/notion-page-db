# System Architecture

## Overview

The NotionPageDb Migration System is designed with a modular, component-based architecture that separates concerns and promotes code reusability. This document outlines the high-level architecture, component interactions, and data flow.

## Architectural Style

The system follows a modular, service-oriented architecture with the following characteristics:

- **Component-Based**: Functionality is divided into discrete, reusable components
- **Dependency Injection**: Components depend on interfaces rather than concrete implementations
- **Separation of Concerns**: Each component has a specific, well-defined responsibility
- **Clear Dependencies**: Dependencies between components are explicitly defined
- **Type Safety**: TypeScript interfaces define all component contracts

## System Components

The system is divided into two main types of components:

1. **Core Components**: Foundational services that provide essential functionality
2. **Workflow Components**: Process-specific components that implement the business logic

### Core Components

![Core Components Diagram](./images/core-components.png)

1. **NotionDatabase**: Manages all interactions with the Notion database API
2. **NotionContent**: Handles content extraction and transformation
3. **AIService**: Provides integrations with AI models (text and image generation)
4. **StorageService**: Manages cloud storage operations (Cloudflare R2)
5. **ConfigManager**: Handles environment and configuration management

### Workflow Components

![Workflow Components Diagram](./images/workflow-components.png)

1. **DatabaseVerifier**: Validates database existence and schema
2. **ContentFetcher**: Extracts content from source pages
3. **MetadataUpdater**: Updates basic metadata fields
4. **ContentEnricher**: Enriches content with AI-generated information
5. **ImageGenerator**: Generates images from content
6. **ImageUploader**: Uploads images to cloud storage
7. **RecordManager**: Tracks processing state and prevents duplication

## Data Flow

The overall data flow through the system follows this sequence:

```text
[Source Notion Page] → ContentFetcher → [Raw Content]
                                      ↓
[Database Verification] ← DatabaseVerifier
                                      ↓
[Raw Content] → MetadataUpdater → [Basic Metadata]
                                      ↓
[Basic Metadata] → ContentEnricher → [Enhanced Content]
                                      ↓
[Enhanced Content] → ImageGenerator → [Generated Image]
                                      ↓
[Generated Image] → ImageUploader → [Stored Image]
                                      ↓
[Final Record] → NotionDatabase → [Updated Notion DB]
```

## Key Interactions

1. **Content Extraction**:

   - ContentFetcher uses NotionContent to extract data from source pages
   - DatabaseVerifier ensures target database exists with correct schema

2. **Content Processing**:

   - MetadataUpdater processes basic metadata fields
   - ContentEnricher uses AIService to generate summaries and read times
   - RecordManager tracks processing state

3. **Image Processing**:
   - ImageGenerator uses AIService to create images
   - ImageUploader uses StorageService to store images
   - NotionDatabase updates records with image URLs

## Error Handling

The system implements a comprehensive error handling strategy:

1. **Retry Logic**: API calls implement exponential backoff retry
2. **State Management**: Processing state is tracked to enable resumability
3. **Error Boundaries**: Components isolate failures to prevent cascading issues
4. **Logging**: Detailed logging for troubleshooting and monitoring
5. **Validation**: Input and output validation at component boundaries

## Configuration Management

Configuration is managed through:

1. **Environment Variables**: Primary configuration source
2. **Validation**: Config validation at startup
3. **Defaults**: Sensible defaults for non-critical settings
4. **Secret Management**: Secure handling of API keys and credentials

## Performance Considerations

The architecture addresses several performance considerations:

1. **Batching**: Requests are batched to minimize API calls
2. **Rate Limiting**: Built-in rate limit handling
3. **Caching**: Results are cached to prevent redundant operations
4. **Parallelization**: Independent operations can run in parallel
5. **Incremental Processing**: Only process what's necessary based on state
