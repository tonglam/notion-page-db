# Notion Database Schema

This document specifies the Notion database schema for the NotionPageDb Migration System. The schema is based on the actual Notion database with ID `1ab7ef86-a5ad-81ab-a4cb-f8b8f37ec491`.

## Database Overview

The Notion database serves as the central repository for all migrated content. It stores metadata, content references, and generated assets for each page from the source Notion content.

## Required Properties

The following properties are present in the actual database:

| Property Name | Type         | Description                        | Required | Created If Missing |
| ------------- | ------------ | ---------------------------------- | -------- | ------------------ |
| Title         | title        | Title of the article               | Yes      | No (built-in)      |
| Category      | select       | Category of the content            | Yes      | Yes                |
| Tags          | multi_select | Relevant tags for the content      | Yes      | Yes                |
| Summary       | rich_text    | AI-generated summary               | Yes      | Yes                |
| Excerpt       | rich_text    | Brief excerpt from the content     | Yes      | Yes                |
| Mins Read     | number       | Estimated reading time in minutes  | Yes      | Yes                |
| Image         | url          | URL to the original featured image | Yes      | Yes                |
| R2ImageUrl    | url          | Public URL for the hosted R2 image | Yes      | Yes                |
| Date Created  | date         | Date the entry was created         | Yes      | Yes                |
| Status        | select       | Publication status                 | Yes      | Yes                |
| Original Page | url          | URL to the original Notion page    | Yes      | Yes                |
| Published     | checkbox     | Whether the content is published   | Yes      | Yes                |

## Property Specifications

### Title

- Type: `title`
- Description: The title of the article or content
- Built-in Notion property, always present
- Used as the primary identifier in the UI

### Category

- Type: `select`
- Description: The category of the content
- Many options available including programming languages, frameworks, and courses
- Color-coded for easy visual categorization
- Special handling for MIT Units (prefixed with "CITS")

### Tags

- Type: `multi_select`
- Description: Relevant tags for the content
- Multiple tags can be assigned to each entry
- Used for filtering and categorization
- Color-coded for visual identification

### Summary

- Type: `rich_text`
- Description: AI-generated summary of the content
- Created using DeepSeek R1 or similar model
- Length: typically 2-3 sentences
- Focuses on the key points of the content

### Excerpt

- Type: `rich_text`
- Description: Brief excerpt from the original content
- Used for previews in listing pages
- Contains formatted text from the original content
- Limited in length due to Notion constraints

### Mins Read

- Type: `number`
- Description: Estimated reading time in minutes
- Calculated using AI or heuristic algorithms
- Integer value (rounded up)
- Helps users gauge content length

### Image

- Type: `url`
- Description: URL to the original featured image
- Can be manually entered or automatically generated
- Used as a source for generating optimized images
- May point to external sources

### R2ImageUrl

- Type: `url`
- Description: Public URL for the hosted image
- Points to the image stored in Cloudflare R2
- Used for embedding in other platforms
- Permanent link not dependent on Notion

### Date Created

- Type: `date`
- Description: Date the entry was created
- Includes time component
- Can be automatically set or manually adjusted
- Used for sorting and filtering content

### Status

- Type: `select`
- Description: Publication status of the content
- Options include:
  - `Draft` - Not ready for publication
  - `Ready` - Ready for review
  - `Review` - Currently under review
  - `Published` - Publicly available
- Controls visibility in frontend applications

### Original Page

- Type: `url`
- Description: URL to the original Notion page
- Used for linking back to the source content
- Enables referencing the original material
- Important for attribution and verification

### Published

- Type: `checkbox`
- Description: Whether the content is published
- Simple Boolean flag for publication status
- Can be used for filtering in views
- Complements the more detailed Status property

## Select Options

### Category Options

The Category select field includes a wide range of options such as:

- JavaScript
- Python
- Java
- React
- TypeScript
- Machine Learning
- Web Development
- AWS
- MIT Units (with CITS prefixes)
- Various course codes

### Status Options

The Status select field includes the following options:

| Option    | Color  |
| --------- | ------ |
| Draft     | Gray   |
| Ready     | Green  |
| Review    | Yellow |
| Published | Blue   |

## Schema Validation

The system will perform the following validation on startup:

1. Verify the database exists
2. Check for all required properties
3. Validate property types match the specification
4. Create missing properties as needed
5. Verify select options exist (for Status)
6. Generate any category options based on source content

## Schema Updates

If schema changes are needed:

1. The system will log the required changes
2. Properties will be created if missing
3. Types will not be modified if they conflict (to prevent data loss)
4. Select options will be added if missing
5. Conflicts will be reported for manual resolution

## Database Views

The following views are recommended for the database:

1. **All Entries** - Shows all entries sorted by Date Created
2. **By Category** - Groups entries by Category
3. **By Status** - Groups entries by Status
4. **Published Only** - Filters entries where Published is checked
5. **Missing Images** - Filters entries with no Image or R2ImageUrl

## Database Limitations

The following limitations should be noted:

1. Notion rich_text fields are limited to 2000 characters
2. Select fields can have at most 100 options
3. Multi-select fields are limited to 100 options per entry
4. URL fields must contain valid URLs
5. Date fields include time but may lose precision in export/import

## Database Performance Considerations

For optimal performance:

1. Keep the number of entries below 10,000 per database
2. Avoid excessive properties (stick to the schema)
3. Limit the use of relation properties
4. Consider using multiple databases for very large content sets
5. Use filters in queries to limit result sets
