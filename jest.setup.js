/* eslint-env node, jest */
/* eslint-disable no-undef */

// CRITICAL: Set NODE_ENV to 'test' for proper test environment
// This ensures rate limiting is disabled and test-specific behavior is enabled
process.env.NODE_ENV = 'test';

// CRITICAL: Disable BYPASS_AUTH globally for all tests
// The .env.local file may have BYPASS_AUTH=true for local development,
// but tests must use proper authentication via test utilities.
// This prevents authentication bypass in integration tests.
process.env.BYPASS_AUTH = 'false';

// Set Supabase test environment variables
// These are required for Supabase client creation in tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key-mock-value-do-not-use-in-production';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key-mock-value-do-not-use-in-production';

// Mock lucide-react before anything else
jest.mock('lucide-react');

// Polyfill structuredClone for Node.js < 17
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill TextEncoder/TextDecoder from Node.js util
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill ReadableStream from Node.js stream/web (required by undici)
if (typeof global.ReadableStream === 'undefined') {
  const { ReadableStream, WritableStream, TransformStream } = require('stream/web');
  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;
}

// Polyfill setImmediate (required by worker_threads)
if (typeof global.setImmediate === 'undefined') {
  global.setImmediate = (callback, ...args) => {
    return setTimeout(callback, 0, ...args);
  };
  global.clearImmediate = (id) => {
    clearTimeout(id);
  };
}

// Polyfill MessagePort from worker_threads (required by undici)
if (typeof global.MessagePort === 'undefined') {
  const { MessagePort, MessageChannel } = require('worker_threads');
  global.MessagePort = MessagePort;
  global.MessageChannel = MessageChannel;
}

// Polyfill Blob and File from buffer (Node.js 18+)
if (typeof global.Blob === 'undefined') {
  const { Blob } = require('buffer');
  global.Blob = Blob;
}

// Create File polyfill if not available
if (typeof global.File === 'undefined') {
  class File extends global.Blob {
    constructor(bits, name, options = {}) {
      super(bits, options);
      this.name = name;
      this.lastModified = options.lastModified || Date.now();
    }
  }
  global.File = File;
}

// Polyfill fetch, Request, Response, Headers, FormData from undici
// Note: NextRequest extends Request and requires proper Web API implementation
if (typeof global.Request === 'undefined') {
  const { fetch, Request, Response, Headers, FormData } = require('undici');
  global.fetch = fetch;
  global.Request = Request;
  global.Response = Response;
  global.Headers = Headers;
  global.FormData = FormData;
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
