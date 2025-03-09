# Unit Testing Guide

## Overview

This document provides comprehensive guidance on the unit testing approach used in the NotionPageDb Migration System. It covers the testing structure, frameworks, mocking strategies, and best practices to ensure code quality and reliability.

## Testing Architecture

The project follows a hierarchical testing approach that mirrors the application's architecture:

```text
test/
├── setup.ts                # Global test setup and helper functions
├── core/                   # Tests for core components
│   ├── ai/                 # Tests for AI services
│   ├── config/             # Tests for configuration management
│   ├── notion/             # Tests for Notion API interaction
│   └── storage/            # Tests for storage services
└── workflow/               # Tests for workflow components
    ├── content/            # Tests for content processing
    ├── database/           # Tests for database operations
    ├── images/             # Tests for image processing
    └── MigrationManager.test.ts # Tests for the main orchestration
```

## Testing Framework

The project uses Vitest as the primary testing framework, which provides:

- Fast, parallel test execution
- ESM support for modern JavaScript/TypeScript
- Mocking capabilities
- Code coverage reporting
- Watch mode for development

## Test Categories

Tests are organized in the following categories to ensure comprehensive coverage:

### Unit Tests

These test individual functions and classes in isolation, mocking all external dependencies:

- **Simple tests**: Basic functionality tests with minimal setup
- **Edge case tests**: Tests for boundary conditions and error handling
- **Branch tests**: Tests for different code paths and logical branches
- **Complete tests**: Comprehensive coverage of complex components

### Integration Tests

These test the interaction between multiple components:

- **Workflow integration**: Tests for workflow components working together
- **API integration**: Tests for external API interactions

## Mocking Strategy

The project employs a comprehensive mocking strategy to isolate components during testing:

### Helper Functions

- `createMock<T>()`: Creates typed mock objects
- `createSpy<T>()`: Creates typed spy functions
- `resetMocks()`: Resets all mocks between tests

### Mocked Dependencies

- **NotionHQ Client**: Mocked to avoid actual API calls
- **File System**: Using vi.mock for fs-extra and path
- **External APIs**: Mocked for AI services, storage, etc.

## Test Structure

Each test file follows a consistent structure:

1. **Imports**: Framework and subject under test
2. **Mocks**: Mock setup for external dependencies
3. **Test Suite**: Using describe() to group related tests
4. **Test Setup**: Using beforeEach() to set up test environment
5. **Test Cases**: Using it() for individual test cases
6. **Assertions**: Using expect() to verify outcomes

## Example Test Pattern

```typescript
import { describe, expect, it, vi, beforeEach } from "vitest";
import { ComponentToTest } from "../src/path/to/component";

// Mock dependencies
vi.mock("dependency", () => ({
  someFunction: vi.fn(),
}));

describe("ComponentName", () => {
  let component: ComponentToTest;

  beforeEach(() => {
    // Reset mocks and create fresh component instance
    vi.resetAllMocks();
    component = new ComponentToTest();
  });

  it("should perform specific action correctly", async () => {
    // Arrange
    const input = {
      /* test data */
    };

    // Act
    const result = await component.methodToTest(input);

    // Assert
    expect(result).toEqual(expectedOutput);
  });
});
```

## Testing Patterns

### Core Component Tests

Core component tests focus on the fundamental building blocks of the system:

- **NotionDatabase**: Tests for database interactions, query operations, and error handling
- **ConfigManager**: Tests for configuration loading, validation, and merging
- **AIService**: Tests for AI integration, prompting, and error recovery
- **StorageService**: Tests for file operations, caching, and persistence

### Workflow Component Tests

Workflow tests focus on business logic and process flows:

- **DatabaseVerifier**: Tests for database verification and creation
- **ContentProcessor**: Tests for content extraction and transformation
- **ImageProcessor**: Tests for image generation and optimization
- **MigrationManager**: Tests for orchestrating the entire workflow

## Test Data Management

The project uses a consistent approach to test data:

- **Fixtures**: JSON files in test/fixtures for complex data structures
- **Mock Factories**: Helper functions to generate test data
- **In-memory data**: For simple cases directly in test files

## Testing Best Practices

1. **Test in isolation**: Mock all external dependencies
2. **Single assertion principle**: Test one concept per test
3. **Arrange-Act-Assert pattern**: Structure tests clearly
4. **Descriptive naming**: Use clear test and describe block names
5. **Coverage targets**: Aim for >90% coverage for critical paths
6. **Error cases**: Always test error conditions and edge cases
7. **Avoid test interdependence**: Tests should not depend on each other

## Advanced Testing Techniques

### Snapshot Testing

Used for complex object comparisons:

```typescript
expect(complexObject).toMatchSnapshot();
```

### Parameterized Tests

For testing multiple input/output combinations:

```typescript
it.each([
  [input1, expected1],
  [input2, expected2],
])("should handle %s correctly", (input, expected) => {
  expect(component.method(input)).toEqual(expected);
});
```

### Mock Implementation Control

For advanced mocking scenarios:

```typescript
mockedFunction.mockImplementation((arg) => {
  if (arg === "special") {
    return "special result";
  }
  return "default result";
});
```

## Continuous Integration

Tests are automatically run:

1. **Pre-commit**: Using Husky to run tests before commits
2. **CI Pipeline**: Full test suite runs on pull requests
3. **Coverage Reports**: Generated and tracked for each build

## Debugging Tests

Tips for debugging failing tests:

- Use `console.log()` for quick debugging
- Enable Vitest UI with `npm run test:ui`
- Use breakpoints in VS Code when running tests in debug mode
- Check mock implementations and call counts

## Contributing Tests

Guidelines for adding new tests:

1. Follow the existing test structure and naming conventions
2. Ensure new components have corresponding test files
3. Cover happy path, error cases, and edge cases
4. Verify mocks are properly set up and reset
5. Run the full test suite before submitting changes

## Related Documentation

- [Developer Guide](./developer-guide.md) - General development guidelines
- [Core Components](./core-components.md) - Components that require testing
- [Workflow Components](./workflow-components.md) - Workflows that require testing
