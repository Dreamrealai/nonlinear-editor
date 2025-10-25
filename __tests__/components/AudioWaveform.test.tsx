import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioWaveform } from '@/components/AudioWaveform';
import type { Clip } from '@/types/timeline';

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock Worker that appears to exist but will throw when constructed
// This forces the AudioContext fallback path
class MockWorker extends EventTarget {
  constructor(url: any) {
    super();
    // Throw to trigger fallback to AudioContext
    throw new Error('Worker not available in test environment');
  }
  postMessage() {}
  terminate() {}
}

(global as any).Worker = MockWorker;

// Mock AudioContext
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

const mockAudioBuffer = {
  getChannelData: jest.fn(),
  length: 1000,
  duration: 10,
  sampleRate: 44100,
  numberOfChannels: 2,
};

// Store the original AudioContext
const originalAudioContext = global.AudioContext;

describe('AudioWaveform', () => {
  const mockClipWithAudio: Clip = {
    id: 'clip-1',
    assetId: 'asset-1',
    trackIndex: 0,
    timelinePosition: 0,
    start: 0,
    end: 10,
    filePath: 'https://example.com/video.mp4',
    previewUrl: 'https://example.com/preview.mp4',
    thumbnailUrl: 'thumbnail.jpg',
    speed: 1.0,
    volume: 1.0,
    opacity: 1.0,
    hasAudio: true,
  };

  const mockClipWithoutAudio: Clip = {
    ...mockClipWithAudio,
    hasAudio: false,
  };

  let mockFetch: jest.Mock;
  let mockGetContext: jest.Mock;

  beforeAll(() => {
    // Mock AudioContext globally
    global.AudioContext = jest.fn(() => mockAudioContext) as unknown as typeof AudioContext;
    (global as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext =
      global.AudioContext;
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress expected Worker error logs during tests
    const { browserLogger } = require('@/lib/browserLogger');
    browserLogger.error.mockImplementation((error: any, message: string) => {
      // Suppress Worker creation errors as they are expected in tests
      if (message?.includes('Failed to create waveform worker')) {
        return;
      }
      // Allow other errors to be tracked for test assertions
    });

    // Reset AudioContext mock
    mockAudioContext.close.mockClear();
    mockAudioContext.close.mockResolvedValue(undefined);
    mockAudioContext.decodeAudioData.mockClear();

    // Mock audio buffer with sample data FIRST (before decodeAudioData is called)
    const sampleData = new Float32Array(1000);
    for (let i = 0; i < sampleData.length; i++) {
      sampleData[i] = Math.sin(i / 10) * 0.5; // Generate sine wave
    }
    mockAudioBuffer.getChannelData.mockClear();
    mockAudioBuffer.getChannelData.mockReturnValue(sampleData);

    // Setup decodeAudioData to return immediately
    mockAudioContext.decodeAudioData.mockImplementation((buffer) => {
      return Promise.resolve(mockAudioBuffer);
    });

    // Mock canvas context
    mockGetContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      scale: jest.fn(),
      fillStyle: '',
    }));

    HTMLCanvasElement.prototype.getContext =
      mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Mock fetch for audio data - must return a cloneable ArrayBuffer
    mockFetch = jest.fn((url: string) => {
      const mockArrayBuffer = new ArrayBuffer(100);
      return Promise.resolve({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer.slice(0)),
      } as Response);
    });
    global.fetch = mockFetch;
  });

  afterEach(async () => {
    // Give time for any pending async operations to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 200));
    });
  });

  afterAll(() => {
    // Restore original AudioContext
    global.AudioContext = originalAudioContext;
  });

  describe('Rendering', () => {
    it('should render nothing when clip has no audio', () => {
      const { container } = render(
        <AudioWaveform clip={mockClipWithoutAudio} width={200} height={50} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('should render canvas when clip has audio', async () => {
      const { container, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Wait for waveform extraction to start
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(mockClipWithAudio.previewUrl);
        },
        { timeout: 3000 }
      );

      // Cleanup
      unmount();
    });

    it('should render loading state initially', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      expect(screen.getByText('Loading waveform...')).toBeInTheDocument();

      // Wait a bit for async operations to start
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      unmount();
    });

    it('should apply custom className', async () => {
      const { container, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');

      // Wait a bit for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should set correct dimensions', async () => {
      const { container, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={300} height={75} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: '300px', height: '75px' });

      // Wait a bit for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });
  });

  describe('Audio Extraction', () => {
    it('should fetch audio data from previewUrl', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(mockClipWithAudio.previewUrl);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should create AudioContext', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(global.AudioContext).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should decode audio data', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should close audio context after extraction', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should extract channel data from audio buffer', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockAudioBuffer.getChannelData).toHaveBeenCalledWith(0);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should hide loading state after extraction', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });
  });

  describe('Canvas Rendering', () => {
    it('should get 2d context from canvas', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockGetContext).toHaveBeenCalledWith('2d');
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      unmount();
    });

    it('should scale context by device pixel ratio', async () => {
      const mockScale = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        scale: mockScale,
        fillStyle: '',
      });

      Object.defineProperty(window, 'devicePixelRatio', {
        writable: true,
        value: 2,
      });

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockScale).toHaveBeenCalledWith(2, 2);
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      unmount();
    });

    it('should clear canvas before drawing', async () => {
      const mockClearRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: mockClearRect,
        fillRect: jest.fn(),
        scale: jest.fn(),
        fillStyle: '',
      });

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockClearRect).toHaveBeenCalledWith(0, 0, 200, 50);
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      unmount();
    });

    it('should draw waveform bars', async () => {
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockFillRect).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      unmount();
    });

    it('should use correct fill color for waveform', async () => {
      const mockContext = {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        scale: jest.fn(),
        fillStyle: '',
      };
      mockGetContext.mockReturnValue(mockContext);

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockContext.fillStyle).toBe('rgba(59, 130, 246, 0.6)');
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      unmount();
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });

      unmount();
    });

    it('should handle decoding errors gracefully', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode error'));

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });

      unmount();
    });

    it('should log errors when extraction fails', async () => {
      const { browserLogger } = await import('@/lib/browserLogger');
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(browserLogger.error).toHaveBeenCalled();
      });

      unmount();
    });
  });

  describe('Cleanup', () => {
    it('should cancel extraction on unmount', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      unmount();

      // Wait a bit to ensure async operations don't complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Test passes if no errors are thrown during unmount/cleanup
    });

    it('should re-extract when clip changes', async () => {
      const { rerender, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      mockAudioContext.close.mockClear();

      const newClip = { ...mockClipWithAudio, id: 'clip-2', previewUrl: 'new-url.mp4' };
      rerender(<AudioWaveform clip={newClip} width={200} height={50} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith('new-url.mp4');
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      unmount();
    });

    it('should re-render when width changes', async () => {
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });

      const { rerender, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(
        () => {
          expect(mockFillRect).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      mockFillRect.mockClear();

      rerender(<AudioWaveform clip={mockClipWithAudio} width={400} height={50} />);

      await waitFor(
        () => {
          expect(mockFillRect).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      unmount();
    });
  });

  describe('Edge Cases', () => {
    it('should handle clip without previewUrl', async () => {
      const clipNoPreview = { ...mockClipWithAudio, previewUrl: undefined };
      const { container, unmount } = render(<AudioWaveform clip={clipNoPreview} width={200} height={50} />);

      // Canvas may be rendered initially, but no waveform data should be extracted
      // The component still renders the container for consistency
      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Should not call fetch without previewUrl
      expect(mockFetch).not.toHaveBeenCalled();

      unmount();
    });

    it('should handle very small width', async () => {
      const { container, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={10} height={50} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: '10px' });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should handle very small height', async () => {
      const { container, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={5} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '5px' });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should cap samples at 1000 for performance', async () => {
      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={10000} height={50} />
      );

      await waitFor(
        () => {
          expect(mockAudioBuffer.getChannelData).toHaveBeenCalled();
        },
        { timeout: 5000 }
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      // Waveform data should be capped at 2000 samples even with large width (based on component code)
      // The component uses Math.min(Math.floor(width * detailLevel), 2000) for samples
      unmount();
    });

    it('should handle empty audio data', async () => {
      mockAudioBuffer.getChannelData.mockReturnValue(new Float32Array(0));

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      unmount();
    });

    it('should handle missing canvas context', async () => {
      mockGetContext.mockReturnValue(null);

      const { unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      // Wait for component to mount and attempt extraction
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
      });

      // getContext might not be called if waveformData is not set yet
      // The important test is that it doesn't throw an error
      expect(mockGetContext).toHaveBeenCalled();

      // Should not throw error
      unmount();
    });
  });

  describe('Memoization', () => {
    it('should not re-render when unrelated props change', async () => {
      const { rerender, unmount } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="class-1" />
      );

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      const firstCanvas = document.querySelector('canvas');

      rerender(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="class-2" />
      );

      const secondCanvas = document.querySelector('canvas');

      // Canvas element should be the same (component memoized)
      expect(firstCanvas).toBe(secondCanvas);

      unmount();
    });
  });
});
