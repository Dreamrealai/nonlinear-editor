import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PreviewPlayer from '@/components/PreviewPlayer';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, Timeline } from '@/types/timeline';

// Mock the editor store
jest.mock('@/state/useEditorStore');

// Mock child components
jest.mock('@/components/TextOverlayRenderer', () => {
  return function MockTextOverlayRenderer() {
    return <div data-testid="text-overlay-renderer">Text Overlays</div>;
  };
});

jest.mock('@/components/VideoPlayerHoverMenu', () => {
  return function MockVideoPlayerHoverMenu() {
    return <div data-testid="hover-menu">Hover Menu</div>;
  };
});

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

  // Mock HTMLVideoElement methods
  beforeAll(() => {
    HTMLMediaElement.prototype.play = jest.fn(() => Promise.resolve());
    HTMLMediaElement.prototype.pause = jest.fn();
    HTMLMediaElement.prototype.load = jest.fn();
    Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
      get: () => 4, // HAVE_ENOUGH_DATA
    });
  });

  beforeEach(() => {
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

    // Mock requestAnimationFrame
    global.requestAnimationFrame = jest.fn((cb) => {
      cb(0);
      return 0;
    });
    global.cancelAnimationFrame = jest.fn();
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

    // After clicking, button text should change to Pause
    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });
  });

  it('should show pause button when playing', () => {
    render(<PreviewPlayer />);

    const playButton = screen.getByTitle('Play (Space)');
    fireEvent.click(playButton);

    // Should now show pause button
    waitFor(() => {
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

  it('should render text overlays when present', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: {
          ...mockTimeline,
          textOverlays: [{
            id: 'text-1',
            text: 'Hello World',
            timelinePosition: 0,
            duration: 5,
            x: 50,
            y: 50,
          }],
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

    expect(screen.getByTestId('text-overlay-renderer')).toBeInTheDocument();
  });

  it('should show hover menu when not playing', () => {
    render(<PreviewPlayer />);

    expect(screen.getByTestId('hover-menu')).toBeInTheDocument();
  });

  it('should hide hover menu when playing', async () => {
    render(<PreviewPlayer />);

    const playButton = screen.getByTitle('Play (Space)');
    fireEvent.click(playButton);

    await waitFor(() => {
      expect(screen.queryByTestId('hover-menu')).not.toBeInTheDocument();
    });
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

  it('should hide controls when hide button is clicked', () => {
    const { container } = render(<PreviewPlayer />);

    const hideButton = screen.getByTitle('Hide controls');
    fireEvent.click(hideButton);

    // Controls should be hidden
    waitFor(() => {
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

    const spaceEvent = new KeyboardEvent('keydown', {
      code: 'Space',
      bubbles: true,
    });

    Object.defineProperty(spaceEvent, 'target', {
      value: document.body,
      writable: false,
    });

    window.dispatchEvent(spaceEvent);

    await waitFor(() => {
      expect(screen.getByText('Pause')).toBeInTheDocument();
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
