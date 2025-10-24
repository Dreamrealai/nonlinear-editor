/* eslint-env node, jest */

// Polyfill structuredClone for Node.js < 17
if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Mock IntersectionObserver
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  };
}

// Mock ResizeObserver
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  };
}
