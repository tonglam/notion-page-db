import { INotionDatabase } from "../../src/core/notion/NotionDatabase.interface";
import { ContentPage, NotionEntry } from "../../src/types";

// Define field mapping type
interface FieldMapping {
  contentField: keyof ContentPage;
  dbField: string;
  type: string;
}

// Define Notion property types
interface NotionPropertyBase {
  type: string;
}

interface NotionTitleProperty extends NotionPropertyBase {
  type: "title";
  title?: Array<{ plain_text: string }>;
}

interface NotionRichTextProperty extends NotionPropertyBase {
  type: "rich_text";
  rich_text?: Array<{ plain_text: string }>;
}

interface NotionSelectProperty extends NotionPropertyBase {
  type: "select";
  select?: { name: string };
}

interface NotionMultiSelectProperty extends NotionPropertyBase {
  type: "multi_select";
  multi_select?: Array<{ name: string }>;
}

interface NotionUrlProperty extends NotionPropertyBase {
  type: "url";
  url?: string;
}

interface NotionDateProperty extends NotionPropertyBase {
  type: "date";
  date?: { start: string };
}

interface NotionNumberProperty extends NotionPropertyBase {
  type: "number";
  number?: number;
}

interface NotionCheckboxProperty extends NotionPropertyBase {
  type: "checkbox";
  checkbox?: boolean;
}

type NotionProperty =
  | NotionTitleProperty
  | NotionRichTextProperty
  | NotionSelectProperty
  | NotionMultiSelectProperty
  | NotionUrlProperty
  | NotionDateProperty
  | NotionNumberProperty
  | NotionCheckboxProperty;

export class DatabaseValidator {
  constructor(private notionDatabase: INotionDatabase) {}

  /**
   * Validates a content page against a comparison database entry
   */
  async validateAgainstComparisonDb(
    contentPage: ContentPage,
    comparisonDbId: string
  ): Promise<string[]> {
    // Store current database ID
    const currentDbId = await this.notionDatabase.getDatabaseId();
    if (!currentDbId) {
      return ["Current database ID is not set"];
    }

    try {
      // Temporarily set database ID for comparison query
      await this.notionDatabase.setDatabaseId(comparisonDbId);

      // Query entries with the same title
      const comparisonEntries = await this.notionDatabase.queryEntries({
        filter: {
          property: "Title",
          title: {
            equals: contentPage.title,
          },
        },
        page_size: 1,
      });

      // Reset database ID
      await this.notionDatabase.setDatabaseId(currentDbId);

      if (!comparisonEntries || comparisonEntries.length === 0) {
        return ["No matching entry found in comparison database"];
      }

      // Compare fields with reference entry
      return this.validateAgainstReference(contentPage, comparisonEntries[0]);
    } catch (error) {
      // Ensure we reset the database ID even if there's an error
      await this.notionDatabase.setDatabaseId(currentDbId);
      console.error("Error during comparison validation:", error);
      return [
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
      ];
    }
  }

  /**
   * Validates a content page against a reference entry
   */
  private validateAgainstReference(
    contentPage: ContentPage,
    referenceEntry: NotionEntry
  ): string[] {
    const errors: string[] = [];
    const referenceProps = referenceEntry.properties;

    // Define field mappings for test validation
    const fieldMappings: FieldMapping[] = [
      { contentField: "title", dbField: "Title", type: "title" },
      { contentField: "category", dbField: "Category", type: "category" },
      { contentField: "summary", dbField: "Summary", type: "summary" },
      { contentField: "excerpt", dbField: "Excerpt", type: "excerpt" },
      { contentField: "minsRead", dbField: "Mins Read", type: "minsRead" },
      { contentField: "tags", dbField: "Tags", type: "tags" },
      { contentField: "status", dbField: "Status", type: "status" },
      { contentField: "published", dbField: "Published", type: "published" },
      {
        contentField: "originalPageUrl",
        dbField: "Original Page",
        type: "originalPageUrl",
      },
      {
        contentField: "createdTime",
        dbField: "Date Created",
        type: "createdTime",
      },
    ];

    // Compare each field
    fieldMappings.forEach(({ contentField, dbField, type }) => {
      const contentValue = contentPage[contentField];
      const refValue = this.extractPropertyValue(referenceProps[dbField]);

      const error = this.validateField(contentValue, refValue, type);
      if (error) {
        errors.push(`${dbField}: ${error}`);
      }
    });

    return errors;
  }

