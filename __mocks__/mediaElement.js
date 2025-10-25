/* eslint-env jest */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Mock Media Element (Audio/Video) API for Jest tests
 */

function setupMediaElementMock() {
  if (typeof HTMLMediaElement !== 'undefined') {
    // Mock play method
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());

    // Mock pause method
    HTMLMediaElement.prototype.pause = jest.fn();

    // Mock load method
    HTMLMediaElement.prototype.load = jest.fn();

    // Mock properties
    Object.defineProperties(HTMLMediaElement.prototype, {
      currentTime: {
        get: jest.fn(() => 0),
        set: jest.fn(),
      },
      duration: {
        get: jest.fn(() => 100),
      },
      paused: {
        get: jest.fn(() => true),
      },
      muted: {
        get: jest.fn(() => false),
        set: jest.fn(),
      },
      volume: {
        get: jest.fn(() => 1),
        set: jest.fn(),
      },
      playbackRate: {
        get: jest.fn(() => 1),
        set: jest.fn(),
      },
    });
  }
}

function setupMediaErrorMock() {
  // Mock MediaError constructor
  if (typeof window !== 'undefined' && !window.MediaError) {
    global.MediaError = class MediaError {
      constructor(code) {
        this.code = code;
      }

      static get MEDIA_ERR_ABORTED() {
        return 1;
      }
      static get MEDIA_ERR_NETWORK() {
        return 2;
      }
      static get MEDIA_ERR_DECODE() {
        return 3;
      }
      static get MEDIA_ERR_SRC_NOT_SUPPORTED() {
        return 4;
      }
    };
  }
}

module.exports = { setupMediaElementMock, setupMediaErrorMock };
