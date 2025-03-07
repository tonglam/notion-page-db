import * as dotenv from "dotenv";
import * as path from "path";
import { MigrationOptions } from "./types";
import { MigrationManager } from "./workflow/MigrationManager";

// Load environment variables
dotenv.config();

/**
 * Main entry point for the NotionPageDb Migration System
 * @param configPath Optional path to the configuration file
 * @param options Options for the migration
 */
export async function migrate(
  configPath?: string,
  options: MigrationOptions = {}
): Promise<void> {
  try {
    console.log("Starting NotionPageDb Migration...");

    // Create the migration manager
    const manager = new MigrationManager(configPath);

    // Run the migration
    const result = await manager.migrate(options);

    if (result.success) {
      console.log("Migration completed successfully!");
      console.log(`Total pages: ${result.totalPages}`);
      console.log(`Updated pages: ${result.updatedPages}`);
      console.log(`Failed pages: ${result.failedPages}`);
      console.log(
        `Categories: ${result.categories?.map((c) => c.name).join(", ")}`
      );
    } else {
      console.error("Migration failed:", result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error("Migration failed with an error:", error);
    process.exit(1);
  }
}

/**
 * Command-line entry point
 */
if (require.main === module) {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  let configPath: string | undefined;
  const options: MigrationOptions = {
    enhanceContent: true,
    processImages: true,
    generateImages: true,
  };

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "--config" && i + 1 < args.length) {
      configPath = path.resolve(args[++i]);
    } else if (arg === "--no-enhance") {
      options.enhanceContent = false;
    } else if (arg === "--no-images") {
      options.processImages = false;
    } else if (arg === "--no-generate-images") {
      options.generateImages = false;
    } else if (arg === "--help") {
      console.log(`
NotionPageDb Migration System

Usage:
  node dist/index.js [options]

Options:
  --config <path>         Path to the configuration file
  --no-enhance            Disable content enhancement
  --no-images             Disable image processing
  --no-generate-images    Disable image generation
  --help                  Show this help message
      `);
      process.exit(0);
    }
  }

  // Run the migration
  migrate(configPath, options).catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}

// Export core components for programmatic use
export * from "./core/ai/AIService";
export * from "./core/config/ConfigManager";
export * from "./core/notion/NotionContent";
export * from "./core/notion/NotionDatabase";
export * from "./core/storage/StorageService";

// Export workflow components for programmatic use
export * from "./workflow/content/ContentProcessor";
export * from "./workflow/database/DatabaseUpdater";
export * from "./workflow/database/DatabaseVerifier";
export * from "./workflow/images/ImageProcessor";
export * from "./workflow/MigrationManager";

// Export types
export * from "./types";
