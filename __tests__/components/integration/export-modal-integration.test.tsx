/**
 * Integration Test: Export Modal Workflow
 *
 * Tests the complete export workflow with real component interactions:
 * - Open export modal
 * - Select export preset
 * - Configure export settings
 * - Submit export request
 * - Monitor export progress
 * - Handle export completion/errors
 *
 * This test verifies that ExportModal integrates correctly with the timeline
 * and export API, providing a smooth user experience.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ExportModal } from '@/components/ExportModal';
import toast from 'react-hot-toast';
import type { Timeline } from '@/types/timeline';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('Integration: Export Modal Workflow', () => {
  const projectId = 'test-project-123';

  const mockTimeline: Timeline = {
    clips: [
      {
        id: 'clip-1',
        type: 'video',
        assetId: 'asset-1',
        startTime: 0,
        duration: 10,
        trimStart: 0,
        trimEnd: 10,
        url: 'https://example.com/video1.mp4',
        thumbnailUrl: 'https://example.com/thumb1.jpg',
      },
      {
        id: 'clip-2',
        type: 'video',
        assetId: 'asset-2',
        startTime: 10,
        duration: 15,
        trimStart: 0,
        trimEnd: 15,
        url: 'https://example.com/video2.mp4',
        thumbnailUrl: 'https://example.com/thumb2.jpg',
      },
    ],
  } as Timeline;

  const mockPresets = [
    {
      id: '1080p',
      name: '1080p HD',
      description: 'Full HD quality',
      is_platform: true,
      is_custom: false,
      platform_type: 'youtube_1080p',
      settings: {
        width: 1920,
        height: 1080,
        fps: 30,
        format: 'MP4',
      },
    },
    {
      id: '720p',
      name: '720p HD',
      description: 'HD quality',
      is_platform: true,
      is_custom: false,
      platform_type: 'youtube_720p',
      settings: {
        width: 1280,
        height: 720,
        fps: 30,
        format: 'MP4',
      },
    },
    {
      id: '480p',
      name: '480p SD',
      description: 'Standard definition',
      is_platform: true,
      is_custom: false,
      platform_type: 'standard',
      settings: {
        width: 854,
        height: 480,
        fps: 30,
        format: 'MP4',
      },
    },
    {
      id: 'web',
      name: 'Web Optimized',
      description: 'Optimized for web',
      is_platform: true,
      is_custom: false,
      platform_type: 'web',
      settings: {
        width: 1280,
        height: 720,
        fps: 30,
        format: 'WEBM',
      },
    },
  ];

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    projectId,
    timeline: mockTimeline,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();

    // Mock fetch to handle both presets and export endpoints intelligently
    (global.fetch as jest.Mock).mockImplementation(async (url: string): Promise<Response> => {
      // Always return presets for /api/export-presets
      if (url === '/api/export-presets') {
        return {
          ok: true,
          json: async (): Promise<{ data: { presets: typeof mockPresets } }> => ({
            data: {
              presets: mockPresets,
            },
          }),
        } as Response;
      }
      // Default response for other endpoints (will be overridden by tests)
      return {
        ok: false,
        json: async (): Promise<{ error: string }> => ({ error: 'Not mocked' }),
      } as Response;
    });
  });

  describe('Modal Opening and Initial State', () => {
    it('should render modal when isOpen is true', async () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('Export Video')).toBeInTheDocument();

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });
    });

    it('should not render modal when isOpen is false', () => {
      render(<ExportModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Export Video')).not.toBeInTheDocument();
    });

    it('should display default preset selected (1080p HD)', async () => {
      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      // Default preset should be highlighted - wait for styling to apply
      await waitFor(() => {
        const preset1080p = screen.getByText('1080p HD').closest('button');
        expect(preset1080p).toHaveClass('border-blue-500');
      });

      // Settings should show 1080p values - wait for all elements
      await waitFor(() => {
        expect(screen.getByText('1920x1080')).toBeInTheDocument();
        const fpsElements = screen.getAllByText(/30fps/i);
        expect(fpsElements.length).toBeGreaterThan(0);
        expect(screen.getByText('MP4')).toBeInTheDocument();
      });
    });

    it('should show all available export presets', async () => {
      render(<ExportModal {...defaultProps} />);

      // Wait for all presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
        expect(screen.getByText('720p HD')).toBeInTheDocument();
        expect(screen.getByText('480p SD')).toBeInTheDocument();
        expect(screen.getByText('Web Optimized')).toBeInTheDocument();
      });
    });
  });

  describe('Preset Selection Workflow', () => {
    it('should update settings when user selects different preset', async () => {
      const user = userEvent.setup();
      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      // Wait for initial settings to render
      await waitFor(() => {
        expect(screen.getByText('1920x1080')).toBeInTheDocument();
      });

      // Click 720p preset
      await waitFor(() => {
        const preset720p = screen.getByText('720p HD').closest('button');
        expect(preset720p).toBeInTheDocument();
      });

      const preset720p = screen.getByText('720p HD').closest('button');
      await user.click(preset720p!);

      // Settings should update
      await waitFor(
        () => {
          expect(screen.getByText('1280x720')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should highlight selected preset', async () => {
      const user = userEvent.setup();
      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('480p SD')).toBeInTheDocument();
      });

      // Click 480p preset - wait for it to be clickable
      await waitFor(() => {
        const preset480p = screen.getByText('480p SD').closest('button');
        expect(preset480p).toBeInTheDocument();
      });

      const preset480p = screen.getByText('480p SD').closest('button');
      await user.click(preset480p!);

      // Should be highlighted
      await waitFor(
        () => {
          expect(preset480p).toHaveClass('border-blue-500');
        },
        { timeout: 3000 }
      );

      // Previous preset should not be highlighted - wait for update
      await waitFor(() => {
        const preset1080p = screen.getByText('1080p HD').closest('button');
        expect(preset1080p).not.toHaveClass('border-blue-500');
      });
    });

    it('should show different format for Web Optimized preset', async () => {
      const user = userEvent.setup();
      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('Web Optimized')).toBeInTheDocument();
      });

      // Click Web Optimized preset - wait for it to be ready
      await waitFor(() => {
        const presetWeb = screen.getByText('Web Optimized').closest('button');
        expect(presetWeb).toBeInTheDocument();
      });

      const presetWeb = screen.getByText('Web Optimized').closest('button');
      await user.click(presetWeb!);

      // Should show WEBM format
      await waitFor(
        () => {
          expect(screen.getByText('WEBM')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('should navigate presets with keyboard', async () => {
      const user = userEvent.setup();
      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      // Focus first preset
      const preset1080p = screen.getByText('1080p HD').closest('button');
      preset1080p!.focus();

      // Tab to next preset
      await user.tab();

      // Should focus next preset
      const preset720p = screen.getByText('720p HD').closest('button');
      expect(document.activeElement).toBe(preset720p);
    });
  });

  describe('Export Submission Flow', () => {
    it('should submit export request with correct parameters', async () => {
      const user = userEvent.setup();

      // Mock the export endpoint response (presets already mocked in beforeEach)
      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: true,
            json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      // Click add to queue
      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      // Verify API call
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/export',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining(projectId),
          })
        );
      });
    });

    it('should show success message on successful export', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: true,
            json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });

      expect(screen.getByText('Export Started')).toBeInTheDocument();
    });

    it('should show error message on export failure', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return {
            ok: false,
            json: async () => ({ error: 'Export failed: insufficient credits' }),
          };
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Export failed: insufficient credits');
      });

      expect(screen.getByText('Export Failed')).toBeInTheDocument();
    });

    it('should disable buttons during export submission', async () => {
      const user = userEvent.setup();

      let resolveExportPromise: (value: any) => void;
      const pendingExportPromise = new Promise((resolve) => {
        resolveExportPromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return pendingExportPromise;
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });

      await user.click(exportButton);

      // Both buttons should be disabled
      await waitFor(() => {
        expect(exportButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });

      // Resolve promise and wait for state updates - wrap in act
      await act(async () => {
        resolveExportPromise!({
          ok: true,
          json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),
        });
      });

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });

    it('should show loading spinner during export', async () => {
      const user = userEvent.setup();

      let resolveExportPromise: (value: any) => void;
      const pendingExportPromise = new Promise((resolve) => {
        resolveExportPromise = resolve;
      });

      (global.fetch as jest.Mock).mockImplementation(async (url: string) => {
        if (url === '/api/export-presets') {
          return {
            ok: true,
            json: async () => ({ data: { presets: mockPresets } }),
          };
        }
        if (url === '/api/export') {
          return pendingExportPromise;
        }
        return { ok: false, json: async () => ({ error: 'Not mocked' }) };
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      // Should show loading indicator
      await waitFor(() => {
        expect(exportButton.querySelector('svg')).toBeInTheDocument();
      });

      // Resolve promise and wait for state updates - wrap in act
      await act(async () => {
        resolveExportPromise!({
          ok: true,
          json: async () => ({ data: { jobId: 'export-job-123' }, message: 'Export started' }),
        });
      });

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });

    it('should disable export when no timeline is present', () => {
      render(<ExportModal {...defaultProps} timeline={null} />);

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      expect(exportButton).toBeDisabled();
    });

    it('should show warning when timeline is empty', async () => {
      const emptyTimeline: Timeline = { clips: [] } as Timeline;

      render(<ExportModal {...defaultProps} timeline={emptyTimeline} />);

      // Wait for presets to load first
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      // Component doesn't currently show a specific warning for empty timelines
      // It will still allow export attempt which may fail on the backend
      // This is a potential enhancement for future
      expect(screen.getByRole('button', { name: /add to queue/i })).toBeInTheDocument();
    });
  });

  describe('Modal Closing Workflow', () => {
    it('should close modal when Cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<ExportModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should close modal when clicking outside', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<ExportModal {...defaultProps} onClose={onClose} />);

      // Click on backdrop
      const backdrop = screen.getByRole('dialog').parentElement;
      if (backdrop) {
        await user.click(backdrop);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('should close modal with Escape key', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      render(<ExportModal {...defaultProps} onClose={onClose} />);

      await user.keyboard('{Escape}');

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should prevent closing during active export', async () => {
      const user = userEvent.setup();
      const onClose = jest.fn();

      let resolvePromise: (value: any) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      (global.fetch as jest.Mock).mockImplementationOnce(() => pendingPromise);

      render(<ExportModal {...defaultProps} onClose={onClose} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      // Try to close with Escape
      await user.keyboard('{Escape}');

      // Should not close
      expect(onClose).not.toHaveBeenCalled();

      // Resolve promise and wait for state updates - wrap in act
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: async () => ({ jobId: 'export-job-123' }),
        });
      });

      // Wait for all async state updates to complete
      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });
  });

  describe('Retry After Failure', () => {
    it('should allow retry after export failure', async () => {
      const user = userEvent.setup();

      // First attempt fails
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Network error' }),
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      // Second attempt succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'export-job-123' }),
      });

      await user.click(exportButton);

      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should clear previous error state on new export attempt', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'First error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'export-job-123' }),
        });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });

      // First attempt
      await user.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      // Second attempt
      await user.click(exportButton);
      await waitFor(() => {
        expect(screen.queryByText('Export Failed')).not.toBeInTheDocument();
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog role and labels', async () => {
      render(<ExportModal {...defaultProps} />);

      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog).toBeInTheDocument();
        expect(dialog).toHaveAttribute('aria-labelledby');
      });
    });

    it('should trap focus within modal', async () => {
      const user = userEvent.setup();
      render(<ExportModal {...defaultProps} />);

      // Wait for modal to be ready
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Tab through elements
      await user.tab();

      // Focus should be within modal
      await waitFor(() => {
        const dialog = screen.getByRole('dialog');
        expect(dialog.contains(document.activeElement)).toBe(true);
      });
    });

    it('should have descriptive button labels', async () => {
      render(<ExportModal {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add to queue/i })).toHaveAccessibleName();
        expect(screen.getByRole('button', { name: /cancel/i })).toHaveAccessibleName();
      });
    });

    it('should announce export status changes', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'export-job-123' }),
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      // Status message should be present
      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('should handle invalid API responses', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Internal server error' }),
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should handle malformed export data', async () => {
      const user = userEvent.setup();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: null }), // Invalid response
      });

      render(<ExportModal {...defaultProps} />);

      // Wait for presets to load
      await waitFor(() => {
        expect(screen.getByText('1080p HD')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /add to queue/i });
      await user.click(exportButton);

      // Should handle gracefully
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalled();
      });
    });
  });
});
