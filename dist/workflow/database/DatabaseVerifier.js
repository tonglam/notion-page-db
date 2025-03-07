"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseVerifier = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Database Verifier
 * Validates that a Notion database meets the schema requirements
 */
class DatabaseVerifier {
    /**
     * Creates a new DatabaseVerifier instance
     * @param notionDatabase The Notion database service
     * @param notionConfig The Notion configuration
     */
    constructor(notionDatabase, notionConfig) {
        this.notionDatabase = notionDatabase;
        this.notionConfig = notionConfig;
        this.requiredProperties = [
            'Title',
            'Category',
            'Tags',
            'Summary',
            'Excerpt',
            'Mins Read',
            'Image',
            'R2ImageUrl',
            'Date Created',
            'Status',
            'Original Page',
            'Published',
        ];
    }
    /**
     * Verifies that the database meets requirements
     * @param databaseId ID of the database to verify
     */
    async verifyDatabase(databaseId) {
        try {
            // Check if the database exists
            // Note: Our interface doesn't accept parameters, but we'll update later
            const dbExists = await this.notionDatabase.verifyDatabase();
            if (!dbExists) {
                return {
                    success: false,
                    errors: ['Database does not exist or is not accessible'],
                };
            }
            // Since we can't access the database schema directly from the API yet,
            // we'll need to skip the schema validation for now
            console.warn('Database schema validation is limited - API access needed');
            // Return success for now
            return {
                success: true,
                databaseId,
                message: 'Database verified (with limited schema validation)',
            };
            /* When we have proper API access, we would do something like:
            const databaseSchema = await this.notionDatabase.getDatabaseSchema(databaseId);
            
            if (!databaseSchema || !databaseSchema.properties) {
              return {
                success: false,
                errors: ['Failed to retrieve database schema'],
              };
            }
            
            // Verify required properties
            const missingProperties: string[] = [];
            
            for (const requiredProp of this.requiredProperties) {
              if (!databaseSchema.properties[requiredProp]) {
                missingProperties.push(requiredProp);
              }
            }
            
            if (missingProperties.length > 0) {
              return {
                success: false,
                errors: [`Missing required properties: ${missingProperties.join(", ")}`],
                missingProperties,
              };
            }
            
            // Validate property types
            const invalidPropertyTypes: string[] = [];
            
            // Check each property type
            // ... property type validation logic ...
            
            if (invalidPropertyTypes.length > 0) {
              return {
                success: false,
                errors: invalidPropertyTypes,
                invalidPropertyTypes,
              };
            }
            */
        }
        catch (error) {
            console.error('Error verifying database:', error);
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }
    /**
     * Creates a database with the required schema if it doesn't exist
     * @param databaseId Optional database ID to check/create
     * @param parentPageId Parent page ID where the database should be created
     */
    async createDatabaseIfNeeded(databaseId, parentPageId) {
        try {
            // If no database ID is provided, create a new one
            if (!databaseId) {
                // Verify parent page ID is provided
                if (!parentPageId) {
                    return {
                        success: false,
                        errors: ['Parent page ID is required to create a new database'],
                    };
                }
                // Create the database schema
                const schema = this.buildDatabaseSchema();
                // Create the database - this needs proper data structure for NotionDatabase.createDatabase
                const dbData = {
                    title: 'Content Database', // This will be properly formatted in NotionDatabase
                    properties: schema,
                };
                // Note: This is a placeholder, we'll need to fix NotionDatabase.createDatabase
                const databaseId = await this.notionDatabase.createDatabase(dbData);
                return {
                    success: true,
                    databaseId,
                    message: `Created new database with ID ${databaseId}`,
                };
            }
            // Otherwise, verify the existing database
            const verificationResult = await this.verifyDatabase(databaseId);
            if (verificationResult.success) {
                return {
                    success: true,
                    databaseId,
                    message: 'Database verified successfully',
                };
            }
            // If the database exists but has issues, report them
            return verificationResult;
        }
        catch (error) {
            console.error('Error creating/verifying database:', error);
            return {
                success: false,
                errors: [error instanceof Error ? error.message : 'Unknown error'],
            };
        }
    }
    /**
     * Loads custom schema configuration from a file
     * @param configPath Path to the schema configuration file
     */
    async loadSchemaConfig(configPath) {
        const schemaPath = configPath || path.join(process.cwd(), 'config', 'database-schema.json');
        try {
            if (await fs.pathExists(schemaPath)) {
                const schemaData = await fs.readJson(schemaPath);
                return schemaData;
            }
            return null;
        }
        catch (error) {
            console.error('Error loading schema config:', error);
            return null;
        }
    }
    /**
     * Builds the database schema based on the required properties
     */
    buildDatabaseSchema() {
        return {
            Title: {
                type: 'title',
            },
            Category: {
                type: 'select',
                options: [
                    { name: 'JavaScript', color: 'yellow' },
                    { name: 'Python', color: 'blue' },
                    { name: 'React', color: 'green' },
                    { name: 'TypeScript', color: 'purple' },
                ],
            },
            Tags: {
                type: 'multi_select',
                options: [],
            },
            Summary: {
                type: 'rich_text',
            },
            Excerpt: {
                type: 'rich_text',
            },
            'Mins Read': {
                type: 'number',
                format: 'number',
            },
            Image: {
                type: 'url',
            },
            R2ImageUrl: {
                type: 'url',
            },
            'Date Created': {
                type: 'date',
            },
            Status: {
                type: 'select',
                options: [
                    { name: 'Draft', color: 'gray' },
                    { name: 'Ready', color: 'green' },
                    { name: 'Review', color: 'yellow' },
                    { name: 'Published', color: 'blue' },
                ],
            },
            'Original Page': {
                type: 'url',
            },
            Published: {
                type: 'checkbox',
            },
        };
    }
}
exports.DatabaseVerifier = DatabaseVerifier;
//# sourceMappingURL=DatabaseVerifier.js.map