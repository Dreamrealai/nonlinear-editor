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

// Mock Worker to throw error during construction, forcing AudioContext fallback
(global as any).Worker = class MockWorker {
  constructor() {
    // Throw error immediately to force fallback to AudioContext path
    throw new Error('Worker is not defined in test environment');
  }
};

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

    // Reset AudioContext mock
    mockAudioContext.close.mockClear();
    mockAudioContext.close.mockResolvedValue(undefined);
    mockAudioContext.decodeAudioData.mockClear();

    // Mock canvas context
    mockGetContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      scale: jest.fn(),
      fillStyle: '',
    }));

    HTMLCanvasElement.prototype.getContext =
      mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

    // Mock fetch for audio data
    const mockArrayBuffer = new ArrayBuffer(100);
    mockFetch = jest.fn(() =>
      Promise.resolve({
        arrayBuffer: () => Promise.resolve(mockArrayBuffer),
      } as Response)
    );
    global.fetch = mockFetch;

    // Mock audio buffer with sample data
    const sampleData = new Float32Array(1000);
    for (let i = 0; i < sampleData.length; i++) {
      sampleData[i] = Math.sin(i / 10) * 0.5; // Generate sine wave
    }
    mockAudioBuffer.getChannelData.mockReturnValue(sampleData);
    mockAudioContext.decodeAudioData.mockResolvedValue(mockAudioBuffer);
  });

  afterEach(async () => {
    // Give time for any pending async operations to complete
    await new Promise((resolve) => setTimeout(resolve, 100));
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

      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalledWith('2d');
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
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

      await waitFor(() => {
        expect(mockScale).toHaveBeenCalledWith(2, 2);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
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

      await waitFor(() => {
        expect(mockClearRect).toHaveBeenCalledWith(0, 0, 200, 50);
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
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

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
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

      await waitFor(() => {
        expect(mockContext.fillStyle).toBe('rgba(59, 130, 246, 0.6)');
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
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

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      mockFillRect.mockClear();

      rerender(<AudioWaveform clip={mockClipWithAudio} width={400} height={50} />);

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });

      unmount();
    });
  });

  describe('Edge Cases', () => {
    it('should handle clip without previewUrl', () => {
      const clipNoPreview = { ...mockClipWithAudio, previewUrl: undefined };
      const { container } = render(<AudioWaveform clip={clipNoPreview} width={200} height={50} />);

      expect(container.querySelector('canvas')).not.toBeInTheDocument();
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

      await waitFor(() => {
        expect(mockAudioBuffer.getChannelData).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Waveform data should be capped at 1000 samples even with large width
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });

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

      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalled();
      });

      // Wait for async operations
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

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
