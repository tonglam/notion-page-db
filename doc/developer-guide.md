# Developer Guide

This guide provides information for developers working on the NotionPageDb Migration System, including setup instructions, code organization, and development best practices.

## Development Environment Setup

### Prerequisites

- Node.js v18+ (LTS recommended)
- npm v8+ or yarn v1.22+
- Git
- A code editor with TypeScript support (VS Code recommended)

### Initial Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/your-org/notion-page-db.git
   cd notion-page-db
   ```

2. Install dependencies:

   ```bash
   npm install
   # or
   yarn install
   ```

3. Copy the environment template:

   ```bash
   cp .env.example .env
   ```

4. Configure your environment variables in the `.env` file with your API keys and configuration.

5. Build the project:

   ```bash
   npm run build
   # or
   yarn build
   ```

### Development Scripts

The following npm scripts are available:

| Script               | Description                                  |
| -------------------- | -------------------------------------------- |
| `npm run dev`        | Start the development server with hot-reload |
| `npm run build`      | Build the project for production             |
| `npm run start`      | Run the production build                     |
| `npm run test`       | Run tests                                    |
| `npm run test:watch` | Run tests in watch mode                      |
| `npm run lint`       | Run ESLint                                   |
| `npm run format`     | Format code with Prettier                    |
| `npm run type-check` | Run TypeScript type checking                 |

## Project Structure

The project follows a modular architecture with clear separation of concerns:

```text
notion-page-db/
├── src/                  # Source code
│   ├── core/             # Core components
│   │   ├── notion/       # Notion API integration
│   │   ├── ai/           # AI service integration
│   │   ├── storage/      # Storage service integration
│   │   └── config/       # Configuration management
│   ├── workflow/         # Workflow components
│   │   ├── database/     # Database verification
│   │   ├── content/      # Content extraction
│   │   ├── metadata/     # Metadata management
│   │   ├── enrichment/   # Content enrichment
│   │   ├── images/       # Image generation
│   │   └── records/      # Record management
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── constants/        # Constants and enums
│   └── index.ts          # Main entry point
├── config/               # Configuration files
├── scripts/              # Utility scripts
├── tests/                # Test files
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── fixtures/         # Test fixtures
├── doc/                  # Documentation
├── .env.example          # Environment variables template
├── package.json          # Project metadata and dependencies
├── tsconfig.json         # TypeScript configuration
└── README.md             # Project overview
```

## Core Components

### Dependency Injection

The system uses a simple dependency injection pattern for managing component dependencies:

```typescript
// Example: Creating services with dependency injection
const configManager = new ConfigManager();
const notionService = new NotionService(configManager.getNotionConfig());
const aiService = new AIService(configManager.getAIConfig());
const storageService = new StorageService(configManager.getStorageConfig());

// Example: Creating workflow components with dependencies
const databaseVerifier = new DatabaseVerifier(notionService, configManager);
const contentFetcher = new ContentFetcher(notionService);
```

### Error Handling

The system uses a standardized error handling approach:

```typescript
// Example: Standard error handling
try {
  await operation();
} catch (error) {
  if (error instanceof NotionApiError) {
    // Handle Notion API errors
    if (error.isRateLimited()) {
      await this.handleRateLimiting(error);
    } else {
      this.logger.error("Notion API error:", error);
      throw new OperationError("Failed to perform Notion operation", {
        cause: error,
      });
    }
  } else if (error instanceof NetworkError) {
    // Handle network errors
    this.logger.warn("Network error, retrying:", error);
    return this.retry(() => operation());
  } else {
    // Handle other errors
    this.logger.error("Unexpected error:", error);
    throw error;
  }
}
```

### Logging

The system uses a centralized logging approach:

```typescript
// Example: Using the logger
import { Logger } from "../utils/logger";

