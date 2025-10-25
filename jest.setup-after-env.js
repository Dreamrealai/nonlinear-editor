/* eslint-env jest, node */
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
}, 30000); // 30s timeout for afterAll hook

// Track active resources for cleanup validation
const activeResources = {
  timers: new Set(),
  listeners: new Set(),
  stores: new Set(),
};

// Global cleanup after each test to prevent memory leaks and state pollution
afterEach(async () => {
  // Run all pending timers to completion if mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.runOnlyPendingTimers();
  }

  // Clean up all mocks and timers
  jest.clearAllMocks();
  jest.clearAllTimers();

  // Reset Zustand stores to prevent state pollution between tests
  // Import stores dynamically to avoid circular dependencies
  try {
    const {
      useTimelineStore,
      usePlaybackStore,
      useSelectionStore,
      useHistoryStore,
      useClipboardStore,
      useEditorStore,
    } = require('@/state/index');

    // Reset each store to initial state
    // Use getState() to access store API without triggering React hooks
    if (useTimelineStore.getState()?.setTimeline) {
      useTimelineStore.getState().setTimeline(null);
    }
    if (usePlaybackStore.getState()?.setCurrentTime) {
      usePlaybackStore.getState().setCurrentTime(0);
      usePlaybackStore.getState().setZoom?.(1);
      usePlaybackStore.getState().pause?.();
    }
    if (useSelectionStore.getState()?.clearSelection) {
      useSelectionStore.getState().clearSelection();
    }
    if (useHistoryStore.getState()?.clearHistory) {
      useHistoryStore.getState().clearHistory();
    }
    if (useClipboardStore.getState()?.clearClipboard) {
      useClipboardStore.getState().clearClipboard();
    }
  } catch (error) {
    // Stores may not be available in all test environments (e.g., API tests)
    // This is expected and safe to ignore
  }

  // Flush all pending microtasks and timers to ensure React scheduler completes
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });

  // Restore real timers if they were mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }

  // Clear browser storage to prevent state pollution
  if (typeof window !== 'undefined') {
    try {
      window.localStorage?.clear();
      window.sessionStorage?.clear();
    } catch (e) {
      // Storage may not be available in all test environments
    }
  }

  // Validate cleanup - warn if resources are still active
  if (activeResources.timers.size > 0) {
    console.warn(`[Test Cleanup Warning] ${activeResources.timers.size} timer(s) not cleaned up`);
    activeResources.timers.clear();
  }

  // Note: cleanup() is now automatically called by @testing-library/react
  // If you're using an older version, uncomment the following:
  // cleanup();
}, 30000); // 30s timeout for afterEach hook

// Mock File.prototype.arrayBuffer for file upload tests in Node.js environment
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = async function () {
    const text = await this.text();
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer;
  };
}

// IMPORTANT: Do NOT set jest.setTimeout here - it overrides jest.config.js
// The timeout is configured in jest.config.js as testTimeout: 15000
// Setting it here would override that configuration with a shorter timeout
