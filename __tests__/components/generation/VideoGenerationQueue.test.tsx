import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { VideoGenerationQueue } from '@/components/generation/VideoGenerationQueue';
import type { VideoQueueItemData } from '@/lib/utils/videoGenerationUtils';

// Mock VideoQueueItem component
jest.mock('@/components/generation/VideoQueueItem', () => {
  return function MockVideoQueueItem({ id, prompt, onRemove }: any) {
    return (
      <div data-testid={`queue-item-${id}`}>
        <p>{prompt}</p>
        <button onClick={() => onRemove(id)}>Remove</button>
      </div>
    );
  };
});

describe('VideoGenerationQueue', () => {
  const mockOnRemove = jest.fn();
  const mockOnClearCompleted = jest.fn();

  const createMockVideo = (overrides: Partial<VideoQueueItemData> = {}): VideoQueueItemData => ({
    id: 'video-1',
    prompt: 'Test video prompt',
    status: 'queued',
    progress: 0,
    ...overrides,
  });

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    // Wait for any pending async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Rendering', () => {
    it('should render queue header', () => {
      render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText(/Video Queue/)).toBeInTheDocument();
    });

    it('should display queue count', () => {
      const videos = [createMockVideo({ id: 'video-1' }), createMockVideo({ id: 'video-2' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText(/Video Queue \(2\/10\)/)).toBeInTheDocument();
    });

    it('should display max queue limit', () => {
      render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText(/Video Queue \(0\/10\)/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when queue is empty', () => {
      render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('No videos in queue')).toBeInTheDocument();
      expect(screen.getByText('Generate videos to see them appear here')).toBeInTheDocument();
    });

    it('should show empty state icon', () => {
      const { container } = render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    it('should not show clear button when queue is empty', () => {
      render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
    });
  });

  describe('Queue Items', () => {
    it('should render video queue items', () => {
      const videos = [
        createMockVideo({ id: 'video-1', prompt: 'Video 1' }),
        createMockVideo({ id: 'video-2', prompt: 'Video 2' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
      expect(screen.getByTestId('queue-item-video-2')).toBeInTheDocument();
    });

    it('should render all video prompts', () => {
      const videos = [
        createMockVideo({ id: 'video-1', prompt: 'A sunset over the ocean' }),
        createMockVideo({ id: 'video-2', prompt: 'A cat playing piano' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('A sunset over the ocean')).toBeInTheDocument();
      expect(screen.getByText('A cat playing piano')).toBeInTheDocument();
    });

    it('should display videos in 2-column grid', () => {
      const videos = [createMockVideo({ id: 'video-1' }), createMockVideo({ id: 'video-2' })];

      const { container } = render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const grid = container.querySelector('.grid-cols-2');
      expect(grid).toBeInTheDocument();
    });

    it('should render single video', () => {
      const videos = [createMockVideo({ id: 'video-1', prompt: 'Single video' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('Single video')).toBeInTheDocument();
    });

    it('should render many videos', () => {
      const videos = Array.from({ length: 10 }, (_, i) =>
        createMockVideo({ id: `video-${i}`, prompt: `Video ${i}` })
      );

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText(/Video Queue \(10\/10\)/)).toBeInTheDocument();
    });
  });

  describe('Clear Completed Button', () => {
    it('should show clear button when there are completed videos', () => {
      const videos = [
        createMockVideo({ id: 'video-1', status: 'completed' }),
        createMockVideo({ id: 'video-2', status: 'queued' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });

    it('should not show clear button when no completed videos', () => {
      const videos = [
        createMockVideo({ id: 'video-1', status: 'queued' }),
        createMockVideo({ id: 'video-2', status: 'generating' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.queryByText('Clear Completed')).not.toBeInTheDocument();
    });

    it('should call onClearCompleted when clicked', async () => {
      const user = userEvent.setup();
      const videos = [createMockVideo({ id: 'video-1', status: 'completed' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      await user.click(screen.getByText('Clear Completed'));
      expect(mockOnClearCompleted).toHaveBeenCalledTimes(1);
    });

    it('should show clear button with failed videos', () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'failed' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });

    it('should show clear button with mixed completed and failed videos', () => {
      const videos = [
        createMockVideo({ id: 'video-1', status: 'completed' }),
        createMockVideo({ id: 'video-2', status: 'failed' }),
        createMockVideo({ id: 'video-3', status: 'queued' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByText('Clear Completed')).toBeInTheDocument();
    });
  });

  describe('Video Removal', () => {
    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      const videos = [createMockVideo({ id: 'video-1', prompt: 'Test video' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      await user.click(screen.getByText('Remove'));
      expect(mockOnRemove).toHaveBeenCalledWith('video-1');
    });

    it('should call onRemove with correct video id', async () => {
      const user = userEvent.setup();
      const videos = [createMockVideo({ id: 'video-1' }), createMockVideo({ id: 'video-2' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const removeButtons = screen.getAllByText('Remove');
      await user.click(removeButtons[1]);
      expect(mockOnRemove).toHaveBeenCalledWith('video-2');
    });
  });

  describe('Video Statuses', () => {
    it('should render queued videos', () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'queued' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
    });

    it('should render generating videos', () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'generating' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
    });

    it('should render completed videos', () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'completed' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
    });

    it('should render failed videos', () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'failed' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
    });

    it('should render mixed status videos', () => {
      const videos = [
        createMockVideo({ id: 'video-1', status: 'queued' }),
        createMockVideo({ id: 'video-2', status: 'generating' }),
        createMockVideo({ id: 'video-3', status: 'completed' }),
        createMockVideo({ id: 'video-4', status: 'failed' }),
      ];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      expect(screen.getByTestId('queue-item-video-1')).toBeInTheDocument();
      expect(screen.getByTestId('queue-item-video-2')).toBeInTheDocument();
      expect(screen.getByTestId('queue-item-video-3')).toBeInTheDocument();
      expect(screen.getByTestId('queue-item-video-4')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading', () => {
      render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent(/Video Queue/);
    });

    it('should have accessible clear button', async () => {
      const videos = [createMockVideo({ id: 'video-1', status: 'completed' })];

      render(
        <VideoGenerationQueue
          videoQueue={videos}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const button = screen.getByRole('button', { name: 'Clear Completed' });
      expect(button).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should have scrollable container', () => {
      const { container } = render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    it('should use flex layout', () => {
      const { container } = render(
        <VideoGenerationQueue
          videoQueue={[]}
          onRemove={mockOnRemove}
          onClearCompleted={mockOnClearCompleted}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('flex-col');
    });
  });
});
