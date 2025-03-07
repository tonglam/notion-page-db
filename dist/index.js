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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.migrate = migrate;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const MigrationManager_1 = require("./workflow/MigrationManager");
// Load environment variables
dotenv.config();
/**
 * Main entry point for the NotionPageDb Migration System
 * @param configPath Optional path to the configuration file
 * @param options Options for the migration
 */
async function migrate(configPath, options = {}) {
    try {
        console.log('Starting NotionPageDb Migration...');
        // Create the migration manager
        const manager = new MigrationManager_1.MigrationManager(configPath);
        // Run the migration
        const result = await manager.migrate(options);
        if (result.success) {
            console.log('Migration completed successfully!');
            console.log(`Total pages: ${result.totalPages}`);
            console.log(`Updated pages: ${result.updatedPages}`);
            console.log(`Failed pages: ${result.failedPages}`);
            console.log(`Categories: ${result.categories?.map((c) => c.name).join(', ')}`);
        }
        else {
            console.error('Migration failed:', result.error);
            process.exit(1);
        }
    }
    catch (error) {
        console.error('Migration failed with an error:', error);
        process.exit(1);
    }
}
/**
 * Command-line entry point
 */
if (require.main === module) {
    // Parse command-line arguments
    const args = process.argv.slice(2);
    let configPath;
    const options = {
        enhanceContent: true,
        processImages: true,
        generateImages: true,
    };
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--config' && i + 1 < args.length) {
            configPath = path.resolve(args[++i]);
        }
        else if (arg === '--no-enhance') {
            options.enhanceContent = false;
        }
        else if (arg === '--no-images') {
            options.processImages = false;
        }
        else if (arg === '--no-generate-images') {
            options.generateImages = false;
        }
        else if (arg === '--help') {
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
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
// Export core components for programmatic use
__exportStar(require("./core/ai/AIService"), exports);
__exportStar(require("./core/config/ConfigManager"), exports);
__exportStar(require("./core/notion/NotionContent"), exports);
__exportStar(require("./core/notion/NotionDatabase"), exports);
__exportStar(require("./core/storage/StorageService"), exports);
// Export workflow components for programmatic use
__exportStar(require("./workflow/content/ContentProcessor"), exports);
__exportStar(require("./workflow/database/DatabaseUpdater"), exports);
__exportStar(require("./workflow/database/DatabaseVerifier"), exports);
__exportStar(require("./workflow/images/ImageProcessor"), exports);
__exportStar(require("./workflow/MigrationManager"), exports);
// Export types
__exportStar(require("./types"), exports);
//# sourceMappingURL=index.js.map