/**
 * Mock for cache module
 */

export const cache = {
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn().mockResolvedValue(undefined),
  has: jest.fn(),
};
