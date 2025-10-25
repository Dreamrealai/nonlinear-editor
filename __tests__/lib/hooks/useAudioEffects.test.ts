/**
 * Tests for useAudioEffects Hook
 *
 * Tests Web Audio API integration including:
 * - Audio context creation
 * - Audio processing chain setup
 * - Volume, EQ, compression effects
 * - Fade in/out
 * - Cleanup
 */

import { renderHook, act } from '@testing-library/react';
import { useAudioEffects } from '@/lib/hooks/useAudioEffects';
import type { AudioEffects } from '@/types/timeline';

// Mock Web Audio API
class MockAudioContext {
  sampleRate = 44100;
  currentTime = 0;
  destination = {};

  createMediaElementSource = jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));

  createGain = jest.fn(() => ({
    gain: {
      value: 1,
      setTargetAtTime: jest.fn(),
    },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));

  createBiquadFilter = jest.fn(() => ({
    type: 'lowshelf',
    frequency: { value: 200 },
    gain: { value: 0, setTargetAtTime: jest.fn() },
    Q: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));

  createDynamicsCompressor = jest.fn(() => ({
    threshold: { value: -24 },
    knee: { value: 30 },
    ratio: { value: 1, setTargetAtTime: jest.fn() },
    attack: { value: 0.003 },
    release: { value: 0.25 },
    connect: jest.fn(),
    disconnect: jest.fn(),
  }));

  close = jest.fn(() => Promise.resolve());
}

describe('useAudioEffects', () => {
  let mockAudioContext: MockAudioContext;

  beforeEach(() => {
    mockAudioContext = new MockAudioContext();
    (window as any).AudioContext = jest.fn(() => mockAudioContext);
  });

  afterEach(() => {
    delete (window as any).AudioContext;
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should return hook methods', () => {
      const { result } = renderHook(() => useAudioEffects());

      expect(result.current.connectAudio).toBeInstanceOf(Function);
      expect(result.current.applyEffects).toBeInstanceOf(Function);
      expect(result.current.disconnectAudio).toBeInstanceOf(Function);
    });

    it('should create AudioContext on first use', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      act(() => {
        result.current.connectAudio('clip-1', videoElement);
      });

      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });

    it('should reuse AudioContext for multiple clips', () => {
      const { result } = renderHook(() => useAudioEffects());
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');

      act(() => {
        result.current.connectAudio('clip-1', video1);
        result.current.connectAudio('clip-2', video2);
      });

      expect(window.AudioContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Audio Chain Connection', () => {
    it('should connect audio processing chain', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: ReturnType<typeof result.current.connectAudio>;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      expect(audioNode).not.toBeNull();
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledWith(videoElement);
      expect(mockAudioContext.createGain).toHaveBeenCalled();
      expect(mockAudioContext.createBiquadFilter).toHaveBeenCalledTimes(3); // bass, mid, treble
      expect(mockAudioContext.createDynamicsCompressor).toHaveBeenCalled();
    });

    it('should return existing audio node if already connected', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let firstNode: ReturnType<typeof result.current.connectAudio>;
      let secondNode: ReturnType<typeof result.current.connectAudio>;

      act(() => {
        firstNode = result.current.connectAudio('clip-1', videoElement);
        secondNode = result.current.connectAudio('clip-1', videoElement);
      });

      expect(firstNode).toBe(secondNode);
      expect(mockAudioContext.createMediaElementSource).toHaveBeenCalledTimes(1);
    });

    it('should handle connection errors gracefully', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      mockAudioContext.createMediaElementSource = jest.fn(() => {
        throw new Error('Connection failed');
      });

      let audioNode: ReturnType<typeof result.current.connectAudio>;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      expect(audioNode).toBeNull();
    });
  });

  describe('Effect Application', () => {
    it('should apply default effects when none provided', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      act(() => {
        result.current.applyEffects('clip-1', undefined, 0.5, 10);
      });

      expect(audioNode?.gainNode.gain.setTargetAtTime).toHaveBeenCalled();
      expect(audioNode?.bassFilter.gain.setTargetAtTime).toHaveBeenCalled();
      expect(audioNode?.midFilter.gain.setTargetAtTime).toHaveBeenCalled();
      expect(audioNode?.trebleFilter.gain.setTargetAtTime).toHaveBeenCalled();
    });

    it('should apply volume changes', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 6, // +6dB
        mute: false,
      };

      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });

      expect(audioNode?.gainNode.gain.setTargetAtTime).toHaveBeenCalled();
      // +6dB = 10^(6/20) ≈ 2.0
      const gainValue = audioNode?.gainNode.gain.setTargetAtTime.mock.calls[0][0];
      expect(gainValue).toBeCloseTo(2.0, 1);
    });

    it('should mute when mute is true', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: true,
      };

      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });

      const gainValue = audioNode?.gainNode.gain.setTargetAtTime.mock.calls[0][0];
      expect(gainValue).toBe(0);
    });

    it('should apply fade in', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
        fadeIn: 2, // 2 second fade in
      };

      // Halfway through fade (1 second into 2 second fade)
      act(() => {
        result.current.applyEffects('clip-1', effects, 1, 10);
      });

      const gainValue = audioNode?.gainNode.gain.setTargetAtTime.mock.calls[0][0];
      expect(gainValue).toBeCloseTo(0.5, 1); // 50% of full volume
    });

    it('should apply fade out', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
        fadeOut: 2, // 2 second fade out
      };

      // 1 second before end (9 seconds into 10 second clip)
      act(() => {
        result.current.applyEffects('clip-1', effects, 9, 10);
      });

      const gainValue = audioNode?.gainNode.gain.setTargetAtTime.mock.calls[0][0];
      expect(gainValue).toBeCloseTo(0.5, 1); // 50% of full volume
    });

    it('should apply EQ settings', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
        bassGain: 5,
        midGain: -3,
        trebleGain: 2,
      };

      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });

      expect(audioNode?.bassFilter.gain.setTargetAtTime).toHaveBeenCalledWith(
        5,
        expect.any(Number),
        0.01
      );
      expect(audioNode?.midFilter.gain.setTargetAtTime).toHaveBeenCalledWith(
        -3,
        expect.any(Number),
        0.01
      );
      expect(audioNode?.trebleFilter.gain.setTargetAtTime).toHaveBeenCalledWith(
        2,
        expect.any(Number),
        0.01
      );
    });

    it('should apply compression', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
        compression: 50, // 50% compression
      };

      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });

      // 50% = ratio of 10.5:1 (1 + 50/100 * 19)
      const ratioValue = audioNode?.compressor.ratio.setTargetAtTime.mock.calls[0][0];
      expect(ratioValue).toBeCloseTo(10.5, 1);
    });

    it('should enable normalization', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
        normalize: true,
      };

      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });

      expect(audioNode?.compressor.threshold.value).toBe(-18);
    });

    it('should do nothing if audio node not connected', () => {
      const { result } = renderHook(() => useAudioEffects());

      const effects: AudioEffects = {
        volume: 0,
        mute: false,
      };

      // Should not throw
      act(() => {
        result.current.applyEffects('clip-1', effects, 0.5, 10);
      });
    });
  });

  describe('Disconnection', () => {
    it('should disconnect audio nodes', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      act(() => {
        result.current.disconnectAudio('clip-1');
      });

      expect(audioNode?.source.disconnect).toHaveBeenCalled();
      expect(audioNode?.gainNode.disconnect).toHaveBeenCalled();
      expect(audioNode?.bassFilter.disconnect).toHaveBeenCalled();
      expect(audioNode?.midFilter.disconnect).toHaveBeenCalled();
      expect(audioNode?.trebleFilter.disconnect).toHaveBeenCalled();
      expect(audioNode?.compressor.disconnect).toHaveBeenCalled();
    });

    it('should do nothing if audio node not found', () => {
      const { result } = renderHook(() => useAudioEffects());

      // Should not throw
      act(() => {
        result.current.disconnectAudio('nonexistent-clip');
      });
    });

    it('should handle disconnect errors gracefully', () => {
      const { result } = renderHook(() => useAudioEffects());
      const videoElement = document.createElement('video');

      let audioNode: any;

      act(() => {
        audioNode = result.current.connectAudio('clip-1', videoElement);
      });

      audioNode.source.disconnect = jest.fn(() => {
        throw new Error('Disconnect failed');
      });

      // Should not throw
      act(() => {
        result.current.disconnectAudio('clip-1');
      });
    });
  });

  describe('Cleanup', () => {
    it('should disconnect all nodes and close context on unmount', async () => {
      const { result, unmount } = renderHook(() => useAudioEffects());
      const video1 = document.createElement('video');
      const video2 = document.createElement('video');

      let node1: any, node2: any;

      act(() => {
        node1 = result.current.connectAudio('clip-1', video1);
        node2 = result.current.connectAudio('clip-2', video2);
      });

      unmount();

      // Wait for async cleanup
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(node1?.source.disconnect).toHaveBeenCalled();
      expect(node2?.source.disconnect).toHaveBeenCalled();
      expect(mockAudioContext.close).toHaveBeenCalled();
    });
  });
});
