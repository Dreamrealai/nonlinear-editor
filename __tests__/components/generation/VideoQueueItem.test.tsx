import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { VideoQueueItem } from '@/components/generation/VideoQueueItem';
import { browserLogger } from '@/lib/browserLogger';

jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('VideoQueueItem', () => {
  const mockOnRemove = jest.fn();

  const baseProps = {
    id: 'video-1',
    prompt: 'A beautiful sunset over the ocean',
    operationName: 'operation-123',
    onRemove: mockOnRemove,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnRemove.mockReset();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      expect(screen.getByText('A beautiful sunset over the ocean')).toBeInTheDocument();
    });

    it('should display the prompt', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      expect(screen.getByText('A beautiful sunset over the ocean')).toBeInTheDocument();
    });

    it('should render remove button', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      expect(screen.getByTitle('Remove from queue')).toBeInTheDocument();
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'A'.repeat(200);
      const { container } = render(
        <VideoQueueItem {...baseProps} prompt={longPrompt} status="queued" />
      );
      const promptElement = container.querySelector('.line-clamp-2');
      expect(promptElement).toBeInTheDocument();
      expect(promptElement).toHaveTextContent(longPrompt);
    });
  });

  describe('Queued State', () => {
    it('should show queued status', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      const queuedLabels = screen.getAllByText('Queued');
      expect(queuedLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should display static spinner for queued', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const spinner = container.querySelector('.border-t-neutral-600');
      expect(spinner).toBeInTheDocument();
      expect(spinner).not.toHaveClass('animate-spin');
    });

    it('should have neutral status badge', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      const badge = screen.getAllByText('Queued').find((element) => element.tagName === 'SPAN') as
        | HTMLElement
        | undefined;
      expect(badge).toBeDefined();
      expect(badge!).toHaveClass('bg-neutral-100', 'text-neutral-700');
    });
  });

  describe('Generating State', () => {
    it('should show generating status', () => {
      render(<VideoQueueItem {...baseProps} status="generating" />);
      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should display animated spinner for generating', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="generating" />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveClass('border-t-purple-600');
    });

    it('should have blue status badge', () => {
      render(<VideoQueueItem {...baseProps} status="generating" />);
      const badge = screen.getByText('Generating');
      expect(badge).toHaveClass('bg-blue-100', 'text-blue-700');
    });
  });

  describe('Completed State', () => {
    const completedProps = {
      ...baseProps,
      status: 'completed' as const,
      videoUrl: 'https://example.com/video.mp4',
      thumbnailUrl: 'https://example.com/thumb.jpg',
    };

    it('should show completed status', () => {
      render(<VideoQueueItem {...completedProps} />);
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should have green status badge', () => {
      render(<VideoQueueItem {...completedProps} />);
      const badge = screen.getByText('Completed');
      expect(badge).toHaveClass('bg-green-100', 'text-green-700');
    });

    it('should render video element', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', 'https://example.com/video.mp4');
    });

    it('should set video poster to thumbnail', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('poster', 'https://example.com/thumb.jpg');
    });

    it('should show controls on video', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('controls');
    });

    it('should have playsInline attribute', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');
      expect(video).toHaveAttribute('playsInline');
    });

    it('should show loading overlay initially', () => {
      render(<VideoQueueItem {...completedProps} />);
      expect(screen.getByText('Loading video...')).toBeInTheDocument();
    });

    it('should hide loading overlay on canPlay event', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');

      fireEvent.canPlay(video!);

      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
    });

    it('should hide loading overlay on loadedData event', () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');

      fireEvent.loadedData(video!);

      expect(screen.queryByText('Loading video...')).not.toBeInTheDocument();
    });

    it('should show error state on video error', async () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');

      fireEvent.error(video!);

      await waitFor(() => {
        expect(screen.getByText('Failed to load video')).toBeInTheDocument();
      });
    });

    it('should report video load errors with browserLogger', async () => {
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const video = container.querySelector('video');

      const errorEvent = new Event('error');
      fireEvent(video!, errorEvent);

      await waitFor(() => {
        expect(browserLogger.error).toHaveBeenCalledWith(
          { videoUrl: completedProps.videoUrl, errorEvent: 'error' },
          'Video load error'
        );
      });
    });
  });

  describe('Failed State', () => {
    it('should show failed status', () => {
      render(<VideoQueueItem {...baseProps} status="failed" />);
      const failedLabels = screen.getAllByText('Failed');
      expect(failedLabels.length).toBeGreaterThanOrEqual(1);
    });

    it('should have red status badge', () => {
      render(<VideoQueueItem {...baseProps} status="failed" />);
      const badge = screen.getAllByText('Failed').find((element) => element.tagName === 'SPAN') as
        | HTMLElement
        | undefined;
      expect(badge).toBeDefined();
      expect(badge!).toHaveClass('bg-red-100', 'text-red-700');
    });

    it('should show error icon', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="failed" />);
      const errorIcon = container.querySelector('.text-red-500');
      expect(errorIcon).toBeInTheDocument();
    });

    it('should display error message when provided', () => {
      const { container } = render(
        <VideoQueueItem {...baseProps} status="failed" error="Generation timeout" />
      );
      const errorParagraph = container.querySelector('p.text-red-600.mb-2');
      expect(errorParagraph).toBeInTheDocument();
      expect(errorParagraph).toHaveTextContent('Generation timeout');
    });

    it('should not display error message when not provided', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="failed" />);
      const errorParagraph = container.querySelector('p.text-red-600.mb-2');
      expect(errorParagraph).not.toBeInTheDocument();
    });
  });

  describe('Remove Functionality', () => {
    it('should call onRemove when remove button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoQueueItem {...baseProps} status="queued" />);

      const removeButton = screen.getByTitle('Remove from queue');
      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('video-1');
    });

    it('should call onRemove with correct id', async () => {
      const user = userEvent.setup();
      const customProps = { ...baseProps, id: 'custom-video-id' };
      render(<VideoQueueItem {...customProps} status="queued" />);

      const removeButton = screen.getByTitle('Remove from queue');
      await user.click(removeButton);

      expect(mockOnRemove).toHaveBeenCalledWith('custom-video-id');
    });

    it('should have opacity-0 by default', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const removeButton = screen.getByTitle('Remove from queue');
      expect(removeButton).toHaveClass('opacity-0');
    });

    it('should show on group hover', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const removeButton = screen.getByTitle('Remove from queue');
      expect(removeButton).toHaveClass('group-hover:opacity-100');
    });
  });

  describe('Accessibility', () => {
    it('should have captions track', () => {
      const completedProps = {
        ...baseProps,
        status: 'completed' as const,
        videoUrl: 'https://example.com/video.mp4',
      };
      const { container } = render(<VideoQueueItem {...completedProps} />);
      const track = container.querySelector('track');
      expect(track).toBeInTheDocument();
      expect(track).toHaveAttribute('kind', 'captions');
    });

    it('should have fallback text for video', () => {
      const completedProps = {
        ...baseProps,
        status: 'completed' as const,
        videoUrl: 'https://example.com/video.mp4',
      };
      const { container } = render(<VideoQueueItem {...completedProps} />);
      expect(container.textContent).toContain('Your browser does not support the video tag');
    });

    it('should have title on remove button', () => {
      render(<VideoQueueItem {...baseProps} status="queued" />);
      expect(screen.getByTitle('Remove from queue')).toBeInTheDocument();
    });
  });

  describe('Visual Layout', () => {
    it('should have aspect-video class for preview area', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const previewArea = container.querySelector('.aspect-video');
      expect(previewArea).toBeInTheDocument();
    });

    it('should have rounded corners', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const card = container.querySelector('.rounded-lg');
      expect(card).toBeInTheDocument();
    });

    it('should have border', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const card = container.querySelector('.border-neutral-200');
      expect(card).toBeInTheDocument();
    });

    it('should have shadow', () => {
      const { container } = render(<VideoQueueItem {...baseProps} status="queued" />);
      const card = container.querySelector('.shadow-sm');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty prompt', () => {
      render(<VideoQueueItem {...baseProps} prompt="" status="queued" />);
      expect(screen.getAllByText('Queued').length).toBeGreaterThan(0);
    });

    it('should handle very long error messages', () => {
      const longError = 'Error: ' + 'A'.repeat(200);
      render(<VideoQueueItem {...baseProps} status="failed" error={longError} />);
      expect(screen.getByText(longError)).toBeInTheDocument();
    });

    it('should handle completed without videoUrl', () => {
      render(<VideoQueueItem {...baseProps} status="completed" />);
      // Should show completed badge but no video element
      expect(screen.getByText('Completed')).toBeInTheDocument();
      const { container } = render(<VideoQueueItem {...baseProps} status="completed" />);
      const video = container.querySelector('video');
      expect(video).not.toBeInTheDocument();
    });

    it('should handle completed without thumbnailUrl', () => {
      const { container } = render(
        <VideoQueueItem
          {...baseProps}
          status="completed"
          videoUrl="https://example.com/video.mp4"
        />
      );
      const video = container.querySelector('video');
      expect(video).not.toHaveAttribute('poster');
    });
  });
});
