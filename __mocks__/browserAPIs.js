/* eslint-env jest */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Comprehensive Browser API mocks for Jest tests
 * Includes: AudioContext, Canvas, MediaElement, Observers, Performance
 */

// ============================================================================
// AudioContext and Web Audio API Mocks
// ============================================================================

class MockAudioNode {
  constructor() {
    this.context = null;
    this.numberOfInputs = 0;
    this.numberOfOutputs = 1;
    this.channelCount = 2;
    this.channelCountMode = 'max';
    this.channelInterpretation = 'speakers';
    this.connect = jest.fn().mockReturnThis();
    this.disconnect = jest.fn();
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.dispatchEvent = jest.fn();
  }
}

class MockAnalyserNode extends MockAudioNode {
  constructor() {
    super();
    this.fftSize = 2048;
    this.frequencyBinCount = 1024;
    this.minDecibels = -100;
    this.maxDecibels = -30;
    this.smoothingTimeConstant = 0.8;

    this.getFloatFrequencyData = jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = -100 + Math.random() * 70;
      }
    });

    this.getByteFrequencyData = jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    });

    this.getFloatTimeDomainData = jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.sin(i * 0.1) * 0.5;
      }
    });

    this.getByteTimeDomainData = jest.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 128 + Math.floor(Math.sin(i * 0.1) * 64);
      }
    });
  }
}

class MockAudioBufferSourceNode extends MockAudioNode {
  constructor() {
    super();
    this.buffer = null;
    this.playbackRate = { value: 1 };
    this.detune = { value: 0 };
    this.loop = false;
    this.loopStart = 0;
    this.loopEnd = 0;
    this.onended = null;
    this.start = jest.fn();
    this.stop = jest.fn();
  }
}

class MockGainNode extends MockAudioNode {
  constructor() {
    super();
    this.gain = {
      value: 1,
      setValueAtTime: jest.fn(),
      linearRampToValueAtTime: jest.fn(),
      exponentialRampToValueAtTime: jest.fn(),
    };
  }
}

class MockAudioBuffer {
  constructor(options) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
    this.getChannelData = jest.fn(() => new Float32Array(this.length));
    this.copyFromChannel = jest.fn();
    this.copyToChannel = jest.fn();
  }
}

class MockAudioContext {
  constructor() {
    this.state = 'running';
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.destination = new MockAudioNode();
    this.listener = {
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      forwardX: { value: 0 },
      forwardY: { value: 0 },
      forwardZ: { value: -1 },
      upX: { value: 0 },
      upY: { value: 1 },
      upZ: { value: 0 },
    };

    this.createAnalyser = jest.fn(() => new MockAnalyserNode());
    this.createBiquadFilter = jest.fn(() => new MockAudioNode());
    this.createBuffer = jest.fn((numberOfChannels, length, sampleRate) => {
      return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
    });
    this.createBufferSource = jest.fn(() => new MockAudioBufferSourceNode());
    this.createGain = jest.fn(() => new MockGainNode());
    this.createOscillator = jest.fn(() => new MockAudioNode());
    this.createMediaElementSource = jest.fn(() => new MockAudioNode());
    this.createMediaStreamSource = jest.fn(() => new MockAudioNode());

    this.decodeAudioData = jest.fn(() => {
      return Promise.resolve(new MockAudioBuffer({
        numberOfChannels: 2,
        length: 44100,
        sampleRate: 44100,
      }));
    });

    this.suspend = jest.fn(() => {
      this.state = 'suspended';
      return Promise.resolve();
    });

    this.resume = jest.fn(() => {
      this.state = 'running';
      return Promise.resolve();
    });

    this.close = jest.fn(() => {
      this.state = 'closed';
      return Promise.resolve();
    });

    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.dispatchEvent = jest.fn();
  }
}

// ============================================================================
// Canvas API Mocks
// ============================================================================

class MockCanvasGradient {
  constructor() {
    this.addColorStop = jest.fn();
  }
}

class MockCanvasPattern {
  constructor() {
    this.setTransform = jest.fn();
  }
}

class MockTextMetrics {
  constructor() {
    this.width = 100;
    this.actualBoundingBoxLeft = 0;
    this.actualBoundingBoxRight = 100;
    this.fontBoundingBoxAscent = 10;
    this.fontBoundingBoxDescent = 2;
  }
}

