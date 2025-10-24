/**
 * Mock for serverLogger
 */

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(function() {
    return mockLogger;
  }),
};

export const serverLogger = mockLogger;
