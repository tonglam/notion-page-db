import * as dotenv from "dotenv";
import { vi } from "vitest";

// Load environment variables from .env.test if it exists
dotenv.config({ path: ".env.test" });

// Mock environment variables required by the application
vi.mock("dotenv", () => ({
  config: vi.fn(),
}));

/**
 * Helper function to create mock objects with typed properties
 * @param overrides Object with properties to override in the mock
 * @returns A mock object with the specified overrides
 */
export function createMock<T>(overrides: Partial<T> = {}): T {
  return overrides as T;
}

/**
 * Helper to create a spy function with return type
 * @param returnValue Value to be returned by the spy
 * @returns A spy function that returns the specified value
 */
export function createSpy<T>(returnValue: T): () => T {
  return vi.fn().mockReturnValue(returnValue);
}

/**
 * Mock implementation for the NotionHQ client
 */
export const mockNotionClient = {
  databases: {
    query: vi.fn(),
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  pages: {
    retrieve: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  blocks: {
    children: {
      list: vi.fn(),
    },
  },
};

/**
 * Reset all mocks between tests
 */
export function resetMocks(): void {
  vi.resetAllMocks();
}
