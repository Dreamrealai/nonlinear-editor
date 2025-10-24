"use strict";
/**
 * Comprehensive AudioContext and Web Audio API mock for Jest tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockAudioBuffer = exports.MockStereoPannerNode = exports.MockBiquadFilterNode = exports.MockOscillatorNode = exports.MockGainNode = exports.MockAudioBufferSourceNode = exports.MockAnalyserNode = exports.MockAudioContext = void 0;
exports.setupAudioContextMock = setupAudioContextMock;
// Mock AudioNode base class
class MockAudioNode {
    constructor() {
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
// Mock AnalyserNode
class MockAnalyserNode extends MockAudioNode {
    constructor() {
        super(...arguments);
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
exports.MockAnalyserNode = MockAnalyserNode;
// Mock AudioBufferSourceNode
class MockAudioBufferSourceNode extends MockAudioNode {
    constructor() {
        super(...arguments);
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
exports.MockAudioBufferSourceNode = MockAudioBufferSourceNode;
// Mock GainNode
class MockGainNode extends MockAudioNode {
    constructor() {
        super(...arguments);
        this.gain = {
            value: 1,
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
        };
    }
}
exports.MockGainNode = MockGainNode;
// Mock OscillatorNode
class MockOscillatorNode extends MockAudioNode {
    constructor() {
        super(...arguments);
        this.type = 'sine';
        this.frequency = {
            value: 440,
            setValueAtTime: jest.fn(),
            linearRampToValueAtTime: jest.fn(),
            exponentialRampToValueAtTime: jest.fn(),
        };
        this.detune = { value: 0 };
        this.onended = null;
        this.start = jest.fn();
        this.stop = jest.fn();
        this.setPeriodicWave = jest.fn();
    }
}
exports.MockOscillatorNode = MockOscillatorNode;
// Mock BiquadFilterNode
class MockBiquadFilterNode extends MockAudioNode {
    constructor() {
        super(...arguments);
        this.type = 'lowpass';
        this.frequency = { value: 350 };
        this.detune = { value: 0 };
        this.Q = { value: 1 };
        this.gain = { value: 0 };
        this.getFrequencyResponse = jest.fn();
    }
}
exports.MockBiquadFilterNode = MockBiquadFilterNode;
// Mock StereoPannerNode
class MockStereoPannerNode extends MockAudioNode {
    constructor() {
        super(...arguments);
        this.pan = { value: 0 };
    }
}
exports.MockStereoPannerNode = MockStereoPannerNode;
// Mock AudioDestinationNode
class MockAudioDestinationNode extends MockAudioNode {
    constructor() {
        super(...arguments);
        this.maxChannelCount = 2;
    }
}
// Mock AudioBuffer
class MockAudioBuffer {
    constructor(options) {
        this.getChannelData = jest.fn((channel) => {
            return new Float32Array(this.length);
        });
        this.copyFromChannel = jest.fn();
        this.copyToChannel = jest.fn();
        this.length = options.length;
        this.numberOfChannels = options.numberOfChannels;
        this.sampleRate = options.sampleRate;
        this.duration = options.length / options.sampleRate;
    }
}
exports.MockAudioBuffer = MockAudioBuffer;
// Mock AudioContext
class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.sampleRate = 44100;
        this.currentTime = 0;
        this.destination = new MockAudioDestinationNode();
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
        this.createBiquadFilter = jest.fn(() => new MockBiquadFilterNode());
        this.createBuffer = jest.fn((numberOfChannels, length, sampleRate) => {
            return new MockAudioBuffer({ numberOfChannels, length, sampleRate });
        });
        this.createBufferSource = jest.fn(() => new MockAudioBufferSourceNode());
        this.createGain = jest.fn(() => new MockGainNode());
        this.createOscillator = jest.fn(() => new MockOscillatorNode());
        this.createStereoPanner = jest.fn(() => new MockStereoPannerNode());
        this.createMediaElementSource = jest.fn((element) => {
            const node = new MockAudioNode();
            node.context = this;
            return node;
        });
        this.createMediaStreamSource = jest.fn((stream) => {
            const node = new MockAudioNode();
            node.context = this;
            return node;
        });
        this.decodeAudioData = jest.fn((arrayBuffer) => {
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
        // Simulate time progression
        setInterval(() => {
            this.currentTime += 0.1;
        }, 100);
    }
}
exports.MockAudioContext = MockAudioContext;
// Export for global setup
function setupAudioContextMock() {
    if (typeof window !== 'undefined') {
        // @ts-ignore
        window.AudioContext = MockAudioContext;
        // @ts-ignore
        window.webkitAudioContext = MockAudioContext;
        // @ts-ignore
        global.AudioContext = MockAudioContext;
        // @ts-ignore
        global.webkitAudioContext = MockAudioContext;
    }
}
