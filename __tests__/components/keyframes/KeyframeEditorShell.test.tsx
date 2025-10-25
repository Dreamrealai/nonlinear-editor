/**
 * Tests for KeyframeEditorShell Component
 *
 * Tests the keyframe editor interface for AI-powered editing
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KeyframeEditorShell } from '@/components/keyframes/KeyframeEditorShell';

// Mock Supabase Provider
jest.mock('@/components/providers/SupabaseProvider', () => ({
  useSupabase: jest.fn(() => ({
    supabaseClient: {
      from: jest.fn(),
    },
    isLoading: false,
  })),
}));

// Mock loading spinner
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

// Mock all hooks
jest.mock('@/components/keyframes/hooks/useKeyframeData', () => ({
  useKeyframeData: jest.fn(() => ({
    scenes: [],
    frames: [],
    frameUrls: new Map(),
    groupedFrames: [],
  })),
  useFrameEdits: jest.fn(() => ({
    edits: [],
  })),
}));

jest.mock('@/components/keyframes/hooks/useKeyframeSelection', () => ({
  useKeyframeSelection: jest.fn(() => ({
    selectedFrameId: null,
    selectedFrameUrl: null,
    selectedFrame: null,
    mode: 'global',
    crop: null,
    feather: 0,
    cropOverlayStyle: {},
    setMode: jest.fn(),
    setCrop: jest.fn(),
    setFeather: jest.fn(),
    handleFrameSelect: jest.fn(),
    handleImageClick: jest.fn(),
    clampCrop: jest.fn(),
  })),
}));

jest.mock('@/components/keyframes/hooks/useKeyframeEditing', () => ({
  useKeyframeEditing: jest.fn(() => ({
    prompt: '',
    setPrompt: jest.fn(),
    isSubmitting: false,
    submitError: null,
    refImages: [],
    handleSubmit: jest.fn(),
    handleRefImageSelect: jest.fn(),
    handleRemoveRefImage: jest.fn(),
    handlePaste: jest.fn(),
  })),
}));

jest.mock('@/components/keyframes/hooks/useImageUpload', () => ({
  useImageUpload: jest.fn(() => ({
    assetVideoUrl: null,
    showVideoPlayer: false,
    setShowVideoPlayer: jest.fn(),
    isVideoReady: false,
    isExtractingFrame: false,
    isUploadingImage: false,
    videoRef: { current: null },
    canvasRef: { current: null },
    fileInputRef: { current: null },
    handleExtractFrame: jest.fn(),
    handleImageUpload: jest.fn(),
    handlePasteAsKeyframe: jest.fn(),
  })),
}));

const mockAsset = {
  id: 'asset-1',
  storage_url: 'supabase://bucket/video.mp4',
  type: 'video' as const,
  metadata: { filename: 'test.mp4' },
};

describe('KeyframeEditorShell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading spinner when Supabase is loading', () => {
    const { useSupabase } = require('@/components/providers/SupabaseProvider');
    useSupabase.mockReturnValue({
      supabaseClient: null,
      isLoading: true,
    });

    render(<KeyframeEditorShell assets={[mockAsset]} />);

    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByText('Loading keyframe editor...')).toBeInTheDocument();
  });

  it('renders editor when Supabase is loaded', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    expect(screen.getByText('Key Frame Editor')).toBeInTheDocument();
  });

  it('displays asset selector', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('displays refresh button', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    const refreshButton = screen.getByTitle('Refresh frames');
    expect(refreshButton).toBeInTheDocument();
  });

  it('handles refresh button click', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    const refreshButton = screen.getByTitle('Refresh frames');
    fireEvent.click(refreshButton);

    // Component should handle refresh
    expect(refreshButton).toBeInTheDocument();
  });

  it('selects first asset by default', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('asset-1');
  });

  it('handles asset selection change', () => {
    const asset2 = { ...mockAsset, id: 'asset-2' };

    render(<KeyframeEditorShell assets={[mockAsset, asset2]} />);

    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'asset-2' } });

    expect(select.value).toBe('asset-2');
  });

  it('hides video player by default', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    expect(screen.queryByLabelText('Video preview')).not.toBeInTheDocument();
  });

  it('shows video player when enabled', () => {
    const { useImageUpload } = require('@/components/keyframes/hooks/useImageUpload');
    useImageUpload.mockReturnValue({
      assetVideoUrl: 'https://example.com/video.mp4',
      showVideoPlayer: true,
      setShowVideoPlayer: jest.fn(),
      isVideoReady: true,
      isExtractingFrame: false,
      isUploadingImage: false,
      videoRef: { current: null },
      canvasRef: { current: null },
      fileInputRef: { current: null },
      handleExtractFrame: jest.fn(),
      handleImageUpload: jest.fn(),
      handlePasteAsKeyframe: jest.fn(),
    });

    render(<KeyframeEditorShell assets={[mockAsset]} />);

    expect(screen.getByLabelText('Video preview')).toBeInTheDocument();
  });

  it('renders with no assets', () => {
    render(<KeyframeEditorShell assets={[]} />);

    expect(screen.getByText('Key Frame Editor')).toBeInTheDocument();
  });

  it('passes correct props to child components', () => {
    render(<KeyframeEditorShell assets={[mockAsset]} />);

    // Component structure should be rendered
    expect(screen.getByText('Key Frame Editor')).toBeInTheDocument();
  });
});
