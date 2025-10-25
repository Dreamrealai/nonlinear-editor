import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PreviewPlayer } from '@/components/PreviewPlayer';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, Timeline } from '@/types/timeline';

// Mock the editor store
jest.mock('@/state/useEditorStore');

// Mock the video hooks
jest.mock(
  '@/lib/hooks/useVideoManager',
  (): Record<string, unknown> => ({
    useVideoManager: (): Record<string, unknown> => ({
      videoMapRef: { current: new Map() },
      ensureClipElement: jest.fn(),
      cleanupVideo: jest.fn(),
    }),
  })
);

jest.mock(
  '@/lib/hooks/useVideoPlayback',
  (): Record<string, unknown> => ({
    useVideoPlayback: (): void => {
      const [isPlaying, setIsPlaying] = require('react').useState(false);
      return {
        isPlaying,
        stopPlayback: jest.fn(),
        togglePlayPause: () => setIsPlaying((prev: boolean) => !prev),
        syncClipsAtTime: jest.fn(),
      };
    },
  })
);

// Mock child components with named exports
jest.mock('@/components/TextOverlayRenderer', () => {
  return {
    TextOverlayRenderer: function MockTextOverlayRenderer() {
      return <div data-testid="text-overlay-renderer">Text Overlays</div>;
    },
  };
});

jest.mock('@/components/TextOverlayEditor', () => {
  return {
    TextOverlayEditor: function MockTextOverlayEditor() {
      return <div data-testid="text-overlay-editor">Text Overlay Editor</div>;
    },
  };
});

