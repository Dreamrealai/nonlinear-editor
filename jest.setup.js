// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill structuredClone for Node.js < 17
if (typeof structuredClone === 'undefined') {
  globalThis.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill Request and Response for Next.js API route tests
// These are needed when importing from 'next/server' in tests
// Using a minimal polyfill approach
if (typeof Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init) {
      this.url = typeof input === 'string' ? input : input.url;
      this.method = init?.method || 'GET';
      this.headers = new Headers(init?.headers);
      this.body = init?.body;
    }
  };
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.status = init?.status || 200;
      this.statusText = init?.statusText || '';
      this.headers = new Headers(init?.headers);
      this.ok = this.status >= 200 && this.status < 300;
    }

    async json() {
      return typeof this.body === 'string' ? JSON.parse(this.body) : this.body;
    }

    async text() {
      return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
    }
  };
}

if (typeof Headers === 'undefined') {
  global.Headers = class Headers {
    constructor(init) {
      this.headers = {};
      if (init) {
        if (init instanceof Headers) {
          this.headers = { ...init.headers };
        } else if (typeof init === 'object') {
          this.headers = { ...init };
        }
      }
    }

    get(name) {
      return this.headers[name.toLowerCase()];
    }

    set(name, value) {
      this.headers[name.toLowerCase()] = value;
    }

    has(name) {
      return name.toLowerCase() in this.headers;
    }

    delete(name) {
      delete this.headers[name.toLowerCase()];
    }

    append(name, value) {
      const existing = this.get(name);
      this.set(name, existing ? `${existing}, ${value}` : value);
    }

    entries() {
      return Object.entries(this.headers);
    }

    keys() {
      return Object.keys(this.headers);
    }

    values() {
      return Object.values(this.headers);
    }
  };
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
