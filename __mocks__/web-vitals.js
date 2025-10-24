/**
 * Mock for web-vitals library
 *
 * This mock prevents TypeError issues when tests import web-vitals in a Jest/jsdom environment.
 * The web-vitals library relies on browser Performance APIs that aren't fully available in jsdom.
 *
 * Mock provides all web-vitals functions (onCLS, onFID, onFCP, onLCP, onTTFB, onINP)
 * with jest.fn() implementations that optionally call the callback with realistic mock data.
 */

// Mock metric data generator
function createMockMetric(name, value, rating = 'good') {
  return {
    name,
    value,
    rating,
    id: `mock-${name.toLowerCase()}-${Date.now()}`,
    delta: value,
    entries: [],
    navigationType: 'navigate',
  };
}

// Mock implementations for each web vital
// eslint-disable-next-line no-undef
const onCLS = jest.fn(() => undefined);

// eslint-disable-next-line no-undef
const onFID = jest.fn(() => undefined);

// eslint-disable-next-line no-undef
const onFCP = jest.fn(() => undefined);

// eslint-disable-next-line no-undef
const onLCP = jest.fn(() => undefined);

// eslint-disable-next-line no-undef
const onTTFB = jest.fn(() => undefined);

// eslint-disable-next-line no-undef
const onINP = jest.fn(() => undefined);

// Export all web-vitals functions
// eslint-disable-next-line no-undef
module.exports = {
  onCLS,
  onFID,
  onFCP,
  onLCP,
  onTTFB,
  onINP,
  // Helper for tests that need to manually trigger callbacks
  createMockMetric,
};
