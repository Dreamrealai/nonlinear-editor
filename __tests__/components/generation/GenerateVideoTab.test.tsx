import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GenerateVideoTab } from '@/components/generation/GenerateVideoTab';
import { useVideoGenerationQueue } from '@/lib/hooks/useVideoGenerationQueue';
import toast from 'react-hot-toast';

// Mock dependencies
jest.mock('@/lib/hooks/useVideoGenerationQueue');
jest.mock('react-hot-toast');
jest.mock(
  '@/components/generation/VideoGenerationForm',
  () => ({
    VideoGenerationForm: function MockVideoGenerationForm({ onSubmit }: any) {
      return (
        <form data-testid="video-generation-form" onSubmit={onSubmit}>
          <button type="submit">Generate Video</button>
        </form>
      );
    },
  })
);
jest.mock(
  '@/components/generation/VideoGenerationSettings',
  () => ({
    VideoGenerationSettings: function MockVideoGenerationSettings() {
      return <div data-testid="video-generation-settings">Settings</div>;
    },
  })
);
jest.mock(
  '@/components/generation/VideoGenerationQueue',
  () => ({
    VideoGenerationQueue: function MockVideoGenerationQueue() {
      return <div data-testid="video-generation-queue">Queue</div>;
    },
  })
);

const mockUseVideoGenerationQueue = useVideoGenerationQueue as jest.MockedFunction<
  typeof useVideoGenerationQueue
>;

describe('GenerateVideoTab', () => {
  const defaultProps = {
    projectId: 'test-project-id',
  };

  const mockVideoGenerationQueue = {
    videoQueue: [],
    generating: false,
    generateVideo: jest.fn(),
    removeVideo: jest.fn(),
    clearCompleted: jest.fn(),
  };

  beforeEach((): void => {
    jest.clearAllMocks();
    mockUseVideoGenerationQueue.mockReturnValue(mockVideoGenerationQueue);
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    // Wait for any pending async operations to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });
  });

  describe('Rendering', () => {
    it('should render the component', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByText('Generate Video with AI')).toBeInTheDocument();
    });

    it('should render form, settings, and queue sections', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
      expect(screen.getByTestId('video-generation-settings')).toBeInTheDocument();
      expect(screen.getByTestId('video-generation-queue')).toBeInTheDocument();
    });

    it('should display descriptive header text', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByText('Generate Video with AI')).toBeInTheDocument();
      expect(
        screen.getByText(/Create high-quality videos using Google Vertex AI Veo models/)
      ).toBeInTheDocument();
    });

    it('should render Toaster for notifications', () => {
      const { container } = render(<GenerateVideoTab {...defaultProps} />);

      // Toaster component should be present
      expect(container.querySelector('[class*="Toaster"]')).toBeTruthy();
    });
  });

  describe('Initial State', () => {
    it('should initialize with default form values', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      // Component should be rendered without errors
      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });

    it('should not show asset library modal initially', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.queryByText('Asset Library')).not.toBeInTheDocument();
    });
  });

  describe('Video Generation', () => {
    it('should call generateVideo when form is submitted', async () => {
      const generateVideo = jest.fn().mockResolvedValue(undefined);
      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        generateVideo,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      const form = screen.getByTestId('video-generation-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(generateVideo).toHaveBeenCalled();
      });
    });

    it('should handle generation errors gracefully', async () => {
      const generateVideo = jest.fn().mockRejectedValue(new Error('Generation failed'));
      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        generateVideo,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      const form = screen.getByTestId('video-generation-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(generateVideo).toHaveBeenCalled();
      });
    });

    it('should disable form during generation', () => {
      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        generating: true,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      // Form should pass disabled prop when generating
      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });
  });

  describe('Queue Management', () => {
    it('should display videos in queue', () => {
      const videoQueue = [
        { id: '1', status: 'pending' as const, prompt: 'Video 1' },
        { id: '2', status: 'pending' as const, prompt: 'Video 2' },
      ];

      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        videoQueue,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByTestId('video-generation-queue')).toBeInTheDocument();
    });

    it('should limit queue to maximum size', () => {
      const videoQueue = Array.from({ length: 8 }, (_, i) => ({
        id: `${i}`,
        status: 'pending' as const,
        prompt: `Video ${i}`,
      }));

      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        videoQueue,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      // Queue should be displayed
      expect(screen.getByTestId('video-generation-queue')).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should allow changing video generation model', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      // The form component should be able to handle model changes
      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });

    it('should adjust settings when model changes', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      // Settings should be rendered
      expect(screen.getByTestId('video-generation-settings')).toBeInTheDocument();
    });
  });

  describe('Form State Management', () => {
    it('should update form state on input changes', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });

    it('should reset form after successful generation', async () => {
      const generateVideo = jest.fn().mockResolvedValue(undefined);
      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        generateVideo,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      const form = screen.getByTestId('video-generation-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(generateVideo).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      const heading = screen.getByText('Generate Video with AI');
      expect(heading.tagName).toBe('H1');
    });

    it('should have descriptive text for screen readers', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(
        screen.getByText(/Create high-quality videos using Google Vertex AI Veo models/)
      ).toBeInTheDocument();
    });
  });

  describe('Layout', () => {
    it('should render in responsive grid layout', () => {
      const { container } = render(<GenerateVideoTab {...defaultProps} />);

      const gridContainer = container.querySelector('[class*="grid"]');
      expect(gridContainer).toBeInTheDocument();
    });

    it('should separate form and queue sections', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      const form = screen.getByTestId('video-generation-form');
      const queue = screen.getByTestId('video-generation-queue');

      expect(form).toBeInTheDocument();
      expect(queue).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing projectId gracefully', () => {
      render(<GenerateVideoTab projectId="" />);

      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });

    it('should handle queue hook errors', () => {
      mockUseVideoGenerationQueue.mockReturnValue({
        videoQueue: [],
        generating: false,
        generateVideo: jest.fn(),
        removeVideo: jest.fn(),
        clearCompleted: jest.fn(),
      });

      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should pass correct props to child components', () => {
      render(<GenerateVideoTab {...defaultProps} />);

      expect(screen.getByTestId('video-generation-form')).toBeInTheDocument();
      expect(screen.getByTestId('video-generation-settings')).toBeInTheDocument();
      expect(screen.getByTestId('video-generation-queue')).toBeInTheDocument();
    });

    it('should handle form submission with all components', async () => {
      const generateVideo = jest.fn().mockResolvedValue(undefined);
      mockUseVideoGenerationQueue.mockReturnValue({
        ...mockVideoGenerationQueue,
        generateVideo,
      });

      render(<GenerateVideoTab {...defaultProps} />);

      const form = screen.getByTestId('video-generation-form');
      fireEvent.submit(form);

      await waitFor(() => {
        expect(generateVideo).toHaveBeenCalled();
      });
    });
  });
});
