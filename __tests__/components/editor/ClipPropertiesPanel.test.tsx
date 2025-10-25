import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClipPropertiesPanel } from '@/components/editor/ClipPropertiesPanel';
import { useEditorStore } from '@/state/useEditorStore';

// Mock the editor store
jest.mock('@/state/useEditorStore');

// Mock useDebounce hook
jest.mock(
  '@/lib/hooks/useDebounce',
  (): Record<string, unknown> => ({
    useDebounce: (value: unknown) => value, // Return value immediately for testing
  })
);

const mockUseEditorStore = useEditorStore as jest.MockedFunction<typeof useEditorStore>;

describe('ClipPropertiesPanel', () => {
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

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    // Arrange - Act - Assert
    it('should render empty state when no clip is selected', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Select a clip to edit properties')).toBeInTheDocument();
    });

    it('should render clip info when a clip is selected', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
      expect(screen.getByText('/path/to/video.mp4')).toBeInTheDocument();
    });

    it('should display the "Advanced Corrections" info panel', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Advanced Corrections')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Use the collapsible menu below the timeline to access color correction, transform, and audio effects controls.'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Clip Info Display', () => {
    it('should display clip duration correctly', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Duration:')).toBeInTheDocument();
      expect(screen.getByText('10.00s')).toBeInTheDocument();
    });

    it('should display clip position correctly', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Position:')).toBeInTheDocument();
      expect(screen.getByText('0.00s')).toBeInTheDocument();
    });

    it('should display track index correctly', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Track:')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument(); // trackIndex + 1
    });

    it('should show speed when clip speed is not 1', () => {
      // Arrange
      const clipWithSpeed = { ...mockClip, speed: 2 };
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithSpeed] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Speed:')).toBeInTheDocument();
      expect(screen.getByText('2x')).toBeInTheDocument();
    });

    it('should not show speed when clip speed is 1', () => {
      // Arrange
      const clipWithNormalSpeed = { ...mockClip, speed: 1 };
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithNormalSpeed] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.queryByText('Speed:')).not.toBeInTheDocument();
    });

    it('should show audio indicator when clip has audio', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Audio:')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    it('should not show audio indicator when clip has no audio', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.queryByText('Audio:')).not.toBeInTheDocument();
    });
  });

  describe('Multiple Clips', () => {
    it('should display first selected clip when multiple clips are selected', () => {
      // Arrange
      const clip2 = { ...mockClip, id: 'clip-2', filePath: '/path/to/video2.mp4' };
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1', 'clip-2']),
          timeline: { clips: [mockClip, clip2] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('/path/to/video.mp4')).toBeInTheDocument();
      expect(screen.queryByText('/path/to/video2.mp4')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle clip without color correction', () => {
      // Arrange
      const clipWithoutColorCorrection = { ...mockClip };
      delete (clipWithoutColorCorrection as any).colorCorrection;
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [clipWithoutColorCorrection] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert - Should not crash and should render clip info
      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
    });

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
      render(<ClipPropertiesPanel />);

      // Assert - Should not crash and should render clip info
      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
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
      render(<ClipPropertiesPanel />);

      // Assert - Should not crash and should render clip info
      expect(screen.getByText('Clip Properties')).toBeInTheDocument();
    });

    it('should handle empty timeline clips array', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(['clip-1']),
          timeline: { clips: [] },
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Select a clip to edit properties')).toBeInTheDocument();
    });

    it('should handle null timeline', () => {
      // Arrange
      mockUseEditorStore.mockImplementation((selector: (state: any) => any) => {
        const state = {
          selectedClipIds: new Set(),
          timeline: null,
          updateClip: mockUpdateClip,
        };
        return selector(state);
      });

      // Act
      render(<ClipPropertiesPanel />);

      // Assert
      expect(screen.getByText('Select a clip to edit properties')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
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
      render(<ClipPropertiesPanel />);

      // Assert
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have semantic HTML structure', () => {
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
      const { container } = render(<ClipPropertiesPanel />);

      // Assert
      expect(container.querySelector('div')).toBeInTheDocument();
    });
  });
});
