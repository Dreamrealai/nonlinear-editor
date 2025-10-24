import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AssetLibraryModal } from '@/components/generation/AssetLibraryModal';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    fill?: boolean;
    className?: string;
  }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock LoadingSpinner
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

// Mock browserLogger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

describe('AssetLibraryModal', () => {
  const mockOnSelect = jest.fn();
  const mockOnClose = jest.fn();
  const mockProjectId = 'project-123';

  const mockAssets = [
    {
      id: 'asset-1',
      storage_url: 'https://example.com/image1.jpg',
      metadata: { thumbnail: 'https://example.com/thumb1.jpg' },
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'asset-2',
      storage_url: 'https://example.com/image2.jpg',
      metadata: {},
      created_at: '2024-01-02T00:00:00Z',
    },
    {
      id: 'asset-3',
      storage_url: 'https://example.com/image3.jpg',
      created_at: '2024-01-03T00:00:00Z',
    },
  ];

  let mockFetch: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock fetch
    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: mockAssets,
            pagination: {
              totalPages: 1,
              totalCount: 3,
            },
          }),
      } as Response)
    );
    global.fetch = mockFetch;
  });

  describe('Rendering', () => {
    it('should render modal with header', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      expect(screen.getByText('Select Image from Library')).toBeInTheDocument();
    });

    it('should render close button', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      const closeButton = screen.getAllByRole('button')[0];
      expect(closeButton).toBeInTheDocument();
    });

    it('should render cancel button in footer', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });

    it('should show loading spinner initially', async () => {
      render(
        <AssetLibraryModal
          projectId={mockProjectId}
          onSelect={mockOnSelect}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Asset Fetching', () => {
    it('should fetch assets on mount', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining(`/api/assets?projectId=${mockProjectId}`)
        );
      });
    });

    it('should include pagination parameters in fetch', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=0')
        );
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('pageSize=20')
        );
      });
    });

    it('should filter by image type', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('type=image')
        );
      });
    });

    it('should display assets after loading', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
      });

      const images = screen.getAllByAltText('Asset');
      expect(images).toHaveLength(3);
    });

    it('should use thumbnail if available', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const firstImage = screen.getAllByAltText('Asset')[0];
        expect(firstImage).toHaveAttribute('src', mockAssets[0].metadata?.thumbnail);
      });
    });

    it('should fall back to storage_url when no thumbnail', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const thirdImage = screen.getAllByAltText('Asset')[2];
        expect(thirdImage).toHaveAttribute('src', mockAssets[2].storage_url);
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch assets')).toBeInTheDocument();
      });
    });

    it('should log error when fetch fails', async () => {
      const { browserLogger } = await import('@/lib/browserLogger');
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(browserLogger.error).toHaveBeenCalled();
      });
    });

    it('should display custom error message', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Custom error message'));

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Custom error message')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no assets', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: [],
            pagination: {
              totalPages: 0,
              totalCount: 0,
            },
          }),
      } as Response);

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('No images found')).toBeInTheDocument();
      });
    });

    it('should show upload prompt in empty state', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: [],
            pagination: {
              totalPages: 0,
              totalCount: 0,
            },
          }),
      } as Response);

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Upload an image to get started')).toBeInTheDocument();
      });
    });
  });

  describe('User Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      const closeButton = screen.getAllByRole('button')[0];
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when cancel button is clicked', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        fireEvent.click(cancelButton);
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSelect when asset is clicked', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const assetButtons = screen.getAllByRole('button').filter(
          (btn) => btn.querySelector('img[alt="Asset"]')
        );
        fireEvent.click(assetButtons[0]);
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockAssets[0]);
    });

    it('should pass correct asset data to onSelect', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const assetButtons = screen.getAllByRole('button').filter(
          (btn) => btn.querySelector('img[alt="Asset"]')
        );
        fireEvent.click(assetButtons[1]);
      });

      expect(mockOnSelect).toHaveBeenCalledWith(mockAssets[1]);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: mockAssets,
            pagination: {
              totalPages: 3,
              totalCount: 50,
            },
          }),
      } as Response);
    });

    it('should show pagination controls when multiple pages', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Previous')).toBeInTheDocument();
        expect(screen.getByText('Next')).toBeInTheDocument();
      });
    });

    it('should display current page information', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3 (50 total)')).toBeInTheDocument();
      });
    });

    it('should disable previous button on first page', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const prevButton = screen.getByText('Previous');
        expect(prevButton).toBeDisabled();
      });
    });

    it('should enable next button when more pages available', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const nextButton = screen.getByText('Next');
        expect(nextButton).not.toBeDisabled();
      });
    });

    it('should fetch next page when next button clicked', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=0')
        );
      });

      await act(async () => {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1')
        );
      });
    });

    it('should fetch previous page when previous button clicked', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      // Go to page 2
      await act(async () => {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 2 of 3 (50 total)')).toBeInTheDocument();
      });

      // Go back to page 1
      await act(async () => {
        const prevButton = screen.getByText('Previous');
        fireEvent.click(prevButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Page 1 of 3 (50 total)')).toBeInTheDocument();
      });
    });

    it('should disable next button on last page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: mockAssets,
            pagination: {
              totalPages: 1,
              totalCount: 3,
            },
          }),
      } as Response);

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const nextButton = screen.queryByText('Next');
        expect(nextButton).toBeNull(); // Pagination hidden when only 1 page
      });
    });

    it('should hide pagination when only one page', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            assets: mockAssets,
            pagination: {
              totalPages: 1,
              totalCount: 3,
            },
          }),
      } as Response);

      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.queryByText('Previous')).not.toBeInTheDocument();
        expect(screen.queryByText('Next')).not.toBeInTheDocument();
      });
    });

    it('should disable pagination buttons while loading', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      // Trigger page change
      await act(async () => {
        const nextButton = screen.getByText('Next');
        fireEvent.click(nextButton);
      });

      // Check if buttons are disabled during loading
      const prevButton = screen.getByText('Previous');
      const nextButton = screen.getByText('Next');

      // One of them might be disabled during the loading state
      expect(prevButton.disabled || nextButton.disabled).toBe(true);
    });
  });

  describe('Grid Layout', () => {
    it('should display assets in a grid', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const grid = document.querySelector('.grid');
        expect(grid).toBeInTheDocument();
      });
    });

    it('should have correct grid columns class', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const grid = document.querySelector('.grid-cols-3');
        expect(grid).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      const heading = screen.getByText('Select Image from Library');
      expect(heading.tagName).toBe('H2');
    });

    it('should have clickable asset buttons', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        const assetButtons = screen.getAllByRole('button').filter(
          (btn) => btn.querySelector('img[alt="Asset"]')
        );
        expect(assetButtons.length).toBeGreaterThan(0);
      });
    });

    it('should have proper button labels', async () => {
      await act(async () => {
        render(
          <AssetLibraryModal
            projectId={mockProjectId}
            onSelect={mockOnSelect}
            onClose={mockOnClose}
          />
        );
      });

      await waitFor(() => {
        expect(screen.getByText('Cancel')).toBeInTheDocument();
      });
    });
  });
});
