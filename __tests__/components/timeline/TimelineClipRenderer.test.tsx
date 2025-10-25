/**
 * TimelineClipRenderer Component Tests
 *
 * Comprehensive test suite covering:
 * - Clip rendering (video, audio, image, text)
 * - Selection states
 * - User interactions (click, hover, context menu)
 * - Trim handles
 * - Lock/unlock functionality
 * - Group visualization
 * - Error states
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimelineClipRenderer } from '@/components/timeline/TimelineClipRenderer';
import type { Clip } from '@/types/timeline';
import { useEditorStore } from '@/state/useEditorStore';

// Mock dependencies
jest.mock('@/state/useEditorStore');
jest.mock('@/components/AudioWaveform', () => ({
  AudioWaveform: ({ clip }: { clip: Clip }) => (
    <div data-testid="audio-waveform">{clip.id}</div>
  ),
}));
jest.mock('@/lib/signedUrlCache', () => ({
  signedUrlCache: {
    get: jest.fn().mockResolvedValue('https://example.com/signed-url'),
  },
}));
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock clip data
const createMockClip = (overrides?: Partial<Clip>): Clip => ({
  id: 'clip-1',
  assetId: 'asset-1',
  start: 0,
  end: 10,
  timelinePosition: 5,
  trackIndex: 0,
  sourceDuration: 10,
  type: 'video',
  hasAudio: false,
  thumbnailUrl: 'https://example.com/thumbnail.jpg',
  locked: false,
  ...overrides,
});

describe('TimelineClipRenderer', () => {
  const mockHandlers = {
    onMouseDown: jest.fn(),
    onClick: jest.fn(),
    onContextMenu: jest.fn(),
    onTrimHandleMouseDown: jest.fn(),
    onRemove: jest.fn(),
  };

  const mockEditorStore = {
    toggleClipLock: jest.fn(),
    timeline: {
      id: 'timeline-1',
      groups: [],
      duration: 100,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector(mockEditorStore)
    );
  });

  describe('Rendering', () => {
    it('should render video clip at correct position', () => {
      const clip = createMockClip({ type: 'video', timelinePosition: 10 });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toBeInTheDocument();
      expect(clipElement).toHaveStyle({ left: '100px' }); // 10 * 10 zoom
    });

    it('should render audio clip with waveform', async () => {
      const clip = createMockClip({ type: 'audio', hasAudio: true });
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      await waitFor(() => {
        expect(screen.getByTestId('audio-waveform')).toBeInTheDocument();
      });
    });

    it('should render clip with thumbnail image', () => {
      const clip = createMockClip({ thumbnailUrl: 'https://example.com/thumb.jpg' });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const image = container.querySelector('img');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', expect.stringContaining('thumb.jpg'));
    });

    it('should render clip without thumbnail with gradient background', () => {
      const clip = createMockClip({ thumbnailUrl: undefined });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const gradient = container.querySelector('.bg-gradient-to-br');
      expect(gradient).toBeInTheDocument();
    });

    it('should render clip with correct width based on duration', () => {
      const clip = createMockClip({ start: 0, end: 20 }); // 20 second duration
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveStyle({ width: '200px' }); // 20 * 10 zoom
    });

    it('should render clip on correct track', () => {
      const clip = createMockClip({ trackIndex: 2 });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      // Track 2 should have a top position (trackIndex * TRACK_HEIGHT + 8)
      expect(clipElement).toHaveAttribute('style');
      expect(clipElement?.getAttribute('style')).toContain('top:');
    });
  });

  describe('Selection States', () => {
    it('should highlight selected clip with yellow border', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={true} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveClass('border-yellow-400');
      expect(clipElement).toHaveClass('ring-2');
    });

    it('should show default border for unselected clip', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveClass('border-blue-500');
    });

    it('should show group color for grouped clips', () => {
      const clip = createMockClip({ groupId: 'group-1' });
      mockEditorStore.timeline.groups = [
        { id: 'group-1', name: 'Group 1', color: '#ff0000', clipIds: ['clip-1'] },
      ];

      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveStyle({ borderColor: '#ff0000' });
    });
  });

  describe('User Interactions', () => {
    it('should handle click to select clip', async () => {
      const clip = createMockClip();
      const user = userEvent.setup();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      await user.click(clipElement);

      expect(mockHandlers.onClick).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ id: 'clip-1' })
      );
    });

    it('should handle mouse down for drag operations', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      fireEvent.mouseDown(clipElement);

      expect(mockHandlers.onMouseDown).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ id: 'clip-1' })
      );
    });

    it('should handle right-click for context menu', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      fireEvent.contextMenu(clipElement);

      expect(mockHandlers.onContextMenu).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ id: 'clip-1' })
      );
    });

    it('should handle keyboard Enter key to select', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      fireEvent.keyDown(clipElement, { key: 'Enter' });

      expect(mockHandlers.onClick).toHaveBeenCalled();
    });

    it('should handle keyboard Space key to select', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      fireEvent.keyDown(clipElement, { key: ' ' });

      expect(mockHandlers.onClick).toHaveBeenCalled();
    });
  });

  describe('Trim Handles', () => {
    it('should show left trim handle', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const leftHandle = container.querySelector('[aria-label*="Trim clip start"]');
      expect(leftHandle).toBeInTheDocument();
    });

    it('should show right trim handle', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const rightHandle = container.querySelector('[aria-label*="Trim clip end"]');
      expect(rightHandle).toBeInTheDocument();
    });

    it('should handle left trim handle mouse down', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const leftHandle = container.querySelector('[aria-label*="Trim clip start"]')!;
      fireEvent.mouseDown(leftHandle);

      expect(mockHandlers.onTrimHandleMouseDown).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ id: 'clip-1' }),
        'left'
      );
    });

    it('should handle right trim handle mouse down', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const rightHandle = container.querySelector('[aria-label*="Trim clip end"]')!;
      fireEvent.mouseDown(rightHandle);

      expect(mockHandlers.onTrimHandleMouseDown).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ id: 'clip-1' }),
        'right'
      );
    });

    it('should show trim preview overlay for left handle', () => {
      const clip = createMockClip({ start: 0, end: 10 });
      const trimPreview = { handle: 'left' as const, newStart: 2, newEnd: 10 };
      const { container } = render(
        <TimelineClipRenderer
          clip={clip}
          zoom={10}
          isSelected={false}
          trimPreviewInfo={trimPreview}
          {...mockHandlers}
        />
      );

      const overlay = container.querySelector('.bg-red-500\\/40');
      expect(overlay).toBeInTheDocument();
    });

    it('should show trim preview overlay for right handle', () => {
      const clip = createMockClip({ start: 0, end: 10 });
      const trimPreview = { handle: 'right' as const, newStart: 0, newEnd: 8 };
      const { container } = render(
        <TimelineClipRenderer
          clip={clip}
          zoom={10}
          isSelected={false}
          trimPreviewInfo={trimPreview}
          {...mockHandlers}
        />
      );

      const overlay = container.querySelector('.bg-red-500\\/40');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Lock/Unlock Functionality', () => {
    it('should show locked state with lock icon', () => {
      const clip = createMockClip({ locked: true });
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      const lockButton = screen.getByRole('button', { name: /unlock clip/i });
      expect(lockButton).toBeInTheDocument();
      expect(lockButton).toHaveClass('bg-yellow-500/80');
    });

    it('should show unlocked state with unlock icon', () => {
      const clip = createMockClip({ locked: false });
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      const lockButton = screen.getByRole('button', { name: /lock clip/i });
      expect(lockButton).toBeInTheDocument();
    });

    it('should toggle lock state when lock button clicked', async () => {
      const clip = createMockClip({ locked: false });
      const user = userEvent.setup();
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      const lockButton = screen.getByRole('button', { name: /lock clip/i });
      await user.click(lockButton);

      expect(mockEditorStore.toggleClipLock).toHaveBeenCalledWith('clip-1');
    });

    it('should show locked cursor and border for locked clips', () => {
      const clip = createMockClip({ locked: true });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveClass('cursor-not-allowed');
      expect(clipElement).toHaveClass('border-gray-400');
    });
  });

  describe('Remove Functionality', () => {
    it('should show remove button', () => {
      const clip = createMockClip();
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      const removeButton = screen.getByRole('button', { name: /remove clip/i });
      expect(removeButton).toBeInTheDocument();
    });

    it('should call onRemove when remove button clicked', async () => {
      const clip = createMockClip();
      const user = userEvent.setup();
      render(<TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />);

      const removeButton = screen.getByRole('button', { name: /remove clip/i });
      await user.click(removeButton);

      expect(mockHandlers.onRemove).toHaveBeenCalledWith('clip-1');
    });
  });

  describe('Visual States', () => {
    it('should show color label indicator when clip has color', () => {
      const clip = createMockClip({ color: '#00ff00' });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const colorLabel = container.querySelector('[title="Color: #00ff00"]');
      expect(colorLabel).toBeInTheDocument();
      expect(colorLabel).toHaveStyle({ backgroundColor: '#00ff00' });
    });

    it('should show transition indicator when clip has transition', () => {
      const clip = createMockClip({
        transitionToNext: { type: 'fade', duration: 1 },
      });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      expect(container.textContent).toContain('fade');
      expect(container.textContent).toContain('1.0s');
    });

    it('should show group badge for grouped clips', () => {
      const clip = createMockClip({ groupId: 'group-1' });
      mockEditorStore.timeline.groups = [
        { id: 'group-1', name: 'My Group', color: '#ff0000', clipIds: ['clip-1'] },
      ];

      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const groupBadge = container.querySelector('[title="My Group"]');
      expect(groupBadge).toBeInTheDocument();
    });
  });

  describe('Timecode Display', () => {
    it('should show duration by default', () => {
      const clip = createMockClip({ start: 0, end: 10 });
      const { container } = render(
        <TimelineClipRenderer
          clip={clip}
          zoom={10}
          isSelected={false}
          timecodeDisplayMode="duration"
          {...mockHandlers}
        />
      );

      expect(container.textContent).toContain('10.0s');
    });

    it('should show timecode when display mode is timecode', () => {
      const clip = createMockClip({ start: 0, end: 10 });
      const { container } = render(
        <TimelineClipRenderer
          clip={clip}
          zoom={10}
          isSelected={false}
          timecodeDisplayMode="timecode"
          {...mockHandlers}
        />
      );

      expect(container.textContent).toContain('In:');
      expect(container.textContent).toContain('Out:');
    });

    it('should show detailed timecode on hover', async () => {
      const clip = createMockClip({ start: 0, end: 10, timelinePosition: 5 });
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]')!;
      fireEvent.mouseEnter(clipElement);

      await waitFor(() => {
        expect(container.textContent).toContain('Start:');
        expect(container.textContent).toContain('End:');
        expect(container.textContent).toContain('Duration:');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA label', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveAttribute('aria-label', expect.stringContaining('Timeline clip'));
    });

    it('should be keyboard accessible with tabindex', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const clipElement = container.querySelector('[role="button"]');
      expect(clipElement).toHaveAttribute('tabIndex', '0');
    });

    it('should have accessible trim handles with ARIA labels', () => {
      const clip = createMockClip();
      const { container } = render(
        <TimelineClipRenderer clip={clip} zoom={10} isSelected={false} {...mockHandlers} />
      );

      const leftHandle = container.querySelector('[aria-label*="Trim clip start"]');
      const rightHandle = container.querySelector('[aria-label*="Trim clip end"]');

      expect(leftHandle).toHaveAttribute('role', 'slider');
      expect(rightHandle).toHaveAttribute('role', 'slider');
    });
  });
});
