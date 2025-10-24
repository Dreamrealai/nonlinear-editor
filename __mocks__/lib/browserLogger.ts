// Mock implementation of browserLogger for tests
const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
  fatal: jest.fn(),
  child: jest.fn(() => createMockLogger()),
  setCorrelationId: jest.fn(),
  clearCorrelationId: jest.fn(),
});

export const browserLogger = createMockLogger();

export const BrowserLogger = createMockLogger();

export const logger = browserLogger;

export default browserLogger;
