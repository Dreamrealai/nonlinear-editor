/**
 * Mock Observer APIs (IntersectionObserver, ResizeObserver, MutationObserver) for Jest tests
 */

function setupObserversMock() {
  // Mock IntersectionObserver
  if (typeof global.IntersectionObserver === 'undefined') {
    global.IntersectionObserver = class IntersectionObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe() {
        return null;
      }

      disconnect() {
        return null;
      }

      unobserve() {
        return null;
      }

      takeRecords() {
        return [];
      }
    };
  }

  // Mock ResizeObserver
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe() {
        return null;
      }

      disconnect() {
        return null;
      }

      unobserve() {
        return null;
      }
    };
  }

  // Mock MutationObserver if needed
  if (typeof global.MutationObserver === 'undefined') {
    global.MutationObserver = class MutationObserver {
      constructor(callback) {
        this.callback = callback;
      }

      observe() {
        return null;
      }

      disconnect() {
        return null;
      }

      takeRecords() {
        return [];
      }
    };
  }
}

module.exports = { setupObserversMock };
