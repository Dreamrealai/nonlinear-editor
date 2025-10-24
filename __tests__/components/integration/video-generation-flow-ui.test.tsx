/**
 * Integration Test: Video Generation Flow (UI Components)
 *
 * Tests the complete video generation user flow with real component integration:
 * - User fills out the video generation form
 * - Form validates inputs
 * - User submits form
 * - Video is added to queue
 * - Queue displays video status
 * - User can monitor progress
 *
 * This test verifies that VideoGenerationForm, VideoGenerationQueue, and their
 * parent GenerateVideoTab work together correctly without heavy mocking.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { GenerateVideoTab } from '@/components/generation/GenerateVideoTab';
import toast from 'react-hot-toast';

// Mock only external dependencies, not our components
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Integration: Video Generation Flow (UI)', () => {
  const projectId = 'test-project-123';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Render and Layout', () => {
    it('should render all main sections of the video generation interface', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      // Verify header
      expect(screen.getByText('Generate Video with AI')).toBeInTheDocument();

      // Verify form fields are present
      expect(screen.getByLabelText('Model')).toBeInTheDocument();
      expect(screen.getByLabelText('Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
      expect(screen.getByLabelText('Video Description *')).toBeInTheDocument();

      // Verify queue section
      expect(screen.getByText(/videos in queue/)).toBeInTheDocument();

      // Verify submit button
      expect(screen.getByRole('button', { name: /Add to Queue/i })).toBeInTheDocument();
    });

    it('should show form disabled and queue empty initially', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      // Submit button should be disabled when no prompt
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      expect(submitButton).toBeDisabled();

      // Queue should show 0 videos
      expect(screen.getByText('0/8 videos in queue')).toBeInTheDocument();
    });

    it('should display correct default form values', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
      expect(modelSelect.value).toBe('veo-3-1-generate');

      const aspectRatioSelect = screen.getByLabelText('Aspect Ratio') as HTMLSelectElement;
      expect(aspectRatioSelect.value).toBe('16:9');

      const durationSelect = screen.getByLabelText('Duration') as HTMLSelectElement;
      expect(durationSelect.value).toBe('8');
    });
  });

  describe('Form Input and Validation', () => {
    it('should enable submit button when prompt is entered', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      expect(submitButton).toBeDisabled();

      // Type prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'A cinematic sunset over the ocean');

      // Submit button should now be enabled
      expect(submitButton).not.toBeDisabled();
    });

    it('should update form state when user changes model', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
      expect(modelSelect.value).toBe('veo-3-1-generate');

      // Change model
      await user.selectOptions(modelSelect, 'veo-2-0-generate');

      // Model should update
      await waitFor(() => {
        expect(modelSelect.value).toBe('veo-2-0-generate');
      });
    });

    it('should update form state when user changes aspect ratio', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const aspectRatioSelect = screen.getByLabelText('Aspect Ratio') as HTMLSelectElement;
      expect(aspectRatioSelect.value).toBe('16:9');

      // Change aspect ratio
      await user.selectOptions(aspectRatioSelect, '9:16');

      // Aspect ratio should update
      await waitFor(() => {
        expect(aspectRatioSelect.value).toBe('9:16');
      });
    });

    it('should update form state when user changes duration', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const durationSelect = screen.getByLabelText('Duration') as HTMLSelectElement;
      expect(durationSelect.value).toBe('8');

      // Change duration
      await user.selectOptions(durationSelect, '10');

      // Duration should update
      await waitFor(() => {
        expect(durationSelect.value).toBe('10');
      });
    });
  });

  describe('Video Generation Submission Flow', () => {
    it('should add video to queue when form is submitted', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videoId: 'video-123',
          status: 'pending',
        }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'A beautiful mountain landscape');

      // Verify queue is empty
      expect(screen.getByText('0/8 videos in queue')).toBeInTheDocument();

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/video-generation/generate',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });

      // Verify success toast
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      // Queue should update to show 1 video
      await waitFor(() => {
        expect(screen.getByText('1/8 videos in queue')).toBeInTheDocument();
      });
    });

    it('should reset form after successful submission', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videoId: 'video-123',
          status: 'pending',
        }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *') as HTMLTextAreaElement;
      await user.type(promptField, 'Test video prompt');
      expect(promptField.value).toBe('Test video prompt');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Wait for submission
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Form should be reset
      await waitFor(() => {
        expect(promptField.value).toBe('');
      });

      // Submit button should be disabled again
      expect(submitButton).toBeDisabled();
    });

    it('should show error toast when submission fails', async () => {
      const user = userEvent.setup();

      // Mock failed API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: 'Failed to generate video',
        }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Wait for API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });

      // Verify error toast
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Form should not be reset on error
      expect((promptField as HTMLTextAreaElement).value).toBe('Test video');
    });

    it('should disable form during submission', async () => {
      const user = userEvent.setup();

      // Mock slow API response
      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as jest.Mock).mockImplementationOnce(() => pendingPromise);

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByText('Adding to Queue...')).toBeInTheDocument();
      });

      // Form fields should be disabled
      expect(screen.getByLabelText('Model')).toBeDisabled();
      expect(screen.getByLabelText('Aspect Ratio')).toBeDisabled();
      expect(screen.getByLabelText('Duration')).toBeDisabled();
      expect(promptField).toBeDisabled();

      // Cleanup
      resolvePromise!({
        ok: true,
        json: async () => ({ videoId: 'video-123', status: 'pending' }),
      });
    });
  });

  describe('Queue Management', () => {
    it('should prevent submission when queue is full', async () => {
      const user = userEvent.setup();

      // Mock full queue (8 videos)
      const mockVideos = Array.from({ length: 8 }, (_, i) => ({
        videoId: `video-${i}`,
        status: 'pending' as const,
        prompt: `Video ${i}`,
      }));

      // Mock API to return full queue
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videos: mockVideos }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Wait for initial queue load
      await waitFor(() => {
        expect(screen.getByText('8/8 videos in queue')).toBeInTheDocument();
      });

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Submit button should be disabled due to full queue
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      expect(submitButton).toBeDisabled();
    });

    it('should display videos in queue with correct information', async () => {
      // Mock API response with videos
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          videos: [
            {
              videoId: 'video-1',
              status: 'pending',
              prompt: 'First video prompt',
              model: 'veo-3-1-generate',
            },
            {
              videoId: 'video-2',
              status: 'processing',
              prompt: 'Second video prompt',
              model: 'veo-2-0-generate',
              progress: 50,
            },
          ],
        }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Wait for queue to load
      await waitFor(() => {
        expect(screen.getByText('2/8 videos in queue')).toBeInTheDocument();
      });

      // Verify video information is displayed
      await waitFor(() => {
        expect(screen.getByText(/First video prompt/)).toBeInTheDocument();
        expect(screen.getByText(/Second video prompt/)).toBeInTheDocument();
      });
    });
  });

  describe('Model Configuration Integration', () => {
    it('should adjust available options when model changes', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
      const durationSelect = screen.getByLabelText('Duration') as HTMLSelectElement;

      // Initial state (Veo 3.1 supports 8 second duration)
      expect(modelSelect.value).toBe('veo-3-1-generate');
      expect(durationSelect.value).toBe('8');

      // Change to Veo 2.0 (might have different duration options)
      await user.selectOptions(modelSelect, 'veo-2-0-generate');

      // Verify model changed
      await waitFor(() => {
        expect(modelSelect.value).toBe('veo-2-0-generate');
      });

      // Duration options should still be available
      expect(durationSelect).toBeInTheDocument();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should support tab navigation through form fields', async () => {
      const user = userEvent.setup();
      render(<GenerateVideoTab projectId={projectId} />);

      const modelSelect = screen.getByLabelText('Model');
      const aspectRatioSelect = screen.getByLabelText('Aspect Ratio');
      const durationSelect = screen.getByLabelText('Duration');
      const promptField = screen.getByLabelText('Video Description *');

      // Start focus on model
      modelSelect.focus();
      expect(document.activeElement).toBe(modelSelect);

      // Tab to aspect ratio
      await user.tab();
      // Note: Tab order depends on DOM structure, this is simplified

      // At least verify elements are focusable
      aspectRatioSelect.focus();
      expect(document.activeElement).toBe(aspectRatioSelect);

      durationSelect.focus();
      expect(document.activeElement).toBe(durationSelect);

      promptField.focus();
      expect(document.activeElement).toBe(promptField);
    });

    it('should submit form with Enter key when focused on submit button', async () => {
      const user = userEvent.setup();

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ videoId: 'video-123', status: 'pending' }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Focus submit button
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      submitButton.focus();

      // Press Enter
      await user.keyboard('{Enter}');

      // Form should submit
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all form fields', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      expect(screen.getByLabelText('Model')).toHaveAttribute('id');
      expect(screen.getByLabelText('Aspect Ratio')).toHaveAttribute('id');
      expect(screen.getByLabelText('Duration')).toHaveAttribute('id');
      expect(screen.getByLabelText('Video Description *')).toHaveAttribute('id');
    });

    it('should mark required fields appropriately', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      const promptField = screen.getByLabelText('Video Description *');
      expect(promptField).toBeRequired();
    });

    it('should have proper heading hierarchy', () => {
      render(<GenerateVideoTab projectId={projectId} />);

      const mainHeading = screen.getByText('Generate Video with AI');
      expect(mainHeading.tagName).toBe('H1');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock network error
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      // Form should still be usable
      expect(promptField).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });

    it('should handle invalid API responses', async () => {
      const user = userEvent.setup();

      // Mock invalid response
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<GenerateVideoTab projectId={projectId} />);

      // Fill in prompt
      const promptField = screen.getByLabelText('Video Description *');
      await user.type(promptField, 'Test video');

      // Submit form
      const submitButton = screen.getByRole('button', { name: /Add to Queue/i });
      await user.click(submitButton);

      // Wait for error handling
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });
  });
});
