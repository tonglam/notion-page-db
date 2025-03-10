import {
  BlockObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import { Category, ContentPage, Status } from "../../types";

/**
 * Factory for creating ContentPage objects from Notion blocks and pages
 */
export class ContentPageFactory {
  /**
   * Creates a ContentPage from Notion blocks and page data
   */
  createFromNotionData(
    block: BlockObjectResponse,
    pageResponse: PageObjectResponse,
    category: Category,
    blockContent: string
  ): ContentPage {
    return {
      id: block.id,
      title: this.extractTitle(pageResponse),
      parentId: category.id,
      category:
        category.type === "mit" ? `CITS${category.name}` : category.name,
      content: blockContent,
      createdTime: pageResponse.created_time,
      lastEditedTime: pageResponse.last_edited_time,
      summary: "", // Will be populated by content enhancer
      excerpt: "", // Will be populated by content enhancer
      tags: [], // Will be populated by content enhancer
      minsRead: 0, // Will be populated by content enhancer
      status: Status.Draft, // Default status
      published: false, // Default to unpublished
      originalPageUrl: `https://www.notion.so/${block.id.replace(/-/g, "")}`,
      imageUrl: "",
      r2ImageUrl: "",
    };
  }

  /**
   * Extracts text content from Notion blocks
   */
  extractBlockContent(blocks: BlockObjectResponse[]): string {
    return blocks
      .map((block) => {
        const type = block.type;
        switch (type) {
          case "paragraph":
            return this.extractRichText(block.paragraph?.rich_text) + "\n\n";
          case "heading_1":
            return this.extractRichText(block.heading_1?.rich_text) + "\n\n";
          case "heading_2":
            return this.extractRichText(block.heading_2?.rich_text) + "\n\n";
          default:
            return "";
        }
      })
      .join("");
  }

  /**
   * Extracts title from a Notion page
   */
  private extractTitle(page: PageObjectResponse): string {
    const titleProp = page.properties["title"];
    if (titleProp?.type === "title") {
      return titleProp.title.map((t) => t.plain_text).join("") || "Untitled";
    }
    return "Untitled";
  }

  /**
   * Extracts text from rich text arrays
   */
  private extractRichText(richText: any[] | undefined): string {
    if (!richText || !Array.isArray(richText)) return "";
    return richText.map((t) => t.plain_text || "").join("");
  }
}
