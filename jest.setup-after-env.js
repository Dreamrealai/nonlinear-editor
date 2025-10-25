/* eslint-env jest, node */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-undef */
// Learn more: https://github.com/testing-library/jest-dom
require('@testing-library/jest-dom');

// Import and setup browser API mocks
const {
  setupAudioContextMock,
  setupCanvasMock,
  setupMediaElementMock,
  setupObserversMock,
  setupPerformanceMock,
} = require('./__mocks__/browserAPIs');

// Setup all browser API mocks
setupAudioContextMock();
setupCanvasMock();
setupMediaElementMock();
setupObserversMock();
setupPerformanceMock();

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

// Track if we're currently in a console.warn call to prevent infinite recursion
let inConsoleWarn = false;

beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit') ||
        args[0].includes('Not implemented: HTMLCanvasElement.prototype.getContext') ||
        args[0].includes('Web Vitals not available'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args) => {
    // Prevent infinite recursion from browserLogger
    if (inConsoleWarn) {
      return;
    }

    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: An update to') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Web Vitals not available') ||
        args[0].includes('[WARN]'))
    ) {
      return;
    }

    inConsoleWarn = true;
    try {
      originalWarn.call(console, ...args);
    } finally {
      inConsoleWarn = false;
    }
  };
});

afterAll(async () => {
  console.error = originalError;
  console.warn = originalWarn;

  // Flush all remaining microtasks and timers to allow React scheduler to clean up
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  // Allow any pending MessagePort operations to complete
  // Use setTimeout instead of setImmediate (which is not available in jsdom)
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
});

// Global cleanup after each test to prevent memory leaks
afterEach(async () => {
  // Run all pending timers to completion if mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.runOnlyPendingTimers();
  }

  // Clean up all mocks and timers
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Flush all pending microtasks and timers to ensure React scheduler completes
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  // Restore real timers if they were mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }

  // Note: cleanup() is now automatically called by @testing-library/react
  // If you're using an older version, uncomment the following:
  // cleanup();
});

// Mock File.prototype.arrayBuffer for file upload tests in Node.js environment
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = async function () {
    const text = await this.text();
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer;
  };
}

// Set default timeout for all tests
jest.setTimeout(10000);
