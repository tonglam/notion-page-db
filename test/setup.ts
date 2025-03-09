import * as dotenv from "dotenv";
import { expect, Mock, vi } from "vitest";

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
 * Improved mock factory that creates a fully typed mock object
 * All methods are automatically mocked with vi.fn()
 * @param overrides Object with properties to override in the mock
 * @returns A fully mocked object with all methods as mock functions
 */
export function createTypedMock<T extends object>(
  overrides: Partial<T> = {}
): { [K in keyof T]: T[K] extends (...args: any[]) => any ? Mock : T[K] } {
  // Create a proxy that automatically mocks any method accessed
  const handler = {
    get: (target: any, prop: string) => {
      if (prop in overrides) {
        return overrides[prop as keyof typeof overrides];
      }

      // If the property doesn't exist in the target yet, create a mock function
      if (!(prop in target)) {
        const mockFn = vi.fn();
        target[prop] = mockFn;
        return mockFn;
      }

      return target[prop];
    },
  };

  return new Proxy({} as any, handler);
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
 * Helper to create an async spy function with return type
 * @param returnValue Value to be resolved by the spy
 * @returns A spy function that resolves to the specified value
 */
export function createAsyncSpy<T>(returnValue: T): () => Promise<T> {
  return vi.fn().mockResolvedValue(returnValue);
}

/**
 * Helper to assert that a specific error was thrown
 * @param fn Function that should throw an error
 * @param errorMessage Expected error message
 */
export async function expectAsyncError(
  fn: () => Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error("Expected function to throw an error but it did not");
  } catch (error) {
    if (errorMessage) {
      expect(error.message).toContain(errorMessage);
    }
  }
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
