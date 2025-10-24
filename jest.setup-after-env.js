/* eslint-env jest, node */
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Mock window.matchMedia
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Suppress console errors in tests (optional)
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') || args[0].includes('Warning: useLayoutEffect'))
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Global cleanup after each test to prevent memory leaks
afterEach(() => {
  // Clean up all mocks
  jest.clearAllTimers();

  // Note: cleanup() is now automatically called by @testing-library/react
  // If you're using an older version, uncomment the following:
  // cleanup();
});

// Set default timeout for all tests
jest.setTimeout(10000);
