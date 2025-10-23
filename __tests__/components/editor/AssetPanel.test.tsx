import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import AssetPanel, { type AssetRow } from '@/components/editor/AssetPanel';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockAssets: AssetRow[] = [
  {
    id: 'video-1',
    storage_url: 'supabase://project/videos/test-video.mp4',
    duration_seconds: 30,
    metadata: {
      filename: 'test-video.mp4',
      mimeType: 'video/mp4',
      thumbnail: 'https://example.com/thumb1.jpg',
    },
    rawMetadata: null,
    created_at: '2024-01-01T00:00:00Z',
    type: 'video',
  },
  {
    id: 'audio-1',
    storage_url: 'supabase://project/audio/test-audio.mp3',
    duration_seconds: 120,
    metadata: {
      filename: 'test-audio.mp3',
      mimeType: 'audio/mp3',
    },
    rawMetadata: null,
    created_at: '2024-01-02T00:00:00Z',
    type: 'audio',
  },
  {
    id: 'image-1',
    storage_url: 'supabase://project/images/test-image.jpg',
    duration_seconds: null,
    metadata: {
      filename: 'test-image.jpg',
      mimeType: 'image/jpeg',
      thumbnail: 'https://example.com/thumb2.jpg',
    },
    rawMetadata: null,
    created_at: '2024-01-03T00:00:00Z',
    type: 'image',
  },
];

