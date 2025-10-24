/**
 * Mock Performance API for Jest tests
 */

function setupPerformanceMock() {
  // Mock Performance.now()
  if (typeof performance === 'undefined') {
    global.performance = {
      now: jest.fn(() => Date.now()),
      timing: {
        navigationStart: Date.now(),
      },
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntriesByName: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
    };
  } else if (!performance.now) {
    performance.now = jest.fn(() => Date.now());
  }
}

module.exports = { setupPerformanceMock };