class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;

    // State
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.globalAlpha = 1;
    this.lineWidth = 1;
    this.lineCap = 'butt';
    this.lineJoin = 'miter';
    this.font = '10px sans-serif';
    this.textAlign = 'start';
    this.textBaseline = 'alphabetic';

    // Methods
    this.clearRect = jest.fn();
    this.fillRect = jest.fn();
    this.strokeRect = jest.fn();
    this.fillText = jest.fn();
    this.strokeText = jest.fn();
    this.measureText = jest.fn(() => new MockTextMetrics());
    this.getLineDash = jest.fn(() => []);
    this.setLineDash = jest.fn();
    this.createLinearGradient = jest.fn(() => new MockCanvasGradient());
    this.createRadialGradient = jest.fn(() => new MockCanvasGradient());
    this.createPattern = jest.fn(() => new MockCanvasPattern());
    this.beginPath = jest.fn();
    this.closePath = jest.fn();
    this.moveTo = jest.fn();
    this.lineTo = jest.fn();
    this.bezierCurveTo = jest.fn();
    this.quadraticCurveTo = jest.fn();
    this.arc = jest.fn();
    this.arcTo = jest.fn();
    this.ellipse = jest.fn();
    this.rect = jest.fn();
    this.fill = jest.fn();
    this.stroke = jest.fn();
    this.clip = jest.fn();
    this.isPointInPath = jest.fn(() => false);
    this.isPointInStroke = jest.fn(() => false);
    this.rotate = jest.fn();
    this.scale = jest.fn();
    this.translate = jest.fn();
    this.transform = jest.fn();
    this.setTransform = jest.fn();
    this.getTransform = jest.fn(() => ({
      a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
      is2D: true,
      isIdentity: true,
    }));
    this.resetTransform = jest.fn();
    this.drawImage = jest.fn();
    this.createImageData = jest.fn((width, height) => ({
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    }));
    this.getImageData = jest.fn((sx, sy, sw, sh) => ({
      width: sw,
      height: sh,
      data: new Uint8ClampedArray(sw * sh * 4),
      colorSpace: 'srgb',
    }));
    this.putImageData = jest.fn();
    this.save = jest.fn();
    this.restore = jest.fn();
  }
}

// ============================================================================
// Media Element Mocks
// ============================================================================

class MockTimeRanges {
  constructor(ranges = []) {
    this.ranges = ranges;
  }

  get length() {
    return this.ranges.length;
  }

  start(index) {
    if (index >= this.ranges.length) {
      throw new Error('Index out of bounds');
    }
    return this.ranges[index].start;
  }

  end(index) {
    if (index >= this.ranges.length) {
      throw new Error('Index out of bounds');
    }
    return this.ranges[index].end;
  }
}

// ============================================================================
// Observer API Mocks
// ============================================================================

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observedElements = new Set();
    this.observe = jest.fn((target) => {
      this.observedElements.add(target);
      const entry = {
        target,
        contentRect: {
          x: 0,
          y: 0,
          width: 1024,
          height: 768,
          top: 0,
          right: 1024,
          bottom: 768,
          left: 0,
        },
        borderBoxSize: [{ blockSize: 768, inlineSize: 1024 }],
        contentBoxSize: [{ blockSize: 768, inlineSize: 1024 }],
      };
      setTimeout(() => this.callback([entry], this), 0);
    });
    this.unobserve = jest.fn((target) => {
      this.observedElements.delete(target);
    });
    this.disconnect = jest.fn(() => {
      this.observedElements.clear();
    });
  }
}

class MockIntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.observedElements = new Set();
    this.root = options.root || null;
    this.rootMargin = options.rootMargin || '0px';
    this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold || 0];

    this.observe = jest.fn((target) => {
      this.observedElements.add(target);
      const entry = {
        target,
        boundingClientRect: { x: 0, y: 0, width: 100, height: 100, top: 0, right: 100, bottom: 100, left: 0 },
        intersectionRect: { x: 0, y: 0, width: 100, height: 100, top: 0, right: 100, bottom: 100, left: 0 },
        rootBounds: { x: 0, y: 0, width: 1024, height: 768, top: 0, right: 1024, bottom: 768, left: 0 },
        isIntersecting: true,
        intersectionRatio: 1,
        time: Date.now(),
      };
      setTimeout(() => this.callback([entry], this), 0);
    });

    this.unobserve = jest.fn((target) => {
      this.observedElements.delete(target);
    });

    this.disconnect = jest.fn(() => {
      this.observedElements.clear();
    });

    this.takeRecords = jest.fn(() => []);
  }
}

class MockMutationObserver {
  constructor(callback) {
    this.callback = callback;
    this.observedNodes = new Set();
    this.observe = jest.fn((target) => {
      this.observedNodes.add(target);
    });
    this.disconnect = jest.fn(() => {
      this.observedNodes.clear();
    });
    this.takeRecords = jest.fn(() => []);
  }
}

// ============================================================================
// Performance API Mocks
// ============================================================================

class MockPerformanceEntry {
  constructor(name, entryType, startTime, duration = 0) {
    this.name = name;
    this.entryType = entryType;
    this.startTime = startTime;
    this.duration = duration;
  }