jest.mock('@/components/preview/PlaybackControls', () => {
  const React = require('react');
  const { formatTimecode } = require('@/lib/utils/videoUtils');

  return {
    PlaybackControls: function MockPlaybackControls({
      isPlaying,
      hasClips,
      currentTime,
      totalDuration,
      isFullscreen,
      onPlayPause,
      onSeek,
      onToggleFullscreen,
    }: {
      isPlaying: boolean;
      hasClips: boolean;
      currentTime: number;
      totalDuration: number;
      isFullscreen: boolean;
      onPlayPause: () => void;
      onSeek: (time: number) => void;
      onToggleFullscreen: () => void;
    }) {
      const [controlsHidden, setControlsHidden] = React.useState(false);
      const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

      return (
        <div data-testid="playback-controls">
          {!controlsHidden ? (
            <>
              <button
                title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                disabled={!hasClips}
                onClick={onPlayPause}
              >
                {isPlaying ? 'Pause' : 'Play'}
              </button>
              <div
                className="bg-white/30"
                onClick={() => onSeek && onSeek(currentTime)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSeek && onSeek(currentTime);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="bg-white transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div>
                {formatTimecode(currentTime)} / {formatTimecode(totalDuration)}
              </div>
              <button
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                onClick={onToggleFullscreen}
              >
                Fullscreen
              </button>
              <button title="Hide controls" onClick={() => setControlsHidden(true)}>
                Hide
              </button>
            </>
          ) : (
            <button title="Show controls" onClick={() => setControlsHidden(false)}>
              Show
            </button>
          )}
        </div>
      );
    },
  };
});

const originalRequestAnimationFrame = globalThis.requestAnimationFrame;
const originalCancelAnimationFrame = globalThis.cancelAnimationFrame;
const originalPerformance = globalThis.performance;

const mockClip: Clip = {
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
};

const mockTimeline: Timeline = {
  id: 'timeline-1',
  clips: [mockClip],
  textOverlays: [],
};

describe('PreviewPlayer', () => {
  const mockSetCurrentTime = jest.fn();
  const mockAddTextOverlay = jest.fn();
  const mockAddTransitionToSelectedClips = jest.fn();
  let performanceNowSpy: jest.SpyInstance<number, []>;

  // Mock HTMLVideoElement methods
  beforeAll((): void => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
    HTMLMediaElement.prototype.load = jest.fn();
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      get: () => 4, // HAVE_ENOUGH_DATA
    });

    if (!globalThis.performance) {
      (globalThis as unknown as { performance: Performance }).performance = {
        now: () => Date.now(),
        mark: () => undefined,
        measure: () => undefined,
        clearMarks: () => undefined,
        clearMeasures: () => undefined,
        getEntries: () => [],
        getEntriesByType: () => [],
        getEntriesByName: () => [],
        timeOrigin: Date.now(),
        toJSON: (): Record<string, unknown> => ({}),
      } as unknown as Performance;
    }
  });

  beforeEach((): void => {
    jest.clearAllMocks();
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 0,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    // Mock requestAnimationFrame and performance timing
    const performanceMock = {
      now: jest.fn(() => 0),
      mark: jest.fn(),
      measure: jest.fn(),
      clearMarks: jest.fn(),
      clearMeasures: jest.fn(),
      getEntries: jest.fn(() => []),
      getEntriesByType: jest.fn(() => []),
      getEntriesByName: jest.fn(() => []),
      timeOrigin: 0,
      toJSON: jest.fn(() => ({})),
    } as unknown as Performance;

    globalThis.performance = performanceMock;
    (global as unknown as { performance: Performance }).performance = performanceMock;
    (window as unknown as { performance: Performance }).performance = performanceMock;
    performanceNowSpy = jest.spyOn(performanceMock, 'now');

    let rafId = 0;
    const rafCallbacks = new Map<number, FrameRequestCallback>();
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      rafId += 1;
      rafCallbacks.set(rafId, cb);
      return rafId;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = ((id: number) => {
      rafCallbacks.delete(id);
    }) as typeof globalThis.cancelAnimationFrame;
  });

  afterEach((): void => {
    performanceNowSpy?.mockRestore();
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
      (global as unknown as { performance?: Performance }).performance = originalPerformance;
      (window as unknown as { performance?: Performance }).performance = originalPerformance;
    } else {
      delete (global as unknown as { performance?: Performance }).performance;
      delete (window as unknown as { performance?: Performance }).performance;
      delete (globalThis as unknown as { performance?: Performance }).performance;
    }
  });

  afterAll((): void => {
    globalThis.requestAnimationFrame = originalRequestAnimationFrame;
    globalThis.cancelAnimationFrame = originalCancelAnimationFrame;
    if (originalPerformance) {
      globalThis.performance = originalPerformance;
    }
  });

  it('should render the player', () => {
    render(<PreviewPlayer />);

    // Should render play button when not playing
    expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
  });

  it('should not render when timeline is null', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: null,
        currentTime: 0,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    const { container } = render(<PreviewPlayer />);
    expect(container.firstChild).toBeNull();
  });

  it('should display current time and total duration', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 5.5,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    render(<PreviewPlayer />);

    // Should show timecode (MM:SS:FF format)
    expect(screen.getByText(/00:05:15/)).toBeInTheDocument(); // 5.5 seconds
  });

  it('should toggle play/pause when clicking play button', async () => {
    render(<PreviewPlayer />);

    const playButton = screen.getByTitle('Play (Space)');
    fireEvent.click(playButton);

    // After clicking, button title should change to "Pause (Space)"
    await waitFor(() => {
      expect(screen.getByTitle('Pause (Space)')).toBeInTheDocument();
    });
  });

  it('should show pause button when playing', async () => {
    render(<PreviewPlayer />);

    const playButton = screen.getByTitle('Play (Space)');
    fireEvent.click(playButton);

    // Should now show pause button
    await waitFor(() => {
      expect(screen.getByTitle('Pause (Space)')).toBeInTheDocument();
    });
  });

  it('should display progress bar', () => {
    const { container } = render(<PreviewPlayer />);

    // Find progress bar
    const progressBar = container.querySelector('.bg-white.transition-all');
    expect(progressBar).toBeInTheDocument();
  });

  it('should calculate progress correctly', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 5, // 50% of 10 seconds
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    const { container } = render(<PreviewPlayer />);

    const progressBar = container.querySelector('.bg-white.transition-all') as HTMLElement;
    expect(progressBar).toHaveStyle({ width: '50%' });
  });

  it('should render text overlay editor when present and not playing', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: {
          ...mockTimeline,
          textOverlays: [
            {
              id: 'text-1',
              text: 'Hello World',
              timelinePosition: 0,
              duration: 5,
              x: 50,
              y: 50,
            },
          ],
        },
        currentTime: 0,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    render(<PreviewPlayer />);

    // Should render editor when not playing
    expect(screen.getByTestId('text-overlay-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('text-overlay-renderer')).not.toBeInTheDocument();
  });

  it('should show playback controls', () => {
    render(<PreviewPlayer />);

    expect(screen.getByTestId('playback-controls')).toBeInTheDocument();
  });

  it('should show fullscreen button', () => {
    render(<PreviewPlayer />);

    expect(screen.getByTitle('Enter fullscreen')).toBeInTheDocument();
  });

  it('should toggle fullscreen on button click', async () => {
    const mockRequestFullscreen = jest.fn(() => Promise.resolve());
    const mockExitFullscreen = jest.fn(() => Promise.resolve());

    HTMLElement.prototype.requestFullscreen = mockRequestFullscreen;
    document.exitFullscreen = mockExitFullscreen;

    render(<PreviewPlayer />);

    const fullscreenButton = screen.getByTitle('Enter fullscreen');
    fireEvent.click(fullscreenButton);

    await waitFor(() => {
      expect(mockRequestFullscreen).toHaveBeenCalled();
    });
  });

  it('should show centered play button overlay when not playing', () => {
    render(<PreviewPlayer />);

    // Large centered play button
    const playButtons = screen.getAllByTitle('Play (Space)');
    expect(playButtons.length).toBeGreaterThan(0);
  });

  it('should hide controls when hide button is clicked', async () => {
    const { container } = render(<PreviewPlayer />);

    const hideButton = screen.getByTitle('Hide controls');
    fireEvent.click(hideButton);

    // Controls should be hidden
    await waitFor(() => {
      expect(screen.queryByTitle('Hide controls')).not.toBeInTheDocument();
    });
  });

  it('should show controls button when controls are hidden', async () => {
    render(<PreviewPlayer />);

    const hideButton = screen.getByTitle('Hide controls');
    fireEvent.click(hideButton);

    await waitFor(() => {
      expect(screen.getByTitle('Show controls')).toBeInTheDocument();
    });
  });

  it('should handle keyboard spacebar to toggle play/pause', async () => {
    render(<PreviewPlayer />);

    fireEvent.keyDown(window, { code: 'Space', target: document.body });

    await waitFor(() => {
      expect(screen.getByTitle('Pause (Space)')).toBeInTheDocument();
    });
  });

  it('should disable play button when no clips', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: { ...mockTimeline, clips: [] },
        currentTime: 0,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    render(<PreviewPlayer />);

    const playButton = screen.getByTitle('Play (Space)').closest('button');
    expect(playButton).toBeDisabled();
  });

  it('should show timecode in MM:SS:FF format', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 125.5, // 2:05.5
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    render(<PreviewPlayer />);

    // 125.5 seconds = 02:05:15 (2 minutes, 5 seconds, 15 frames)
    expect(screen.getByText(/02:05:15/)).toBeInTheDocument();
  });

  it('should handle clips with transitions', () => {
    const clipWithTransition: Clip = {
      ...mockClip,
      transitionToNext: {
        type: 'crossfade',
        duration: 0.5,
      },
    };

    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: {
          ...mockTimeline,
          clips: [clipWithTransition],
        },
        currentTime: 0,
        setCurrentTime: mockSetCurrentTime,
        addTextOverlay: mockAddTextOverlay,
        addTransitionToSelectedClips: mockAddTransitionToSelectedClips,
        selectedClipIds: new Set<string>(),
      };
      return selector(state);
    });

    render(<PreviewPlayer />);

    // Should render without errors
    expect(screen.getByTitle('Play (Space)')).toBeInTheDocument();
  });
});
