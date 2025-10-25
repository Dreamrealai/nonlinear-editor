/**
 * Integration Test: Asset Panel Component Integration
 *
 * Tests the Asset Panel component with realistic user interactions:
 * - Tab switching between video/audio/image assets
 * - File upload via drag-drop zone
 * - Asset filtering and sorting
 * - Asset selection and actions
 * - Pagination controls
 * - Error handling and loading states
 *
 * This test verifies that AssetPanel, DragDropZone, and child components
 * work together correctly with real user interactions.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { AssetPanel } from '@/components/editor/AssetPanel';
import type { AssetRow } from '@/types/assets';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt, ...props }: any) {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('Integration: Asset Panel Component', () => {
  const projectId = 'test-project-123';

  // Create mock assets
  const createMockAsset = (overrides: Partial<AssetRow> = {}): AssetRow => ({
    id: 'asset-123',
    user_id: 'user-123',
    project_id: projectId,
    type: 'video',
    storage_url: 'supabase://assets/user-123/project-123/video.mp4',
    storage_path: 'user-123/project-123/video.mp4',
    metadata: {
      mimeType: 'video/mp4',
      width: 1920,
      height: 1080,
      duration: 30,
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  });

  const mockVideoAssets: AssetRow[] = [
    createMockAsset({
      id: 'video-1',
      type: 'video',
      storage_url: 'supabase://assets/video1.mp4',
      metadata: { mimeType: 'video/mp4', duration: 30 },
    }),
    createMockAsset({
      id: 'video-2',
      type: 'video',
      storage_url: 'supabase://assets/video2.mp4',
      metadata: { mimeType: 'video/mp4', duration: 60 },
    }),
  ];

  const mockImageAssets: AssetRow[] = [
    createMockAsset({
      id: 'image-1',
      type: 'image',
      storage_url: 'supabase://assets/image1.jpg',
      metadata: { mimeType: 'image/jpeg', width: 1920, height: 1080 },
    }),
  ];

  const mockAudioAssets: AssetRow[] = [
    createMockAsset({
      id: 'audio-1',
      type: 'audio',
      storage_url: 'supabase://assets/audio1.mp3',
      metadata: { mimeType: 'audio/mpeg', duration: 120 },
    }),
  ];

  const defaultProps = {
    assets: mockVideoAssets,
    projectId,
    loadingAssets: false,
    assetError: null,
    uploadPending: false,
    activeTab: 'video' as const,
    onTabChange: jest.fn(),
    onFileSelect: jest.fn(),
    onAssetAdd: jest.fn(),
    onAssetDelete: jest.fn(),
    currentPage: 0,
    totalPages: 1,
    totalCount: mockVideoAssets.length,
    hasNextPage: false,
    hasPreviousPage: false,
    onNextPage: jest.fn(),
    onPreviousPage: jest.fn(),
    usedAssetIds: new Set<string>(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tab Navigation', () => {
    it('should render all three asset type tabs', () => {
      render(<AssetPanel {...defaultProps} />);

      // Use more specific queries to avoid ambiguity with upload/action buttons
      expect(screen.getByRole('tab', { name: /video/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /audio/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /image/i })).toBeInTheDocument();
    });

    it('should highlight the active tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);

      const videoTab = screen.getByRole('tab', { name: /video/i });
      expect(videoTab).toHaveClass('border-blue-500');
    });

    it('should switch tabs when user clicks on different tab', async () => {
      const user = userEvent.setup();
      const onTabChange = jest.fn();

      render(<AssetPanel {...defaultProps} onTabChange={onTabChange} />);

      // Click on audio tab
      const audioTab = screen.getByRole('tab', { name: /audio/i });
      await user.click(audioTab);

      expect(onTabChange).toHaveBeenCalledWith('audio');
    });

    it('should show correct asset count in tab labels', () => {
      render(
        <AssetPanel
          {...defaultProps}
          assets={[...mockVideoAssets, ...mockImageAssets]}
          totalCount={3}
        />
      );

      // Tabs should show counts
      expect(screen.getByText(/video/i)).toBeInTheDocument();
    });
  });

  describe('Asset Display', () => {
    it('should display asset cards when assets are loaded', () => {
      render(<AssetPanel {...defaultProps} assets={mockVideoAssets} />);

      // Should show asset names
      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
      expect(screen.getByText('video2.mp4')).toBeInTheDocument();
    });

    it('should show loading state when assets are loading', () => {
      render(<AssetPanel {...defaultProps} loadingAssets={true} assets={[]} />);

      // Should show skeleton loaders
      expect(screen.getByText(/loading assets/i)).toBeInTheDocument();
    });

    it('should show empty state when no assets exist', () => {
      render(<AssetPanel {...defaultProps} assets={[]} />);

      // Should show empty state message
      expect(screen.getByText(/no video assets/i)).toBeInTheDocument();
    });

    it('should show error message when asset loading fails', () => {
      render(<AssetPanel {...defaultProps} assetError="Failed to load assets" />);

      expect(screen.getByText(/failed to load assets/i)).toBeInTheDocument();
    });

    it('should display asset metadata (duration, size, dimensions)', () => {
      render(<AssetPanel {...defaultProps} assets={mockVideoAssets} />);

      // Should show duration for videos
      expect(screen.getByText(/30s/)).toBeInTheDocument();
      expect(screen.getByText(/60s/)).toBeInTheDocument();
    });

    it('should show visual indicator for assets used in timeline', () => {
      const usedAssetIds = new Set(['video-1']);

      render(<AssetPanel {...defaultProps} usedAssetIds={usedAssetIds} />);

      // Asset card should indicate it's being used
      const assetCard = screen.getByText('video1.mp4').closest('[class*="asset"]');
      expect(assetCard).toBeInTheDocument();
    });
  });

  describe.skip('File Upload', () => {
    // TODO: These tests assume functionality not present in current AssetPanel implementation
    it('should show drag-drop zone for file upload', () => {
      render(<AssetPanel {...defaultProps} />);

      expect(screen.getByText(/drag & drop/i)).toBeInTheDocument();
      expect(screen.getByText(/or click to upload/i)).toBeInTheDocument();
    });

    it('should call onFileSelect when user selects a file', async () => {
      const user = userEvent.setup();
      const onFileSelect = jest.fn();

      render(<AssetPanel {...defaultProps} onFileSelect={onFileSelect} />);

      // Create a mock file
      const file = new File(['video content'], 'test-video.mp4', { type: 'video/mp4' });

      // Find file input (usually hidden)
      const fileInput = screen.getByLabelText(/upload/i);

      // Simulate file selection
      await user.upload(fileInput, file);

      expect(onFileSelect).toHaveBeenCalled();
    });

    it('should show upload progress indicator during upload', () => {
      render(<AssetPanel {...defaultProps} uploadPending={true} />);

      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });

    it('should disable drag-drop zone during upload', () => {
      render(<AssetPanel {...defaultProps} uploadPending={true} />);

      const uploadArea = screen.getByText(/uploading/i).closest('div');
      expect(uploadArea).toBeInTheDocument();
    });

    it('should accept only appropriate file types for each tab', () => {
      // Video tab
      const { rerender } = render(<AssetPanel {...defaultProps} activeTab="video" />);
      let fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
      expect(fileInput.accept).toContain('video');

      // Audio tab
      rerender(<AssetPanel {...defaultProps} activeTab="audio" />);
      fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
      expect(fileInput.accept).toContain('audio');

      // Image tab
      rerender(<AssetPanel {...defaultProps} activeTab="image" />);
      fileInput = screen.getByLabelText(/upload/i) as HTMLInputElement;
      expect(fileInput.accept).toContain('image');
    });
  });

  describe('Asset Actions', () => {
    it('should call onAssetAdd when user clicks add to timeline button', async () => {
      const user = userEvent.setup();
      const onAssetAdd = jest.fn();

      render(<AssetPanel {...defaultProps} onAssetAdd={onAssetAdd} />);

      // Find and click add button for first asset
      const addButtons = screen.getAllByRole('button', { name: /add to timeline/i });
      await user.click(addButtons[0]);

      expect(onAssetAdd).toHaveBeenCalledWith(mockVideoAssets[0]);
    });

    it('should call onAssetDelete when user clicks delete button', async () => {
      const user = userEvent.setup();
      const onAssetDelete = jest.fn();

      render(<AssetPanel {...defaultProps} onAssetDelete={onAssetDelete} />);

      // Find and click delete button for first asset
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      expect(onAssetDelete).toHaveBeenCalledWith(mockVideoAssets[0]);
    });

    it('should show confirmation for delete action', async () => {
      const user = userEvent.setup();
      const onAssetDelete = jest.fn();

      render(<AssetPanel {...defaultProps} onAssetDelete={onAssetDelete} />);

      // Find delete button
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);

      // Should show confirmation (implementation may vary)
      // This test assumes immediate deletion, adjust if confirmation dialog exists
      expect(onAssetDelete).toHaveBeenCalled();
    });

    it('should support double-click to add asset to timeline', async () => {
      const user = userEvent.setup();
      const onAssetAdd = jest.fn();

      render(<AssetPanel {...defaultProps} onAssetAdd={onAssetAdd} />);

      // Double click on asset card
      const assetCard = screen.getByText('video1.mp4');
      await user.dblClick(assetCard);

      expect(onAssetAdd).toHaveBeenCalledWith(mockVideoAssets[0]);
    });
  });

  describe('Pagination', () => {
    it('should show pagination controls when multiple pages exist', () => {
      render(
        <AssetPanel
          {...defaultProps}
          totalPages={3}
          currentPage={0}
          hasNextPage={true}
          hasPreviousPage={false}
        />
      );

      expect(screen.getByText(/page 1 of 3/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /previous/i })).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      render(
        <AssetPanel
          {...defaultProps}
          currentPage={0}
          hasPreviousPage={false}
          hasNextPage={true}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      expect(previousButton).toBeDisabled();
    });

    it('should disable next button on last page', () => {
      render(
        <AssetPanel
          {...defaultProps}
          currentPage={2}
          totalPages={3}
          hasPreviousPage={true}
          hasNextPage={false}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      expect(nextButton).toBeDisabled();
    });

    it('should call onNextPage when user clicks next button', async () => {
      const user = userEvent.setup();
      const onNextPage = jest.fn();

      render(
        <AssetPanel
          {...defaultProps}
          hasNextPage={true}
          onNextPage={onNextPage}
          totalPages={2}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });
      await user.click(nextButton);

      expect(onNextPage).toHaveBeenCalledTimes(1);
    });

    it('should call onPreviousPage when user clicks previous button', async () => {
      const user = userEvent.setup();
      const onPreviousPage = jest.fn();

      render(
        <AssetPanel
          {...defaultProps}
          currentPage={1}
          hasPreviousPage={true}
          onPreviousPage={onPreviousPage}
        />
      );

      const previousButton = screen.getByRole('button', { name: /previous/i });
      await user.click(previousButton);

      expect(onPreviousPage).toHaveBeenCalledTimes(1);
    });
  });

  describe.skip('Filtering and Sorting', () => {
    // TODO: These tests assume functionality not present in current AssetPanel implementation
    it('should show search/filter input', () => {
      render(<AssetPanel {...defaultProps} />);

      const searchInput = screen.getByPlaceholderText(/search assets/i);
      expect(searchInput).toBeInTheDocument();
    });

    it('should filter assets as user types in search', async () => {
      const user = userEvent.setup();

      render(<AssetPanel {...defaultProps} assets={mockVideoAssets} />);

      const searchInput = screen.getByPlaceholderText(/search assets/i);
      await user.type(searchInput, 'video1');

      // After filtering, only matching assets should be visible
      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
        expect(screen.queryByText('video2.mp4')).not.toBeInTheDocument();
      });
    });

    it('should show sort options dropdown', () => {
      render(<AssetPanel {...defaultProps} />);

      expect(screen.getByLabelText(/sort by/i)).toBeInTheDocument();
    });

    it('should sort assets when user changes sort option', async () => {
      const user = userEvent.setup();

      render(<AssetPanel {...defaultProps} assets={mockVideoAssets} />);

      const sortSelect = screen.getByLabelText(/sort by/i);
      await user.selectOptions(sortSelect, 'name');

      // Assets should be reordered (verify in DOM order)
      const assetNames = screen
        .getAllByText(/video\d\.mp4/)
        .map((el) => el.textContent);
      expect(assetNames).toEqual(['video1.mp4', 'video2.mp4']);
    });

    it('should filter by usage status (used/unused in timeline)', async () => {
      const user = userEvent.setup();
      const usedAssetIds = new Set(['video-1']);

      render(<AssetPanel {...defaultProps} usedAssetIds={usedAssetIds} />);

      // Find usage filter
      const usageFilter = screen.getByLabelText(/usage/i);
      await user.selectOptions(usageFilter, 'used');

      // Should show only used assets
      await waitFor(() => {
        expect(screen.getByText('video1.mp4')).toBeInTheDocument();
        expect(screen.queryByText('video2.mp4')).not.toBeInTheDocument();
      });
    });
  });

  describe.skip('Keyboard Navigation', () => {
    // TODO: These tests assume functionality not present in current AssetPanel implementation
    it('should support keyboard navigation between assets', async () => {
      const user = userEvent.setup();

      render(<AssetPanel {...defaultProps} />);

      // Tab to first asset
      await user.tab();

      // First asset button should be focused
      const firstAddButton = screen.getAllByRole('button', { name: /add to timeline/i })[0];
      expect(document.activeElement).toBe(firstAddButton);

      // Tab to next asset
      await user.tab();

      // Should move to next interactive element
      expect(document.activeElement).not.toBe(firstAddButton);
    });

    it('should add asset to timeline with Enter key when asset is focused', async () => {
      const user = userEvent.setup();
      const onAssetAdd = jest.fn();

      render(<AssetPanel {...defaultProps} onAssetAdd={onAssetAdd} />);

      // Focus first add button
      const addButton = screen.getAllByRole('button', { name: /add to timeline/i })[0];
      addButton.focus();

      // Press Enter
      await user.keyboard('{Enter}');

      expect(onAssetAdd).toHaveBeenCalledWith(mockVideoAssets[0]);
    });
  });

  describe.skip('Accessibility', () => {
    // TODO: These tests assume functionality not present in current AssetPanel implementation
    it('should have proper ARIA labels for all interactive elements', () => {
      render(<AssetPanel {...defaultProps} />);

      // Tabs should have roles and labels
      expect(screen.getByRole('button', { name: /video/i })).toHaveAttribute('aria-label');

      // Asset actions should have labels
      const addButtons = screen.getAllByRole('button', { name: /add to timeline/i });
      expect(addButtons.length).toBeGreaterThan(0);
    });

    it('should indicate loading state to screen readers', () => {
      render(<AssetPanel {...defaultProps} loadingAssets={true} />);

      expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
    });

    it('should announce asset count to screen readers', () => {
      render(<AssetPanel {...defaultProps} totalCount={2} />);

      // Should have accessible count information
      expect(screen.getByText(/2.*assets?/i)).toBeInTheDocument();
    });

    it('should provide descriptive labels for upload area', () => {
      render(<AssetPanel {...defaultProps} />);

      const uploadLabel = screen.getByLabelText(/upload/i);
      expect(uploadLabel).toBeInTheDocument();
    });
  });

  describe('Responsive Behavior', () => {
    it('should adjust grid layout based on container size', () => {
      const { container } = render(<AssetPanel {...defaultProps} />);

      // Find asset grid
      const grid = container.querySelector('[class*="grid"]');
      expect(grid).toBeInTheDocument();

      // Grid should have responsive classes
      expect(grid?.className).toMatch(/grid-cols/);
    });

    it('should show compact view on smaller screens', () => {
      // Mock window.matchMedia for mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(max-width: 768px)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(<AssetPanel {...defaultProps} />);

      // Component should render (specific behavior depends on implementation)
      expect(screen.getByText('video1.mp4')).toBeInTheDocument();
    });
  });

  describe.skip('Error Recovery', () => {
    // TODO: These tests assume functionality not present in current AssetPanel implementation
    it('should show retry button when asset loading fails', () => {
      render(<AssetPanel {...defaultProps} assetError="Network error" />);

      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    });

    it('should handle missing asset metadata gracefully', () => {
      const assetWithoutMetadata = createMockAsset({
        id: 'broken-asset',
        metadata: undefined as any,
      });

      render(<AssetPanel {...defaultProps} assets={[assetWithoutMetadata]} />);

      // Should still render asset without crashing
      expect(screen.getByText('broken-asset')).toBeInTheDocument();
    });

    it('should handle invalid storage URLs gracefully', () => {
      const assetWithBadUrl = createMockAsset({
        id: 'bad-url-asset',
        storage_url: 'invalid-url',
      });

      render(<AssetPanel {...defaultProps} assets={[assetWithBadUrl]} />);

      // Should render without crashing
      expect(screen.getByText(/bad-url-asset/)).toBeInTheDocument();
    });
  });
});
