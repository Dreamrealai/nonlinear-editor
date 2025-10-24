// Mock implementation of browserLogger for tests
export const BrowserLogger = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

export const logger = BrowserLogger;

export default BrowserLogger;