  /**
   * Validates a field value against reference data
   */
  private validateField(
    contentValue: unknown,
    refValue: unknown,
    fieldType: string
  ): string | null {
    if (contentValue === undefined || contentValue === null) {
      return "Value is undefined or null";
    }

    let error: string | null = null;

    switch (fieldType) {
      case "title":
      case "category":
      case "summary":
      case "excerpt":
        error = this.validateStringField(contentValue);
        break;

      case "minsRead":
        error = this.validateMinsReadField(contentValue, refValue);
        break;

      case "tags":
        error = this.validateTagsField(contentValue, refValue);
        break;

      case "status":
        error = this.validateStatusField(contentValue, refValue);
        break;

      case "published":
        error = this.validatePublishedField(contentValue);
        break;

      case "originalPageUrl":
        error = this.validateUrlField(contentValue);
        break;

      case "createdTime":
        error = this.validateDateField(contentValue);
        break;
    }

    return error;
  }

  private validateStringField(value: unknown): string | null {
    return typeof value !== "string" || value.length === 0
      ? "Must be a non-empty string"
      : null;
  }

  private validateMinsReadField(
    value: unknown,
    refValue: unknown
  ): string | null {
    if (typeof value !== "number") {
      return "Must be a number";
    }
    const refMins = typeof refValue === "string" ? parseInt(refValue) : 0;
    return Math.abs(value - refMins) > 2
      ? "Reading time differs by more than 2 minutes"
      : null;
  }

  private validateTagsField(value: unknown, refValue: unknown): string | null {
    if (!Array.isArray(value) || value.length === 0) {
      return "Must be a non-empty array";
    }
    const refTags =
      typeof refValue === "string"
        ? refValue.split(", ")
        : Array.isArray(refValue)
          ? refValue
          : [];
    return !value.some((tag) => refTags.includes(tag))
      ? "No matching tags found"
      : null;
  }

  private validateStatusField(
    value: unknown,
    refValue: unknown
  ): string | null {
    return typeof value !== "string" || value !== refValue
      ? "Status does not match"
      : null;
  }

  private validatePublishedField(value: unknown): string | null {
    return typeof value !== "boolean" ? "Must be a boolean" : null;
  }

  private validateUrlField(value: unknown): string | null {
    return typeof value !== "string" ||
      !value.startsWith("https://www.notion.so/")
      ? "Must be a valid Notion URL"
      : null;
  }

  private validateDateField(value: unknown): string | null {
    return typeof value !== "string" || !Date.parse(value)
      ? "Must be a valid date"
      : null;
  }

  /**
   * Extracts a value from a Notion property
   */
  private extractPropertyValue(property: NotionProperty | undefined): unknown {
    if (!property) return undefined;

    try {
      const type = property.type;

      switch (type) {
        case "title":
          return property.title?.map((t) => t.plain_text).join("") || "";
        case "rich_text":
          return property.rich_text?.map((t) => t.plain_text).join("") || "";
        case "select":
          return property.select?.name || "";
        case "multi_select":
          return property.multi_select?.map((s) => s.name).join(", ") || "";
        case "url":
          return property.url || "";
        case "date":
          return property.date?.start || "";
        case "number":
          return property.number?.toString() || "0";
        case "checkbox":
          return property.checkbox || false;
        default:
          return `${type}: ${JSON.stringify(property).substring(0, 50)}...`;
      }
    } catch (e) {
      console.error("Error extracting property value:", e);
      return undefined;
    }
  }
}