export class ExampleService {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("ExampleService");
  }

  async performOperation(): Promise<void> {
    this.logger.info("Starting operation");
    try {
      // Operation code
      this.logger.debug("Operation details", { detail: "value" });
      this.logger.info("Operation completed successfully");
    } catch (error) {
      this.logger.error("Operation failed", error);
      throw error;
    }
  }
}
```

## Development Workflow

### Feature Development Process

1. **Create a Feature Branch**:

   ```bash
   git checkout -b feature/feature-name
   ```

2. **Implement the Feature**:

   - Write code following the project's style and architecture
   - Add tests for the feature
   - Update documentation as needed

3. **Run Tests and Linting**:

   ```bash
   npm run lint
   npm run test
   ```

4. **Create a Pull Request**:
   - Push your branch
   - Create a pull request with a clear description
   - Address review comments

### Code Style and Best Practices

1. **TypeScript Best Practices**:

   - Use strict typing (avoid `any` types)
   - Prefer interfaces over types for objects
   - Use proper error handling with typed errors
   - Use async/await for asynchronous code

2. **Naming Conventions**:

   - Use `PascalCase` for classes and interfaces
   - Use `camelCase` for variables and functions
   - Use `UPPER_SNAKE_CASE` for constants
   - Use descriptive names that reflect purpose

3. **Code Organization**:

   - Follow single responsibility principle
   - Keep functions small and focused
   - Use proper encapsulation
   - Document public APIs

4. **Testing**:
   - Write unit tests for all components
   - Use mocks for external dependencies
   - Test error handling and edge cases
   - Maintain high test coverage

## Component Development Guide

### Creating a New Component

1. **Define the Interface**:

   ```typescript
   // src/types/myComponent.ts
   export interface IMyComponent {
     performOperation(input: InputType): Promise<OutputType>;
     // Other methods
   }

   export interface InputType {
     // Input properties
   }

   export interface OutputType {
     // Output properties
   }
   ```

2. **Implement the Component**:

   ```typescript
   // src/workflow/myFeature/myComponent.ts
   import {
     IMyComponent,
     InputType,
     OutputType,
   } from "../../types/myComponent";
   import { Logger } from "../../utils/logger";

   export class MyComponent implements IMyComponent {
     private logger: Logger;

     constructor(private dependencies: Dependencies) {
       this.logger = new Logger("MyComponent");
     }

     async performOperation(input: InputType): Promise<OutputType> {
       this.logger.info("Starting operation", { input });

       // Implementation

       return result;
     }
   }
   ```

3. **Write Tests**:

   ```typescript
   // tests/unit/workflow/myFeature/myComponent.test.ts
   import { MyComponent } from "../../../../src/workflow/myFeature/myComponent";

   describe("MyComponent", () => {
     let component: MyComponent;
     let mockDependencies;

     beforeEach(() => {
       mockDependencies = {
         // Mock dependencies
       };
       component = new MyComponent(mockDependencies);
     });

     it("should perform operation successfully", async () => {
       // Test implementation
     });

     it("should handle errors properly", async () => {
       // Test error handling
     });
   });
   ```

4. **Register in Dependency Container**:

   ```typescript
   // src/container.ts
   import { MyComponent } from "./workflow/myFeature/myComponent";

   export function buildContainer() {
     // Other registrations

     const myComponent = new MyComponent({
       // Provide dependencies
     });

     return {
       // Other components
       myComponent,
     };
   }
   ```

### Extending Existing Components

When extending existing components:

1. **Inherit from Base Classes**:

   ```typescript
   import { BaseService } from "../core/baseService";

   export class MyExtendedService extends BaseService {
     // Additional properties

     constructor(config, otherDependencies) {
       super(config);
       // Initialize additional properties
     }

     // Override methods as needed
     async performOperation(): Promise<Result> {
       await super.performOperation();
       // Additional logic
     }

     // New methods
   }
   ```

2. **Use Composition for Complex Extensions**:

   ```typescript
   export class ComplexComponent implements IComplexComponent {
     constructor(
       private baseComponent: IBaseComponent,
       private additionalServices: AdditionalServices
     ) {}

     async performOperation(): Promise<Result> {
       const baseResult = await this.baseComponent.performOperation();
       // Additional logic using additionalServices
       return enhancedResult;
     }
   }
   ```

## Working with External APIs

### Notion API

```typescript
// Example: Querying Notion database with proper error handling
async function queryDatabase(
  databaseId: string,
  filter?: QueryFilter
): Promise<NotionEntry[]> {
  const maxRetries = 5;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      const response = await this.client.databases.query({
        database_id: databaseId,
        filter: this.transformFilter(filter),
        // other parameters
      });

      return response.results.map(this.mapNotionResponseToEntry);
    } catch (error) {
      if (this.isRateLimitError(error) && retryCount < maxRetries) {
        const delay = this.calculateRetryDelay(retryCount);
        this.logger.warn(`Rate limited, retrying in ${delay}ms`);
        await this.delay(delay);
        retryCount++;
      } else {
        this.logger.error("Failed to query database", error);
        throw this.transformError(error);
      }
    }
  }

  throw new Error(`Failed to query database after ${maxRetries} retries`);
}
```

### AI Services

```typescript
// Example: Generating content with AI
async function generateSummary(
  content: string,
  options?: SummaryOptions
): Promise<string> {
  // Truncate content if needed
  const truncatedContent = this.truncateContent(content, 4000);

  // Create prompt
  const prompt = this.createSummaryPrompt(truncatedContent, options);

  try {
    const response = await this.client.complete({
      messages: [{ role: "user", content: prompt }],
      model: this.modelId,
      temperature: options?.temperature || 0.3,
      max_tokens: options?.maxTokens || 150,
    });

    return this.extractSummaryFromResponse(response);
  } catch (error) {
    this.logger.error("Failed to generate summary", error);
    throw new AIServiceError("Summary generation failed", { cause: error });
  }
}
```

### Storage Services

```typescript
// Example: Uploading to R2 with proper error handling
async function uploadImage(
  imageData: Buffer,
  metadata: ImageMetadata
): Promise<StorageResult> {
  const key = `images/${uuid.v4()}-${metadata.filename}`;

  try {
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
  } catch (error) {
    this.logger.error("Failed to upload image", error);
    throw new StorageError("Image upload failed", { cause: error });
  }
}
```

## Performance Optimization

### Batching and Pagination

```typescript
// Example: Processing items in batches
async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: BatchOptions = {}
): Promise<BatchResult<R>> {
  const batchSize = options.batchSize || this.defaultBatchSize;
  const delayBetweenItems = options.delayBetweenItems || this.defaultDelay;

  const results: R[] = [];
  const errors: BatchError[] = [];

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);

    // Process batch in parallel with concurrency limit
    const batchPromises = batch.map((item, index) =>
      this.delayedProcess(item, processor, index * delayBetweenItems)
    );

    const batchResults = await Promise.allSettled(batchPromises);

    // Handle results
    batchResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        results.push(result.value);
      } else {
        errors.push({
          item: batch[index],
          error: result.reason,
        });
      }
    });

    // Delay between batches
    if (i + batchSize < items.length) {
      await this.delay(options.delayBetweenBatches || this.defaultBatchDelay);
    }
  }

  return {
    successful: results,
    failed: errors,
    totalProcessed: results.length + errors.length,
  };
}
```

### Caching

```typescript
// Example: Implementing a simple cache
export class Cache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();

  constructor(private options: CacheOptions = {}) {}

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    // Ensure cache doesn't exceed max size
    if (this.options.maxSize && this.cache.size >= this.options.maxSize) {
      this.evictOldest();
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.options.defaultTtl || 3600000, // 1 hour default
    });
  }

  // Other methods: delete, clear, has, etc.

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictOldest(): void {
    let oldestKey: string | undefined;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
```

## Debugging and Troubleshooting

### Debugging Tools

1. **Environment Inspection**:

   ```typescript
   // src/utils/debug.ts
   export function inspectEnvironment(): void {
     console.log("Node Version:", process.version);
     console.log("Environment:", process.env.NODE_ENV);
     console.log("Available Memory:", process.memoryUsage());
     // Log other relevant environment details
   }
   ```

2. **Request/Response Logging**:

   ```typescript
   // Example: Logging middleware for API requests
   export function logApiCall(
     service: string,
     method: string
   ): MethodDecorator {
     return function (
       target: any,
       propertyKey: string | symbol,
       descriptor: PropertyDescriptor
     ) {
       const originalMethod = descriptor.value;

       descriptor.value = async function (...args: any[]) {
         const logger = this.logger || console;
         const requestId = uuid.v4();

         logger.debug(`API Request [${requestId}]`, {
           service,
           method,
           args: JSON.stringify(args),
         });

         try {
           const result = await originalMethod.apply(this, args);

           logger.debug(`API Response [${requestId}]`, {
             service,
             method,
             status: "success",
           });

           return result;
         } catch (error) {
           logger.error(`API Error [${requestId}]`, {
             service,
             method,
             error,
           });

           throw error;
         }
       };

       return descriptor;
     };
   }
   ```

3. **Performance Monitoring**:

   ```typescript
   // Example: Timing operations
   export function timed<T>(
     operation: () => Promise<T>,
     logger?: Logger,
     description?: string
   ): Promise<T> {
     const start = performance.now();

     return operation()
       .then((result) => {
         const duration = performance.now() - start;

         if (logger) {
           logger.debug(
             `Operation ${description || ""} took ${duration.toFixed(2)}ms`
           );
         }

         return result;
       })
       .catch((error) => {
         const duration = performance.now() - start;

         if (logger) {
           logger.error(
             `Operation ${description || ""} failed after ${duration.toFixed(
               2
             )}ms`,
             error
           );
         }

         throw error;
       });
   }
   ```

### Common Issues and Solutions

1. **Notion API Rate Limiting**:

   - Problem: Hitting Notion API rate limits
   - Solution: Implement proper rate limiting with exponential backoff

2. **Memory Leaks**:

   - Problem: Memory usage grows over time
   - Solution: Use memory profiling and ensure proper cleanup of resources

3. **Inconsistent Database State**:

   - Problem: Database entries are in an inconsistent state
   - Solution: Implement atomic operations and proper state tracking

4. **AI Service Errors**:
   - Problem: AI service returns unexpected errors
   - Solution: Implement fallback mechanisms and retry strategies

## Deployment

### Production Deployment

1. **Build for Production**:

   ```bash
   npm run build
   ```

2. **Environment Configuration**:

   - Set up production environment variables
   - Use secure storage for API keys

3. **Containerization (Optional)**:

   - Use Docker for deployment
   - Create a Dockerfile with appropriate configuration

4. **Monitoring**:
   - Set up logging and error tracking
   - Implement performance monitoring
   - Configure alerts for critical issues

## Contributing Guidelines

### Pull Request Process

1. Ensure your code passes linting and tests
2. Update documentation to reflect changes
3. Include tests for new functionality
4. Submit a pull request with a clear description

### Code Review Guidelines

1. Verify code follows project style and best practices
2. Ensure proper error handling
3. Check for edge cases
4. Verify tests are comprehensive
5. Review performance implications

## Additional Resources

- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Notion API Documentation](https://developers.notion.com/reference/intro)
- [AWS S3 SDK Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
