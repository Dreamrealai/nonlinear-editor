import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ExportModal from '@/components/ExportModal';
import toast from 'react-hot-toast';
import type { Timeline } from '@/types/timeline';

// Mock dependencies
jest.mock('react-hot-toast');
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

describe('ExportModal', () => {
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
        url: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
      },
    ],
  } as Timeline;

  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    projectId: 'test-project-id',
    timeline: mockTimeline,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('Rendering', () => {
    it('should render the modal when isOpen is true', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('Export Video')).toBeInTheDocument();
    });

    it('should not render when isOpen is false', () => {
      render(<ExportModal {...defaultProps} isOpen={false} />);

      expect(screen.queryByText('Export Video')).not.toBeInTheDocument();
    });

    it('should display all export presets', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('1080p HD')).toBeInTheDocument();
      expect(screen.getByText('720p HD')).toBeInTheDocument();
      expect(screen.getByText('480p SD')).toBeInTheDocument();
      expect(screen.getByText('Web Optimized')).toBeInTheDocument();
    });

    it('should display preset descriptions', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText(/Full HD quality/)).toBeInTheDocument();
      expect(screen.getByText(/High quality/)).toBeInTheDocument();
      expect(screen.getByText(/Standard definition/)).toBeInTheDocument();
      expect(screen.getByText(/Fast loading/)).toBeInTheDocument();
    });

    it('should show selected settings panel', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('Selected Settings')).toBeInTheDocument();
      expect(screen.getByText('Resolution')).toBeInTheDocument();
      expect(screen.getByText('Frame Rate')).toBeInTheDocument();
      expect(screen.getByText('Format')).toBeInTheDocument();
    });

    it('should display info note about FFmpeg', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText(/Video export requires FFmpeg processing/)).toBeInTheDocument();
    });

    it('should show Cancel and Start Export buttons', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Start Export')).toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    it('should select 1080p HD by default', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('1920x1080')).toBeInTheDocument();
      expect(screen.getByText('30 fps')).toBeInTheDocument();
      expect(screen.getByText('MP4')).toBeInTheDocument();
    });

    it('should update selection when preset is clicked', () => {
      render(<ExportModal {...defaultProps} />);

      const preset720p = screen.getByText('720p HD').closest('button');
      fireEvent.click(preset720p!);

      expect(screen.getByText('1280x720')).toBeInTheDocument();
    });

    it('should highlight selected preset', () => {
      render(<ExportModal {...defaultProps} />);

      const preset1080p = screen.getByText('1080p HD').closest('button');
      expect(preset1080p).toHaveClass('border-blue-500');

      const preset720p = screen.getByText('720p HD').closest('button');
      fireEvent.click(preset720p!);

      expect(preset720p).toHaveClass('border-blue-500');
    });

    it('should update settings display when preset changes', () => {
      render(<ExportModal {...defaultProps} />);

      // Select 480p SD
      const preset480p = screen.getByText('480p SD').closest('button');
      fireEvent.click(preset480p!);

      expect(screen.getByText('854x480')).toBeInTheDocument();
      expect(screen.getByText('30 fps')).toBeInTheDocument();
      expect(screen.getByText('MP4')).toBeInTheDocument();
    });

    it('should show WebM format for Web Optimized preset', () => {
      render(<ExportModal {...defaultProps} />);

      const presetWeb = screen.getByText('Web Optimized').closest('button');
      fireEvent.click(presetWeb!);

      expect(screen.getByText('WEBM')).toBeInTheDocument();
    });
  });

  describe('Export Functionality', () => {
    it('should call export API when Start Export is clicked', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', message: 'Export started' }),
      });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/export', expect.any(Object));
      });
    });

    it('should send correct export parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123' }),
      });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/export',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('test-project-id'),
          })
        );
      });
    });

    it('should show success message on successful export', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123', message: 'Export started' }),
      });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('Export started successfully');
      });

      expect(screen.getByText('Export Started')).toBeInTheDocument();
    });

    it('should show error message on failed export', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Export failed' }),
      });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Export failed');
      });

      expect(screen.getByText('Export Failed')).toBeInTheDocument();
    });

    it('should disable button when no timeline', () => {
      render(<ExportModal {...defaultProps} timeline={null} />);

      const exportButton = screen.getByText('Start Export');
      expect(exportButton).toBeDisabled();
    });

    it('should show loading state during export', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ jobId: 'job-123' }) }), 100)
          )
      );

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      // Should show loading spinner
      await waitFor(() => {
        expect(exportButton.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should disable buttons during export', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ jobId: 'job-123' }) }), 100)
          )
      );

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      const cancelButton = screen.getByText('Cancel');

      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(exportButton).toBeDisabled();
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Modal Interactions', () => {
    it('should call onClose when Cancel is clicked', () => {
      const onClose = jest.fn();
      render(<ExportModal {...defaultProps} onClose={onClose} />);

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not allow closing during export', async () => {
      (global.fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, json: async () => ({ jobId: 'job-123' }) }), 100)
          )
      );

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      const cancelButton = screen.getByText('Cancel');
      await waitFor(() => {
        expect(cancelButton).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Network error');
      });
    });

    it('should handle missing timeline', () => {
      render(<ExportModal {...defaultProps} timeline={null} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      expect(toast.error).toHaveBeenCalledWith('No timeline to export');
    });

    it('should clear previous feedback on new export attempt', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'First error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ jobId: 'job-123' }),
        });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');

      // First attempt - should fail
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('Export Failed')).toBeInTheDocument();
      });

      // Second attempt - should succeed
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(screen.getByText('Export Started')).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper dialog title', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText('Export Video')).toBeInTheDocument();
    });

    it('should have descriptive dialog description', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText(/Select a preset to export your video/)).toBeInTheDocument();
    });

    it('should have accessible preset buttons', () => {
      render(<ExportModal {...defaultProps} />);

      const presetButtons = screen
        .getAllByRole('button')
        .filter((btn) => btn.textContent?.includes('HD') || btn.textContent?.includes('SD'));

      expect(presetButtons.length).toBeGreaterThan(0);
      presetButtons.forEach((button) => {
        expect(button).toBeInTheDocument();
      });
    });

    it('should show appropriate disabled states', () => {
      render(<ExportModal {...defaultProps} timeline={null} />);

      const exportButton = screen.getByText('Start Export');
      expect(exportButton).toBeDisabled();
    });
  });

  describe('Preset Details', () => {
    it('should show all technical details for 1080p HD', () => {
      render(<ExportModal {...defaultProps} />);

      expect(screen.getByText(/1920x1080/)).toBeInTheDocument();
      expect(screen.getByText(/30fps/)).toBeInTheDocument();
      expect(screen.getByText(/MP4/)).toBeInTheDocument();
    });

    it('should show correct bitrates in request body', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ jobId: 'job-123' }),
      });

      render(<ExportModal {...defaultProps} />);

      const exportButton = screen.getByText('Start Export');
      fireEvent.click(exportButton);

      await waitFor(() => {
        const callArgs = (global.fetch as jest.Mock).mock.calls[0];
        const body = JSON.parse(callArgs[1].body);
        expect(body.outputSpec.vBitrateK).toBe(8000);
        expect(body.outputSpec.aBitrateK).toBe(192);
      });
    });
  });
});
