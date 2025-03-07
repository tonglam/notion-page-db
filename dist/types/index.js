"use strict";
/**
 * Common type definitions for the NotionPageDb Migration System
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProcessingStage = exports.GenerationStatus = void 0;
var GenerationStatus;
(function (GenerationStatus) {
    GenerationStatus["NotStarted"] = "not_started";
    GenerationStatus["Pending"] = "pending";
    GenerationStatus["Completed"] = "completed";
    GenerationStatus["Failed"] = "failed";
})(GenerationStatus || (exports.GenerationStatus = GenerationStatus = {}));
var ProcessingStage;
(function (ProcessingStage) {
    ProcessingStage["Metadata"] = "metadata";
    ProcessingStage["Content"] = "content";
    ProcessingStage["ImageGeneration"] = "image_generation";
    ProcessingStage["ImageUpload"] = "image_upload";
    ProcessingStage["Complete"] = "complete";
})(ProcessingStage || (exports.ProcessingStage = ProcessingStage = {}));
//# sourceMappingURL=index.js.map