  toJSON() {
    return {
      name: this.name,
      entryType: this.entryType,
      startTime: this.startTime,
      duration: this.duration,
    };
  }
}

// ============================================================================
// Setup Functions
// ============================================================================

function setupAudioContextMock() {
  if (typeof window !== 'undefined') {
    window.AudioContext = MockAudioContext;
    window.webkitAudioContext = MockAudioContext;
  }
  if (typeof global !== 'undefined') {
    global.AudioContext = MockAudioContext;
    global.webkitAudioContext = MockAudioContext;
  }
}

function setupCanvasMock() {
  if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = jest.fn(function(contextType) {
      if (contextType === '2d') {
        return new MockCanvasRenderingContext2D(this);
      }
      return null;
    });

    HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');
    HTMLCanvasElement.prototype.toBlob = jest.fn((callback) => {
      callback?.(new Blob(['mock'], { type: 'image/png' }));
    });
  }
}

function setupMediaElementMock() {
  if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
    HTMLMediaElement.prototype.load = jest.fn();
    HTMLMediaElement.prototype.canPlayType = jest.fn((type) => {
      if (type.includes('video/mp4') || type.includes('audio/mpeg')) {
        return 'probably';
      }
      if (type.includes('video/') || type.includes('audio/')) {
        return 'maybe';
      }
      return '';
    });
  }

  if (typeof HTMLVideoElement !== 'undefined') {
    Object.defineProperties(HTMLVideoElement.prototype, {
      videoWidth: { get: jest.fn(() => 1920), configurable: true },
      videoHeight: { get: jest.fn(() => 1080), configurable: true },
    });
  }
}

function setupObserversMock() {
  if (typeof window !== 'undefined') {
    window.ResizeObserver = MockResizeObserver;
    window.IntersectionObserver = MockIntersectionObserver;
    window.MutationObserver = MockMutationObserver;
  }
  if (typeof global !== 'undefined') {
    global.ResizeObserver = MockResizeObserver;
    global.IntersectionObserver = MockIntersectionObserver;
    global.MutationObserver = MockMutationObserver;
  }
}

function setupPerformanceMock() {
  if (typeof performance !== 'undefined') {
    const entries = [];
    const marks = new Map();
    let currentTime = 0;

    performance.now = jest.fn(() => {
      currentTime += 1;
      return currentTime;
    });

    performance.mark = jest.fn((markName) => {
      const mark = new MockPerformanceEntry(markName, 'mark', performance.now());
      marks.set(markName, mark);
      entries.push(mark);
      return mark;
    });

    performance.measure = jest.fn((measureName, startMark, endMark) => {
      let startTime = 0;
      let endTime = performance.now();

      if (startMark && marks.has(startMark)) {
        startTime = marks.get(startMark).startTime;
      }
      if (endMark && marks.has(endMark)) {
        endTime = marks.get(endMark).startTime;
      }

      const measure = new MockPerformanceEntry(
        measureName,
        'measure',
        startTime,
        endTime - startTime
      );
      entries.push(measure);
      return measure;
    });

    performance.clearMarks = jest.fn((markName) => {
      if (markName) {
        marks.delete(markName);
      } else {
        marks.clear();
      }
    });

    performance.clearMeasures = jest.fn();

    performance.getEntries = jest.fn(() => [...entries]);

    performance.getEntriesByType = jest.fn((type) => {
      return entries.filter(e => e.entryType === type);
    });

    performance.getEntriesByName = jest.fn((name, type) => {
      return entries.filter(e => e.name === name && (type ? e.entryType === type : true));
    });
  }
}

// ============================================================================
// Worker API Mock
// ============================================================================

class MockWorker {
  constructor(stringUrl) {
    this.url = stringUrl;
    this.onmessage = null;
    this.onerror = null;
    this.onmessageerror = null;
    this.addEventListener = jest.fn();
    this.removeEventListener = jest.fn();
    this.dispatchEvent = jest.fn();
    this.terminate = jest.fn();

    this.postMessage = jest.fn((message) => {
      // Simulate async worker response
      setTimeout(() => {
        if (this.onmessage) {
          const event = {
            data: { type: 'complete', data: new Float32Array(100) },
            target: this,
          };
          this.onmessage(event);
        }
      }, 10);
    });
  }
}

function setupWorkerMock() {
  if (typeof window !== 'undefined') {
    window.Worker = MockWorker;
  }
  if (typeof global !== 'undefined') {
    global.Worker = MockWorker;
  }
}

// Export all setup functions
module.exports = {
  setupAudioContextMock,
  setupCanvasMock,
  setupMediaElementMock,
  setupObserversMock,
  setupPerformanceMock,
  setupWorkerMock,
  MockAudioContext,
  MockCanvasRenderingContext2D,
  MockResizeObserver,
  MockIntersectionObserver,
  MockTimeRanges,
  MockWorker,
};
