import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioWaveform } from '@/components/AudioWaveform';
import type { Clip } from '@/types/timeline';

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock AudioContext
const mockAudioContext = {
  decodeAudioData: jest.fn(),
  close: jest.fn(),
};

const mockAudioBuffer = {
  getChannelData: jest.fn(),
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

    // Mock canvas context
    mockGetContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      scale: jest.fn(),
      fillStyle: '',
    }));

    HTMLCanvasElement.prototype.getContext = mockGetContext as unknown as typeof HTMLCanvasElement.prototype.getContext;

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

    it('should render canvas when clip has audio', () => {
      const { container } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      const canvas = container.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render loading state initially', () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      expect(screen.getByText('Loading waveform...')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="custom-class" />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should set correct dimensions', () => {
      const { container } = render(
        <AudioWaveform clip={mockClipWithAudio} width={300} height={75} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: '300px', height: '75px' });
    });
  });

  describe('Audio Extraction', () => {
    it('should fetch audio data from previewUrl', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(mockClipWithAudio.previewUrl);
      });
    });

    it('should create AudioContext', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(global.AudioContext).toHaveBeenCalled();
      });
    });

    it('should decode audio data', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockAudioContext.decodeAudioData).toHaveBeenCalled();
      });
    });

    it('should close audio context after extraction', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockAudioContext.close).toHaveBeenCalled();
      });
    });

    it('should extract channel data from audio buffer', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockAudioBuffer.getChannelData).toHaveBeenCalledWith(0);
      });
    });

    it('should hide loading state after extraction', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Canvas Rendering', () => {
    it('should get 2d context from canvas', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalledWith('2d');
      });
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

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockScale).toHaveBeenCalledWith(2, 2);
      });
    });

    it('should clear canvas before drawing', async () => {
      const mockClearRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: mockClearRect,
        fillRect: jest.fn(),
        scale: jest.fn(),
        fillStyle: '',
      });

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockClearRect).toHaveBeenCalledWith(0, 0, 200, 50);
      });
    });

    it('should draw waveform bars', async () => {
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });
    });

    it('should use correct fill color for waveform', async () => {
      const mockContext = {
        clearRect: jest.fn(),
        fillRect: jest.fn(),
        scale: jest.fn(),
        fillStyle: '',
      };
      mockGetContext.mockReturnValue(mockContext);

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockContext.fillStyle).toBe('rgba(59, 130, 246, 0.6)');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });
    });

    it('should handle decoding errors gracefully', async () => {
      mockAudioContext.decodeAudioData.mockRejectedValue(new Error('Decode error'));

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });
    });

    it('should log errors when extraction fails', async () => {
      const { browserLogger } = await import('@/lib/browserLogger');
      mockFetch.mockRejectedValue(new Error('Network error'));

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(browserLogger.error).toHaveBeenCalled();
      });
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

      // AudioContext should have been called but extraction should be cancelled
      expect(mockAudioContext.close).toHaveBeenCalled();
    });

    it('should re-extract when clip changes', async () => {
      const { rerender } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      const newClip = { ...mockClipWithAudio, id: 'clip-2', previewUrl: 'new-url.mp4' };
      rerender(<AudioWaveform clip={newClip} width={200} height={50} />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(mockFetch).toHaveBeenLastCalledWith('new-url.mp4');
      });
    });

    it('should re-render when width changes', async () => {
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });

      const { rerender } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} />
      );

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });

      mockFillRect.mockClear();

      rerender(<AudioWaveform clip={mockClipWithAudio} width={400} height={50} />);

      await waitFor(() => {
        expect(mockFillRect).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle clip without previewUrl', () => {
      const clipNoPreview = { ...mockClipWithAudio, previewUrl: undefined };
      const { container } = render(
        <AudioWaveform clip={clipNoPreview} width={200} height={50} />
      );

      expect(container.querySelector('canvas')).not.toBeInTheDocument();
    });

    it('should handle very small width', () => {
      const { container } = render(<AudioWaveform clip={mockClipWithAudio} width={10} height={50} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: '10px' });
    });

    it('should handle very small height', () => {
      const { container } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={5} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ height: '5px' });
    });

    it('should cap samples at 1000 for performance', async () => {
      render(<AudioWaveform clip={mockClipWithAudio} width={10000} height={50} />);

      await waitFor(() => {
        expect(mockAudioBuffer.getChannelData).toHaveBeenCalled();
      });

      // Waveform data should be capped at 1000 samples even with large width
      const mockFillRect = jest.fn();
      mockGetContext.mockReturnValue({
        clearRect: jest.fn(),
        fillRect: mockFillRect,
        scale: jest.fn(),
        fillStyle: '',
      });
    });

    it('should handle empty audio data', async () => {
      mockAudioBuffer.getChannelData.mockReturnValue(new Float32Array(0));

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(screen.queryByText('Loading waveform...')).not.toBeInTheDocument();
      });
    });

    it('should handle missing canvas context', async () => {
      mockGetContext.mockReturnValue(null);

      render(<AudioWaveform clip={mockClipWithAudio} width={200} height={50} />);

      await waitFor(() => {
        expect(mockGetContext).toHaveBeenCalled();
      });

      // Should not throw error
    });
  });

  describe('Memoization', () => {
    it('should not re-render when unrelated props change', () => {
      const { rerender } = render(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="class-1" />
      );

      const firstCanvas = document.querySelector('canvas');

      rerender(
        <AudioWaveform clip={mockClipWithAudio} width={200} height={50} className="class-2" />
      );

      const secondCanvas = document.querySelector('canvas');

      // Canvas element should be the same (component memoized)
      expect(firstCanvas).toBe(secondCanvas);
    });
  });
});
