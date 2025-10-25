/**
 * Comprehensive AudioContext and Web Audio API mock for Jest tests
 */

// Mock AudioNode base class
class MockAudioNode {
  numberOfInputs = 0;
  numberOfOutputs = 1;
  channelCount = 2;
  channelCountMode: ChannelCountMode = 'max';
  channelInterpretation: ChannelInterpretation = 'speakers';
  context?: unknown;

  connect = jest.fn().mockReturnThis();
  disconnect = jest.fn();
  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();
}

// Mock AnalyserNode
export class MockAnalyserNode extends MockAudioNode {
  fftSize = 2048;
  frequencyBinCount = 1024;
  minDecibels = -100;
  maxDecibels = -30;
  smoothingTimeConstant = 0.8;

  getFloatFrequencyData = jest.fn((array: Float32Array): void => {
    for (let i = 0; i < array.length; i++) {
      array[i] = -100 + Math.random() * 70;
    }
  });

  getByteFrequencyData = jest.fn((array: Uint8Array): void => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  });

  getFloatTimeDomainData = jest.fn((array: Float32Array): void => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.sin(i * 0.1) * 0.5;
    }
  });

  getByteTimeDomainData = jest.fn((array: Uint8Array): void => {
    for (let i = 0; i < array.length; i++) {
      array[i] = 128 + Math.floor(Math.sin(i * 0.1) * 64);
    }
  });
}

// Mock AudioBufferSourceNode
export class MockAudioBufferSourceNode extends MockAudioNode {
  buffer: AudioBuffer | null = null;
  playbackRate = { value: 1 };
  detune = { value: 0 };
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  onended: (() => void) | null = null;

  start = jest.fn();
  stop = jest.fn();
}

// Mock GainNode
export class MockGainNode extends MockAudioNode {
  gain = {
    value: 1,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
}

// Mock OscillatorNode
export class MockOscillatorNode extends MockAudioNode {
  type: OscillatorType = 'sine';
  frequency = {
    value: 440,
    setValueAtTime: jest.fn(),
    linearRampToValueAtTime: jest.fn(),
    exponentialRampToValueAtTime: jest.fn(),
  };
  detune = { value: 0 };
  onended: (() => void) | null = null;

  start = jest.fn();
  stop = jest.fn();
  setPeriodicWave = jest.fn();
}

// Mock BiquadFilterNode
export class MockBiquadFilterNode extends MockAudioNode {
  type: BiquadFilterType = 'lowpass';
  frequency = { value: 350 };
  detune = { value: 0 };
  Q = { value: 1 };
  gain = { value: 0 };

  getFrequencyResponse = jest.fn();
}

// Mock StereoPannerNode
export class MockStereoPannerNode extends MockAudioNode {
  pan = { value: 0 };
}

// Mock AudioDestinationNode
class MockAudioDestinationNode extends MockAudioNode {
  maxChannelCount = 2;
}

// Mock AudioBuffer
export class MockAudioBuffer {
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  duration: number;

  constructor(options: { numberOfChannels: number; length: number; sampleRate: number }) {
    this.length = options.length;
    this.numberOfChannels = options.numberOfChannels;
    this.sampleRate = options.sampleRate;
    this.duration = options.length / options.sampleRate;
  }

  getChannelData = jest.fn((_channel: number): Float32Array => {
    return new Float32Array(this.length);
  });

  copyFromChannel = jest.fn();
  copyToChannel = jest.fn();
}

// Mock AudioContext
export class MockAudioContext {
  state: AudioContextState = 'running';
  sampleRate = 44100;
  currentTime = 0;
  destination = new MockAudioDestinationNode();
  listener = {
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

  createAnalyser = jest.fn((): MockAnalyserNode => new MockAnalyserNode());
  createBiquadFilter = jest.fn((): MockBiquadFilterNode => new MockBiquadFilterNode());
  createBuffer = jest.fn(
    (numberOfChannels: number, length: number, sampleRate: number): MockAudioBuffer => {
      return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
    }
  );
  createBufferSource = jest.fn((): MockAudioBufferSourceNode => new MockAudioBufferSourceNode());
  createGain = jest.fn((): MockGainNode => new MockGainNode());
  createOscillator = jest.fn((): MockOscillatorNode => new MockOscillatorNode());
  createStereoPanner = jest.fn((): MockStereoPannerNode => new MockStereoPannerNode());
  createMediaElementSource = jest.fn((_element: HTMLMediaElement): MockAudioNode => {
    const node = new MockAudioNode();
    node.context = this;
    return node;
  });
  createMediaStreamSource = jest.fn((_stream: MediaStream): MockAudioNode => {
    const node = new MockAudioNode();
    node.context = this;
    return node;
  });
  decodeAudioData = jest.fn((_arrayBuffer: ArrayBuffer): Promise<MockAudioBuffer> => {
    return Promise.resolve(
      new MockAudioBuffer({
        numberOfChannels: 2,
        length: 44100,
        sampleRate: 44100,
      })
    );
  });
  suspend = jest.fn((): Promise<void> => {
    this.state = 'suspended';
    return Promise.resolve();
  });
  resume = jest.fn((): Promise<void> => {
    this.state = 'running';
    return Promise.resolve();
  });
  close = jest.fn((): Promise<void> => {
    this.state = 'closed';
    return Promise.resolve();
  });

  addEventListener = jest.fn();
  removeEventListener = jest.fn();
  dispatchEvent = jest.fn();

  constructor() {
    // Simulate time progression
    setInterval(() => {
      this.currentTime += 0.1;
    }, 100);
  }
}

// Export for global setup
export function setupAudioContextMock(): void {
  if (typeof window !== 'undefined') {
    (window as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      MockAudioContext;
    (window as unknown as { webkitAudioContext: typeof MockAudioContext }).webkitAudioContext =
      MockAudioContext;
  }
  if (typeof global !== 'undefined') {
    (global as unknown as { AudioContext: typeof MockAudioContext }).AudioContext =
      MockAudioContext;
    (global as unknown as { webkitAudioContext: typeof MockAudioContext }).webkitAudioContext =
      MockAudioContext;
  }
}
