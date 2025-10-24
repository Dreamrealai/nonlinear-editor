import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TimelineCorrectionsMenu from '@/components/editor/TimelineCorrectionsMenu';
import { useEditorStore } from '@/state/useEditorStore';

// Mock the editor store
jest.mock('@/state/useEditorStore');

// Mock the correction hooks
jest.mock('@/components/editor/corrections/useCorrectionSync', () => ({
  useCorrectionSync: () => ({
    local: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      rotation: 0,
      scale: 1.0,
      bassGain: 0,
      midGain: 0,
      trebleGain: 0,
      compression: 0,
    },
    setters: {
      setBrightness: jest.fn(),
      setContrast: jest.fn(),
      setSaturation: jest.fn(),
      setHue: jest.fn(),
      setRotation: jest.fn(),
      setScale: jest.fn(),
      setBassGain: jest.fn(),
      setMidGain: jest.fn(),
      setTrebleGain: jest.fn(),
      setCompression: jest.fn(),
    },
    debounced: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      rotation: 0,
      scale: 1.0,
      bassGain: 0,
      midGain: 0,
      trebleGain: 0,
      compression: 0,
    },
  }),
}));

jest.mock('@/components/editor/corrections/useCorrectionHandlers', () => ({
  useCorrectionHandlers: () => ({
    updateTransform: jest.fn(),
    updateAudioEffects: jest.fn(),
    resetColorCorrection: jest.fn(),
    resetTransform: jest.fn(),
    resetAudioEffects: jest.fn(),
  }),
}));

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;

describe('TimelineCorrectionsMenu', () => {
  const mockUpdateClip = jest.fn();
  const mockClip = {
    id: 'clip-1',
    filePath: '/path/to/video.mp4',
    trackIndex: 0,
    timelinePosition: 0,
    start: 0,
    end: 10,
    hasAudio: true,
    colorCorrection: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
    },
    transform: {
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      scale: 1.0,
    },
    audioEffects: {
      bassGain: 0,
      midGain: 0,
      trebleGain: 0,
      compression: 0,
      normalize: false,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    // Arrange - Act - Assert
    it('should not render when no clip is selected', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(),
          timeline: { clips: [] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      const { container } = render(<TimelineCorrectionsMenu />);

      // Assert
      expect(container.firstChild).toBeNull();
    });

    it('should render when a clip is selected', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert
      expect(screen.getByText('Advanced Corrections')).toBeInTheDocument();
    });

    it('should display clip filename in header', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert
      expect(screen.getByText(/video\.mp4/)).toBeInTheDocument();
    });

    it('should be collapsed by default', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert
      expect(screen.getByText('Expand')).toBeInTheDocument();
      expect(screen.queryByText('Color')).not.toBeInTheDocument();
    });
  });

  describe('Expand/Collapse Functionality', () => {
    it('should expand when header is clicked', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      // Assert
      expect(screen.getByText('Collapse')).toBeInTheDocument();
      expect(screen.getByText('Color')).toBeInTheDocument();
    });

    it('should collapse when header is clicked again', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });

      // Expand
      fireEvent.click(expandButton);
      expect(screen.getByText('Collapse')).toBeInTheDocument();

      // Collapse
      fireEvent.click(expandButton);

      // Assert
      expect(screen.getByText('Expand')).toBeInTheDocument();
      expect(screen.queryByText('Color')).not.toBeInTheDocument();
    });

    it('should rotate chevron icon when expanded', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      const { container } = render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });

      // Find chevron before expand
      const chevronBefore = container.querySelector('svg');
      expect(chevronBefore).not.toHaveClass('rotate-180');

      // Expand
      fireEvent.click(expandButton);

      // Assert
      const chevronAfter = container.querySelector('svg');
      expect(chevronAfter).toHaveClass('rotate-180');
    });
  });

  describe('Section Tabs', () => {
    it('should show all section tabs when expanded', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      // Assert
      expect(screen.getByText('Color')).toBeInTheDocument();
      expect(screen.getByText('Transform')).toBeInTheDocument();
      expect(screen.getByText('Audio')).toBeInTheDocument();
    });

    it('should show color correction section by default', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      // Assert
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
      expect(screen.getByText('Hue')).toBeInTheDocument();
    });

    it('should switch to transform section when clicked', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      const transformTab = screen.getByText('Transform');
      fireEvent.click(transformTab);

      // Assert
      expect(screen.getByText('Rotation')).toBeInTheDocument();
      expect(screen.getByText('Scale')).toBeInTheDocument();
    });

    it('should switch to audio section when clicked', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      const audioTab = screen.getByText('Audio');
      fireEvent.click(audioTab);

      // Assert
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Mid')).toBeInTheDocument();
      expect(screen.getByText('Treble')).toBeInTheDocument();
    });
  });

  describe('Audio Section Visibility', () => {
    it('should show audio section when clip has audio', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      const audioTab = screen.getByText('Audio');
      fireEvent.click(audioTab);

      // Assert
      expect(screen.getByText('Bass')).toBeInTheDocument();
    });

    it('should not show audio tab when clip has no audio', () => {
      // Arrange
      const clipWithoutAudio = { ...mockClip, hasAudio: false };
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithoutAudio] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      fireEvent.click(expandButton);

      // Assert - Audio tab should not be rendered at all
      expect(screen.queryByText('Audio')).not.toBeInTheDocument();
      expect(screen.queryByText('Bass')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle clip without transform', () => {
      // Arrange
      const clipWithoutTransform = { ...mockClip };
      delete (clipWithoutTransform as any).transform;
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithoutTransform] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert - Should not crash
      expect(screen.getByText('Advanced Corrections')).toBeInTheDocument();
    });

    it('should handle clip without audio effects', () => {
      // Arrange
      const clipWithoutAudioEffects = { ...mockClip };
      delete (clipWithoutAudioEffects as any).audioEffects;
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithoutAudioEffects] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert - Should not crash
      expect(screen.getByText('Advanced Corrections')).toBeInTheDocument();
    });

    it('should handle very long filenames', () => {
      // Arrange
      const clipWithLongName = {
        ...mockClip,
        filePath: '/path/to/very-very-very-very-very-long-filename-that-should-be-truncated.mp4',
      };
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithLongName] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert - Should truncate filename to 20 characters + ...
      expect(screen.getByText(/very-very-very-very-/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button role for expand/collapse', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert
      const expandButton = screen.getByRole('button', { name: /Advanced Corrections/i });
      expect(expandButton).toHaveAttribute('type', 'button');
    });

    it('should have proper heading structure', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [mockClip] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<TimelineCorrectionsMenu />);

      // Assert
      expect(screen.getByRole('heading', { name: 'Advanced Corrections' })).toBeInTheDocument();
    });
  });
});
