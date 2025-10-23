import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import HorizontalTimeline from '@/components/HorizontalTimeline';
import { useEditorStore } from '@/state/useEditorStore';
import type { Clip, Timeline } from '@/types/timeline';

// Mock the editor store
jest.mock('@/state/useEditorStore');

const mockClip: Clip = {
  id: 'clip-1',
  assetId: 'asset-1',
  trackIndex: 0,
  timelinePosition: 0,
  start: 0,
  end: 10,
  filePath: 'test.mp4',
  thumbnailUrl: 'thumbnail.jpg',
  speed: 1.0,
  volume: 1.0,
  opacity: 1.0,
};

const mockTimeline: Timeline = {
  id: 'timeline-1',
  clips: [mockClip],
  textOverlays: [],
};

describe('HorizontalTimeline', () => {
  const mockSetCurrentTime = jest.fn();
  const mockSetZoom = jest.fn();
  const mockUpdateClip = jest.fn();
  const mockRemoveClip = jest.fn();
  const mockSelectClip = jest.fn();
  const mockClearSelection = jest.fn();
  const mockSplitClipAtTime = jest.fn();
  const mockCopyClips = jest.fn();
  const mockPasteClips = jest.fn();
  const mockUndo = jest.fn();
  const mockRedo = jest.fn();
  const mockCanUndo = jest.fn(() => false);
  const mockCanRedo = jest.fn(() => false);

  beforeEach(() => {
    jest.clearAllMocks();
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 0,
        zoom: 50,
        selectedClipIds: new Set<string>(),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });
  });

  it('should render timeline with clips', () => {
    render(<HorizontalTimeline />);

    expect(screen.getByText(/test\.mp4/i)).toBeInTheDocument();
    expect(screen.getByText('10.0s')).toBeInTheDocument();
  });

  it('should show empty state when no clips', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: { ...mockTimeline, clips: [] },
        currentTime: 0,
        zoom: 50,
        selectedClipIds: new Set<string>(),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });

    render(<HorizontalTimeline />);

    expect(screen.getByText(/Add clips from the assets panel/i)).toBeInTheDocument();
  });

  it('should handle zoom in', () => {
    render(<HorizontalTimeline />);

    const zoomInButton = screen.getByText('+');
    fireEvent.click(zoomInButton);

    expect(mockSetZoom).toHaveBeenCalledWith(60); // 50 * 1.2
  });

  it('should handle zoom out', () => {
    render(<HorizontalTimeline />);

    const zoomOutButton = screen.getByText('−');
    fireEvent.click(zoomOutButton);

    expect(mockSetZoom).toHaveBeenCalledWith(50 / 1.2);
  });

  it('should display undo and redo buttons', () => {
    render(<HorizontalTimeline />);

    expect(screen.getByTitle('Undo (Cmd+Z)')).toBeInTheDocument();
    expect(screen.getByTitle('Redo (Cmd+Shift+Z)')).toBeInTheDocument();
  });

  it('should enable undo when canUndo is true', () => {
    mockCanUndo.mockReturnValue(true);

    render(<HorizontalTimeline />);

    const undoButton = screen.getByTitle('Undo (Cmd+Z)');
    expect(undoButton).not.toBeDisabled();

    fireEvent.click(undoButton);
    expect(mockUndo).toHaveBeenCalled();
  });

  it('should enable redo when canRedo is true', () => {
    mockCanRedo.mockReturnValue(true);

    render(<HorizontalTimeline />);

    const redoButton = screen.getByTitle('Redo (Cmd+Shift+Z)');
    expect(redoButton).not.toBeDisabled();

    fireEvent.click(redoButton);
    expect(mockRedo).toHaveBeenCalled();
  });

  it('should show split button when clip is at playhead', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 5, // Within clip duration (0-10)
        zoom: 50,
        selectedClipIds: new Set<string>(),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });

    render(<HorizontalTimeline />);

    const splitButton = screen.getByTitle('Split clip at playhead (S)');
    expect(splitButton).not.toBeDisabled();
  });

  it('should disable split button when no clip at playhead', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 20, // Outside clip duration
        zoom: 50,
        selectedClipIds: new Set<string>(),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });

    render(<HorizontalTimeline />);

    const splitButton = screen.getByTitle('Split clip at playhead (S)');
    expect(splitButton).toBeDisabled();
  });

  it('should render Export Video button when onExport is provided', () => {
    const mockOnExport = jest.fn();
    render(<HorizontalTimeline onExport={mockOnExport} />);

    const exportButton = screen.getByTitle('Export/Render video');
    expect(exportButton).toBeInTheDocument();

    fireEvent.click(exportButton);
    expect(mockOnExport).toHaveBeenCalled();
  });

  it('should render Add Text button when onAddText is provided', () => {
    const mockOnAddText = jest.fn();
    render(<HorizontalTimeline onAddText={mockOnAddText} />);

    const addTextButton = screen.getByTitle('Add text overlay');
    expect(addTextButton).toBeInTheDocument();

    fireEvent.click(addTextButton);
    expect(mockOnAddText).toHaveBeenCalled();
  });

  it('should render Add Transition button when onAddTransition is provided', () => {
    const mockOnAddTransition = jest.fn();
    render(<HorizontalTimeline onAddTransition={mockOnAddTransition} />);

    const addTransitionButton = screen.getByTitle('Add transition to selected clips');
    expect(addTransitionButton).toBeInTheDocument();

    fireEvent.click(addTransitionButton);
    expect(mockOnAddTransition).toHaveBeenCalled();
  });

  it('should render Detect Scenes button when onDetectScenes is provided', () => {
    const mockOnDetectScenes = jest.fn();
    render(<HorizontalTimeline onDetectScenes={mockOnDetectScenes} />);

    const detectScenesButton = screen.getByTitle('Detect scenes in video');
    expect(detectScenesButton).toBeInTheDocument();

    fireEvent.click(detectScenesButton);
    expect(mockOnDetectScenes).toHaveBeenCalled();
  });

  it('should show "Detecting..." when scene detection is pending', () => {
    const mockOnDetectScenes = jest.fn();
    render(<HorizontalTimeline onDetectScenes={mockOnDetectScenes} sceneDetectPending={true} />);

    expect(screen.getByText('Detecting...')).toBeInTheDocument();
  });

  it('should display current time and timeline duration', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 5.5,
        zoom: 50,
        selectedClipIds: new Set<string>(),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });

    render(<HorizontalTimeline />);

    // Should show time in format MM:SS.MS
    expect(screen.getByText(/0:05.55/)).toBeInTheDocument();
  });

  it('should display track labels', () => {
    render(<HorizontalTimeline />);

    expect(screen.getByText('Track 1')).toBeInTheDocument();
  });

  it('should highlight selected clip', () => {
    (useEditorStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        timeline: mockTimeline,
        currentTime: 0,
        zoom: 50,
        selectedClipIds: new Set(['clip-1']),
        setCurrentTime: mockSetCurrentTime,
        setZoom: mockSetZoom,
        updateClip: mockUpdateClip,
        removeClip: mockRemoveClip,
        selectClip: mockSelectClip,
        clearSelection: mockClearSelection,
        splitClipAtTime: mockSplitClipAtTime,
        copyClips: mockCopyClips,
        pasteClips: mockPasteClips,
        undo: mockUndo,
        redo: mockRedo,
        canUndo: mockCanUndo,
        canRedo: mockCanRedo,
      };
      return selector(state);
    });

    const { container } = render(<HorizontalTimeline />);

    // Find clip element with yellow border (selected state)
    const selectedClip = container.querySelector('.border-yellow-400');
    expect(selectedClip).toBeInTheDocument();
  });

  it('should render time ruler with second markers', () => {
    render(<HorizontalTimeline />);

    // Should show 0s marker
    expect(screen.getByText('0s')).toBeInTheDocument();
  });
});
