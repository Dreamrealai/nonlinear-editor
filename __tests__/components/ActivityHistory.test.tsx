import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { ActivityHistory } from '@/components/ActivityHistory';

// Mock the SupabaseProvider
const mockSupabaseClient = {};

jest.mock('@/components/providers/SupabaseProvider', () => ({
  useSupabase: () => ({
    supabaseClient: mockSupabaseClient,
  }),
}));

// Mock react-hot-toast
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: mockToast,
}));

// Mock fetch
global.fetch = jest.fn();

const mockHistory = [
  {
    id: 'activity-1',
    activity_type: 'video_generation',
    title: 'Epic Sci-Fi Scene',
    description: 'A futuristic cityscape with flying cars',
    model: 'veo-2.0',
    metadata: {
      duration: 8,
      resolution: '1080p',
      aspectRatio: '16:9',
    },
    created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
  },
  {
    id: 'activity-2',
    activity_type: 'audio_generation',
    title: 'Background Music',
    description: 'Ambient electronic track',
    model: 'elevenlabs-music',
    metadata: {
      duration: 30,
    },
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  },
  {
    id: 'activity-3',
    activity_type: 'video_upload',
    title: null,
    description: null,
    model: null,
    metadata: {
      fileSize: 52428800, // 50 MB
      mimeType: 'video/mp4',
    },
    created_at: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
  },
];