describe('AssetPanel', () => {
  const mockOnTabChange = jest.fn();
  const mockOnFileSelect = jest.fn().mockResolvedValue(undefined);
  const mockOnAssetAdd = jest.fn().mockResolvedValue(undefined);
  const mockOnAssetDelete = jest.fn().mockResolvedValue(undefined);

  const defaultProps = {
    assets: mockAssets,
    projectId: 'test-project',
    loadingAssets: false,
    assetError: null,
    uploadPending: false,
    activeTab: 'video' as const,
    onTabChange: mockOnTabChange,
    onFileSelect: mockOnFileSelect,
    onAssetAdd: mockOnAssetAdd,
    onAssetDelete: mockOnAssetDelete,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      render(<AssetPanel {...defaultProps} />);
      expect(screen.getByText('Assets')).toBeInTheDocument();
    });

    it('should render upload button', () => {
      render(<AssetPanel {...defaultProps} />);
      expect(screen.getByText('Upload')).toBeInTheDocument();
    });

    it('should render all tabs', () => {
      render(<AssetPanel {...defaultProps} />);
      expect(screen.getByText('Videos')).toBeInTheDocument();
      expect(screen.getByText('Images')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const videoTab = screen.getByText('Videos');
      expect(videoTab).toHaveClass('border-b-2', 'border-neutral-900');
    });
  });

  describe('Tab Switching', () => {
    it('should call onTabChange when clicking Videos tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="audio" />);
      const videoTab = screen.getByText('Videos');
      fireEvent.click(videoTab);
      expect(mockOnTabChange).toHaveBeenCalledWith('video');
    });

    it('should call onTabChange when clicking Images tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const imageTab = screen.getByText('Images');
      fireEvent.click(imageTab);
      expect(mockOnTabChange).toHaveBeenCalledWith('image');
    });

    it('should call onTabChange when clicking Audio tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const audioTab = screen.getByText('Audio');
      fireEvent.click(audioTab);
      expect(mockOnTabChange).toHaveBeenCalledWith('audio');
    });

    it('should filter assets by active tab - video', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
      expect(screen.queryByText('test-audio.mp3')).not.toBeInTheDocument();
      expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument();
    });

    it('should filter assets by active tab - audio', () => {
      render(<AssetPanel {...defaultProps} activeTab="audio" />);
      expect(screen.getByText('test-audio.mp3')).toBeInTheDocument();
      expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument();
      expect(screen.queryByText('test-image.jpg')).not.toBeInTheDocument();
    });

    it('should filter assets by active tab - image', () => {
      render(<AssetPanel {...defaultProps} activeTab="image" />);
      expect(screen.getByText('test-image.jpg')).toBeInTheDocument();
      expect(screen.queryByText('test-video.mp4')).not.toBeInTheDocument();
      expect(screen.queryByText('test-audio.mp3')).not.toBeInTheDocument();
    });
  });

  describe('Upload Functionality', () => {
    it('should show "Uploading..." when uploadPending is true', () => {
      render(<AssetPanel {...defaultProps} uploadPending={true} />);
      expect(screen.getAllByText('Uploading…')[0]).toBeInTheDocument();
    });

    it('should disable upload button when uploadPending is true', () => {
      render(<AssetPanel {...defaultProps} uploadPending={true} />);
      const uploadButton = screen.getAllByRole('button', { name: /Uploading/i })[0];
      expect(uploadButton).toBeDisabled();
    });

    it('should have correct accept attribute for video tab', () => {
      const { container } = render(<AssetPanel {...defaultProps} activeTab="video" />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'video/*');
    });

    it('should have correct accept attribute for image tab', () => {
      const { container } = render(<AssetPanel {...defaultProps} activeTab="image" />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'image/*');
    });

    it('should have correct accept attribute for audio tab', () => {
      const { container } = render(<AssetPanel {...defaultProps} activeTab="audio" />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('accept', 'audio/*');
    });
  });

  describe('Asset Display', () => {
    it('should display loading state', () => {
      render(<AssetPanel {...defaultProps} loadingAssets={true} />);
      expect(screen.getByText('Loading assets…')).toBeInTheDocument();
    });

    it('should display error message when assetError is provided', () => {
      render(<AssetPanel {...defaultProps} assetError="Failed to load assets" />);
      expect(screen.getByText('Failed to load assets')).toBeInTheDocument();
    });

    it('should show empty state for videos when no assets', () => {
      render(<AssetPanel {...defaultProps} assets={[]} activeTab="video" />);
      expect(screen.getByText('No video assets yet. Upload video to begin editing.')).toBeInTheDocument();
    });

    it('should show empty state for images when no assets', () => {
      render(<AssetPanel {...defaultProps} assets={[]} activeTab="image" />);
      expect(screen.getByText('No image assets yet. Upload images.')).toBeInTheDocument();
    });

    it('should show empty state for audio when no assets', () => {
      render(<AssetPanel {...defaultProps} assets={[]} activeTab="audio" />);
      expect(screen.getByText('No audio assets yet. Upload or generate audio.')).toBeInTheDocument();
    });

    it('should render asset thumbnails when available', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const thumbnail = screen.getByAlt('');
      expect(thumbnail).toHaveAttribute('src', 'https://example.com/thumb1.jpg');
    });

    it('should render placeholder when no thumbnail available', () => {
      render(<AssetPanel {...defaultProps} activeTab="audio" />);
      expect(screen.getByText('AUDIO')).toBeInTheDocument();
    });

    it('should display asset filename', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    });

    it('should display file extension', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      expect(screen.getByText('.mp4')).toBeInTheDocument();
    });
  });

  describe('Asset Actions', () => {
    it('should call onAssetAdd when clicking an asset', async () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const asset = screen.getByText('test-video.mp4');
      fireEvent.click(asset);
      await waitFor(() => {
        expect(mockOnAssetAdd).toHaveBeenCalledWith(mockAssets[0]);
      });
    });

    it('should call onAssetDelete when clicking delete button', async () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const deleteButtons = screen.getAllByTitle('Delete asset');
      fireEvent.click(deleteButtons[0]);
      await waitFor(() => {
        expect(mockOnAssetDelete).toHaveBeenCalledWith(mockAssets[0]);
      });
    });

    it('should render delete button for each asset', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      const deleteButtons = screen.getAllByTitle('Delete asset');
      expect(deleteButtons).toHaveLength(1); // Only 1 video in filtered view
    });
  });

  describe('Generation Links', () => {
    it('should show video generation link for video tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      expect(screen.getByText('Generate Video with AI')).toBeInTheDocument();
      const link = screen.getByText('Generate Video with AI').closest('a');
      expect(link).toHaveAttribute('href', '/video-gen?projectId=test-project');
    });

    it('should show image generation link for image tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="image" />);
      expect(screen.getByText('Generate Images with AI')).toBeInTheDocument();
      const link = screen.getByText('Generate Images with AI').closest('a');
      expect(link).toHaveAttribute('href', '/image-gen?projectId=test-project');
    });

    it('should show audio generation link for audio tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="audio" />);
      expect(screen.getByText('Generate Audio with AI')).toBeInTheDocument();
      const link = screen.getByText('Generate Audio with AI').closest('a');
      expect(link).toHaveAttribute('href', '/audio-gen?projectId=test-project');
    });

    it('should show upload button for video tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="video" />);
      expect(screen.getByText('Upload Video/Image')).toBeInTheDocument();
    });

    it('should show upload button for image tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="image" />);
      expect(screen.getByText('Upload Images')).toBeInTheDocument();
    });

    it('should show upload button for audio tab', () => {
      render(<AssetPanel {...defaultProps} activeTab="audio" />);
      expect(screen.getByText('Upload Audio')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle assets without metadata', () => {
      const assetWithoutMetadata: AssetRow = {
        ...mockAssets[0],
        metadata: null,
      };
      render(<AssetPanel {...defaultProps} assets={[assetWithoutMetadata]} activeTab="video" />);
      expect(screen.getByText('test-video.mp4')).toBeInTheDocument();
    });

    it('should extract filename from storage_url when metadata is missing', () => {
      const assetWithoutMetadata: AssetRow = {
        id: 'test-1',
        storage_url: 'supabase://project/videos/extracted-name.mp4',
        duration_seconds: null,
        metadata: null,
        rawMetadata: null,
        created_at: '2024-01-01T00:00:00Z',
        type: 'video',
      };
      render(<AssetPanel {...defaultProps} assets={[assetWithoutMetadata]} activeTab="video" />);
      expect(screen.getByText('extracted-name.mp4')).toBeInTheDocument();
    });

    it('should handle multiple file uploads', () => {
      const { container } = render(<AssetPanel {...defaultProps} />);
      const fileInput = container.querySelector('input[type="file"]');
      expect(fileInput).toHaveAttribute('multiple');
    });

    it('should not crash with empty assets array', () => {
      render(<AssetPanel {...defaultProps} assets={[]} />);
      expect(screen.getByText('Assets')).toBeInTheDocument();
    });
  });
});
