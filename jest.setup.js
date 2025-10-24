// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill structuredClone for Node.js < 17
if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

if (typeof globalThis.Response === 'undefined') {
  class PolyfilledResponse {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init?.status ?? 200;
      this.statusText = init?.statusText ?? 'OK';
      this.headers = new Map(Object.entries(init?.headers ?? {}));
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  }

  globalThis.Response = PolyfilledResponse;
}

if (typeof Response !== 'undefined' && typeof Response.json !== 'function') {
  Object.defineProperty(Response, 'json', {
    configurable: true,
    writable: true,
    value: (data, init) =>
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
        ...init,
      }),
  });
}

if (typeof globalThis.performance === 'undefined') {
  const now = () => Date.now();
  globalThis.performance = {
    now,
    mark: () => undefined,
    measure: () => undefined,
    clearMarks: () => undefined,
    clearMeasures: () => undefined,
    getEntries: () => [],
    getEntriesByType: () => [],
    getEntriesByName: () => [],
    timeOrigin: now(),
    toJSON: () => ({}),
  };
}

if (typeof global === 'object' && typeof global.performance === 'undefined') {
  global.performance = globalThis.performance;
}

// Polyfill Request for API route tests
if (typeof globalThis.Request === 'undefined') {
  class PolyfilledRequest {
    constructor(input, init = {}) {
      this._url = typeof input === 'string' ? input : input.url;
      this.method = init?.method ?? 'GET';
      this.headers = init?.headers ? new Headers(init.headers) : new Headers();
      this.body = init?.body;
      this._bodyInit = init?.body;
      this._bodyUsed = false;
    }

    get url() {
      return this._url;
    }

    async json() {
      if (this._bodyUsed) {
        throw new TypeError('Body has already been consumed');
      }
      this._bodyUsed = true;
      return typeof this._bodyInit === 'string' ? JSON.parse(this._bodyInit) : this._bodyInit;
    }

    async text() {
      if (this._bodyUsed) {
        throw new TypeError('Body has already been consumed');
      }
      this._bodyUsed = true;
      return typeof this._bodyInit === 'string' ? this._bodyInit : JSON.stringify(this._bodyInit);
    }
  }

  globalThis.Request = PolyfilledRequest;
}

// Mock window.matchMedia
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

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Warning: useLayoutEffect') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
