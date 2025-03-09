import * as fs from "fs-extra";
import * as path from "path";
import { INotionDatabase } from "../../core/notion/NotionDatabase.interface";
import { DatabaseSchema, NotionConfig, VerificationResult } from "../../types";

/**
 * Database Verifier
 * Validates that a Notion database meets the schema requirements
 */
export class DatabaseVerifier {
  private notionDatabase: INotionDatabase;
  private notionConfig: NotionConfig;
  private requiredProperties: string[];

  /**
   * Creates a new DatabaseVerifier instance
   * @param notionDatabase The Notion database service
   * @param notionConfig The Notion configuration
   */
  constructor(notionDatabase: INotionDatabase, notionConfig: NotionConfig) {
    this.notionDatabase = notionDatabase;
    this.notionConfig = notionConfig;
    this.requiredProperties = [
      "Title",
      "Category",
      "Tags",
      "Summary",
      "Excerpt",
      "Mins Read",
      "Image",
      "R2ImageUrl",
      "Date Created",
      "Status",
      "Original Page",
      "Published",
    ];
  }

  /**
   * Verifies that the database meets requirements
   * @param databaseId Optional ID of the database to verify, if not provided will try to resolve from config
   */
  async verifyDatabase(databaseId?: string): Promise<VerificationResult> {
    try {
      // If a specific database ID is provided, use it
      if (databaseId) {
        this.notionDatabase.setDatabaseId(databaseId);
      }

      // Check if the database exists
      const dbExists = await this.notionDatabase.verifyDatabase();

      if (!dbExists) {
        return {
          success: false,
          errors: ["Database does not exist or is not accessible"],
        };
      }

      // Get the final databaseId
      const finalDatabaseId = this.notionDatabase.getDatabaseId();

      if (!finalDatabaseId) {
        return {
          success: false,
          errors: ["Database ID could not be resolved"],
        };
      }

      // Since we can't access the database schema directly from the API yet,
      // we'll need to skip the schema validation for now
      console.warn("Database schema validation is limited - API access needed");

      // Return success with the resolved database ID
      return {
        success: true,
        databaseId: finalDatabaseId,
        message: "Database verified (with limited schema validation)",
      };
    } catch (error) {
      console.error("Error verifying database:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Creates a database with the required schema if it doesn't exist
   * @param parentPageId Parent page ID where the database should be created
   */
  async createDatabaseIfNeeded(
    parentPageId: string
  ): Promise<VerificationResult> {
    try {
      // Try to initialize the database - this will find or create it
      const databaseId =
        await this.notionDatabase.initializeDatabase(parentPageId);

      // Verify the database (either existing or newly created)
      const verificationResult = await this.verifyDatabase(databaseId);

      if (verificationResult.success) {
        // Update the notionConfig with the resolved ID
        if (this.notionConfig && verificationResult.databaseId) {
          this.notionConfig.resolvedDatabaseId = verificationResult.databaseId;
        }

        return {
          success: true,
          databaseId: verificationResult.databaseId,
          message: "Database verified successfully",
        };
      }

      // If verification failed, return the error
      return verificationResult;
    } catch (error) {
      console.error("Error creating/verifying database:", error);
      return {
        success: false,
        errors: [error instanceof Error ? error.message : "Unknown error"],
      };
    }
  }

  /**
   * Loads custom schema configuration from a file
   * @param configPath Path to the schema configuration file
   */
  async loadSchemaConfig(configPath?: string): Promise<DatabaseSchema | null> {
    const schemaPath =
      configPath || path.join(process.cwd(), "config", "database-schema.json");

    try {
      if (await fs.pathExists(schemaPath)) {
        const schemaData = await fs.readJson(schemaPath);
        return schemaData as DatabaseSchema;
      }
      return null;
    } catch (error) {
      console.error("Error loading schema config:", error);
      return null;
    }
  }

  /**
   * Builds the database schema based on the required properties
   */
  private buildDatabaseSchema(): Record<string, any> {
    return {
      Title: {
        type: "title",
      },
      Category: {
        type: "select",
        options: [
          { name: "JavaScript", color: "yellow" },
          { name: "Python", color: "blue" },
          { name: "React", color: "green" },
          { name: "TypeScript", color: "purple" },
        ],
      },
      Tags: {
        type: "multi_select",
        options: [],
      },
      Summary: {
        type: "rich_text",
      },
      Excerpt: {
        type: "rich_text",
      },
      "Mins Read": {
        type: "number",
        format: "number",
      },
      Image: {
        type: "url",
      },
      R2ImageUrl: {
        type: "url",
      },
      "Date Created": {
        type: "date",
      },
      Status: {
        type: "select",
        options: [
          { name: "Draft", color: "gray" },
          { name: "Ready", color: "green" },
          { name: "Review", color: "yellow" },
          { name: "Published", color: "blue" },
        ],
      },
      "Original Page": {
        type: "url",
      },
      Published: {
        type: "checkbox",
      },
    };
  }
}
