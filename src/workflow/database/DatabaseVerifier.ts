import { INotionDatabase } from "../../core/notion/NotionDatabase.interface";
import { DatabaseSchema, NotionConfig, VerificationResult } from "../../types";

/**
 * Database Verifier
 * Validates that a Notion database meets the schema requirements
 */
export class DatabaseVerifier {
  private notionDatabase: INotionDatabase;
  private notionConfig: NotionConfig;
  private comparisonDatabaseId: string = "1ab7ef86a5ad81aba4cbf8b8f37ec491";

  /**
   * Creates a new DatabaseVerifier instance
   * @param notionDatabase The Notion database service
   * @param notionConfig The Notion configuration
   */
  constructor(notionDatabase: INotionDatabase, notionConfig: NotionConfig) {
    this.notionDatabase = notionDatabase;
    this.notionConfig = notionConfig;
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

      // Return success with the resolved database ID
      return {
        success: true,
        databaseId: finalDatabaseId,
        message: "Database verified successfully",
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
      // First, get the schema from the comparison database
      const comparisonSchema = await this.getComparisonDatabaseSchema();

      if (!comparisonSchema) {
        return {
          success: false,
          errors: ["Could not fetch schema from comparison database"],
        };
      }

      // Try to initialize the database with the comparison schema
      const databaseId = await this.notionDatabase.initializeDatabase(
        parentPageId,
        comparisonSchema
      );

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
          message:
            "Database created and verified successfully with comparison schema",
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
   * Fetches the schema from the comparison database
   */
  private async getComparisonDatabaseSchema(): Promise<DatabaseSchema | null> {
    try {
      // Store current database ID
      const currentDatabaseId = this.notionDatabase.getDatabaseId();

      // Set to comparison database temporarily
      this.notionDatabase.setDatabaseId(this.comparisonDatabaseId);

      // Fetch the database to get its schema
      const database = await this.notionDatabase.client.databases.retrieve({
        database_id: this.comparisonDatabaseId,
      });

      // Restore original database ID
      if (currentDatabaseId) {
        this.notionDatabase.setDatabaseId(currentDatabaseId);
      }

      // Convert Notion's schema format to our DatabaseSchema format
      const schema: DatabaseSchema = {
        name: (database as any).title?.[0]?.plain_text || "Content Database",
        properties: {},
      };

      // Convert each property
      Object.entries(database.properties).forEach(([name, prop]) => {
        const property = prop as any;
        if (property.type === "title") {
          schema.properties[name] = { type: "title" };
        } else if (property.type === "select") {
          schema.properties[name] = {
            type: "select",
            options: property.select.options.map((opt: any) => ({
              name: opt.name,
              color: opt.color,
            })),
          };
        } else if (property.type === "multi_select") {
          schema.properties[name] = {
            type: "multi_select",
            options: property.multi_select.options.map((opt: any) => ({
              name: opt.name,
              color: opt.color,
            })),
          };
        } else if (property.type === "rich_text") {
          schema.properties[name] = { type: "rich_text" };
        } else if (property.type === "number") {
          schema.properties[name] = { type: "number" };
        } else if (property.type === "url") {
          schema.properties[name] = { type: "url" };
        } else if (property.type === "date") {
          schema.properties[name] = { type: "date" };
        } else if (property.type === "checkbox") {
          schema.properties[name] = { type: "checkbox" };
        }
      });

      return schema;
    } catch (error) {
      console.error("Error fetching comparison database schema:", error);
      return null;
    }
  }
}