describe('ActivityHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Rendering', () => {
    it('should render without crashing', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Activity History')).toBeInTheDocument();
      });
    });

    it('should show loading state initially', () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ history: [] }),
        }), 1000))
      );

      render(<ActivityHistory />);
      expect(screen.getByText('Loading history...')).toBeInTheDocument();
    });

    it('should hide loading after data loads', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.queryByText('Loading history...')).not.toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no activities', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
        expect(screen.getByText('Your AI generations and uploads will appear here')).toBeInTheDocument();
      });
    });

    it('should show empty state emoji', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('📋')).toBeInTheDocument();
      });
    });

    it('should not show clear button when no activities', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.queryByText('Clear History')).not.toBeInTheDocument();
      });
    });
  });

  describe('Activity Display', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory }),
      });
    });

    it('should display all activities', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Epic Sci-Fi Scene')).toBeInTheDocument();
        expect(screen.getByText('Background Music')).toBeInTheDocument();
        expect(screen.getByText('Video Uploaded')).toBeInTheDocument();
      });
    });

    it('should display activity icons', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('🎬')).toBeInTheDocument(); // video_generation
        expect(screen.getByText('🎵')).toBeInTheDocument(); // audio_generation
        expect(screen.getByText('📹')).toBeInTheDocument(); // video_upload
      });
    });

    it('should display activity descriptions', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('A futuristic cityscape with flying cars')).toBeInTheDocument();
        expect(screen.getByText('Ambient electronic track')).toBeInTheDocument();
      });
    });

    it('should display model information', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Model: veo-2.0')).toBeInTheDocument();
        expect(screen.getByText('Model: elevenlabs-music')).toBeInTheDocument();
      });
    });

    it('should display metadata tags', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('8s')).toBeInTheDocument();
        expect(screen.getByText('1080p')).toBeInTheDocument();
        expect(screen.getByText('16:9')).toBeInTheDocument();
      });
    });

    it('should display file size in MB', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('50.0 MB')).toBeInTheDocument();
      });
    });

    it('should show activity count', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Showing 3 entries')).toBeInTheDocument();
      });
    });

    it('should show singular form for single entry', async () => {
      (global.fetch as jest.Mock).mockReset();
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: [mockHistory[0]] }),
      });

      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Showing 1 entry')).toBeInTheDocument();
      });
    });
  });

  describe('Relative Time Display', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory }),
      });
    });

    it('should display relative time for recent activities', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText(/1 hour/)).toBeInTheDocument();
        expect(screen.getByText(/1 day/)).toBeInTheDocument();
      });
    });

    it('should display formatted date for old activities', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        const timeText = screen.getByText((content, element) => {
          return element?.className.includes('whitespace-nowrap') && content.length > 0;
        });
        expect(timeText).toBeInTheDocument();
      });
    });
  });

  describe('Clear History', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory }),
      });
    });

    it('should show clear button when activities exist', async () => {
      render(<ActivityHistory />);
      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });
    });

    it('should show confirmation dialog when clearing', async () => {
      const confirmSpy = jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      expect(confirmSpy).toHaveBeenCalledWith(
        'Are you sure you want to clear your entire activity history? This action cannot be undone.'
      );

      confirmSpy.mockRestore();
    });

    it('should not clear if user cancels', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      // Should still show activities
      expect(screen.getByText('Epic Sci-Fi Scene')).toBeInTheDocument();
    });

    it('should clear history when user confirms', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const user = userEvent.setup();
      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/history', {
          method: 'DELETE',
        });
      });
    });

    it('should show loading state while clearing', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({}),
        }), 1000))
      );

      const user = userEvent.setup();
      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Clearing...')).toBeInTheDocument();
      }, { timeout: 100 });
    });

    it('should show success toast after clearing', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const user = userEvent.setup();
      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockToast.success).toHaveBeenCalledWith('Activity history cleared');
      });
    });

    it('should show error toast on failure', async () => {
      jest.spyOn(window, 'confirm').mockReturnValue(true);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to clear' }),
      });

      const user = userEvent.setup();
      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('Clear History')).toBeInTheDocument();
      });

      const clearButton = screen.getByText('Clear History');
      await user.click(clearButton);

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Failed to clear activity history');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle API error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
      });
    });

    it('should handle network error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
      });
    });

    it('should not show toast on 500 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('No activity yet')).toBeInTheDocument();
      });

      expect(mockToast.error).not.toHaveBeenCalled();
    });
  });

  describe('Activity Types', () => {
    it('should handle all activity types', async () => {
      const allTypesHistory = [
        { ...mockHistory[0], activity_type: 'video_generation' },
        { ...mockHistory[0], id: 'a2', activity_type: 'audio_generation' },
        { ...mockHistory[0], id: 'a3', activity_type: 'image_upload' },
        { ...mockHistory[0], id: 'a4', activity_type: 'video_upload' },
        { ...mockHistory[0], id: 'a5', activity_type: 'audio_upload' },
        { ...mockHistory[0], id: 'a6', activity_type: 'frame_edit' },
        { ...mockHistory[0], id: 'a7', activity_type: 'video_upscale' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: allTypesHistory }),
      });

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('🎬')).toBeInTheDocument(); // video_generation
        expect(screen.getByText('🎵')).toBeInTheDocument(); // audio_generation
        expect(screen.getByText('🖼️')).toBeInTheDocument(); // image_upload
        expect(screen.getByText('📹')).toBeInTheDocument(); // video_upload
        expect(screen.getByText('🎧')).toBeInTheDocument(); // audio_upload
        expect(screen.getByText('✨')).toBeInTheDocument(); // frame_edit
        expect(screen.getByText('📈')).toBeInTheDocument(); // video_upscale
      });
    });

    it('should handle unknown activity type', async () => {
      const unknownTypeHistory = [
        { ...mockHistory[0], activity_type: 'unknown_type' },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: unknownTypeHistory }),
      });

      render(<ActivityHistory />);

      await waitFor(() => {
        expect(screen.getByText('📄')).toBeInTheDocument();
        expect(screen.getByText('Activity')).toBeInTheDocument();
      });
    });
  });

  describe('Scrollable Area', () => {
    it('should have max height for scrolling', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ history: mockHistory }),
      });

      const { container } = render(<ActivityHistory />);

      await waitFor(() => {
        const scrollableArea = container.querySelector('.max-h-96');
        expect(scrollableArea).toBeInTheDocument();
      });
    });
  });
});
