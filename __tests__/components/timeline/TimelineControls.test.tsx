import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineControls } from '@/components/timeline/TimelineControls';

// Mock formatTime utility
jest.mock('@/lib/utils/timelineUtils', () => ({
  formatTime: (seconds: number) =>
    `${Math.floor(seconds)}:${Math.floor((seconds % 1) * 60)
      .toString()
      .padStart(2, '0')}`,
}));

describe('TimelineControls', () => {
  const defaultProps = {
    zoom: 100,
    currentTime: 5.5,
    timelineDuration: 30,
    canUndo: false,
    canRedo: false,
    clipAtPlayhead: false,
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onUndo: jest.fn(),
    onRedo: jest.fn(),
    onSplitAtPlayhead: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all basic controls', () => {
      render(<TimelineControls {...defaultProps} />);

      expect(screen.getByLabelText('Undo')).toBeInTheDocument();
      expect(screen.getByLabelText('Redo')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom out')).toBeInTheDocument();
      expect(screen.getByLabelText('Zoom in')).toBeInTheDocument();
      expect(screen.getByLabelText('Split clip at playhead')).toBeInTheDocument();
    });

    it('should display current zoom level', () => {
      render(<TimelineControls {...defaultProps} zoom={150} />);

      expect(screen.getByText('150px/s')).toBeInTheDocument();
    });

    it('should display current time and duration', () => {
      render(<TimelineControls {...defaultProps} currentTime={10} timelineDuration={60} />);

      expect(screen.getByText(/10:/)).toBeInTheDocument();
      expect(screen.getByText(/60:/)).toBeInTheDocument();
    });

    it('should render scene detection button when callback provided', () => {
      render(<TimelineControls {...defaultProps} onDetectScenes={jest.fn()} />);

      expect(screen.getByLabelText('Detect scenes in video')).toBeInTheDocument();
    });

    it('should render add text button when callback provided', () => {
      render(<TimelineControls {...defaultProps} onAddText={jest.fn()} />);

      expect(screen.getByLabelText('Add text overlay')).toBeInTheDocument();
    });

    it('should render add transition button when callback provided', () => {
      render(<TimelineControls {...defaultProps} onAddTransition={jest.fn()} />);

      expect(screen.getByLabelText('Add transition to selected clips')).toBeInTheDocument();
    });

    it('should render upscale video button when callback provided', () => {
      render(<TimelineControls {...defaultProps} onUpscaleVideo={jest.fn()} />);

      expect(
        screen.getByLabelText('Upscale selected video clip using Topaz AI')
      ).toBeInTheDocument();
    });

    it('should not render optional buttons when callbacks not provided', () => {
      render(<TimelineControls {...defaultProps} />);

      expect(screen.queryByLabelText('Detect scenes in video')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Add text overlay')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Add transition to selected clips')).not.toBeInTheDocument();
      expect(
        screen.queryByLabelText('Upscale selected video clip using Topaz AI')
      ).not.toBeInTheDocument();
    });
  });

  describe('Button States', () => {
    it('should disable undo button when canUndo is false', () => {
      render(<TimelineControls {...defaultProps} canUndo={false} />);

      const undoButton = screen.getByLabelText('Undo');
      expect(undoButton).toBeDisabled();
    });

    it('should enable undo button when canUndo is true', () => {
      render(<TimelineControls {...defaultProps} canUndo={true} />);

      const undoButton = screen.getByLabelText('Undo');
      expect(undoButton).not.toBeDisabled();
    });

    it('should disable redo button when canRedo is false', () => {
      render(<TimelineControls {...defaultProps} canRedo={false} />);

      const redoButton = screen.getByLabelText('Redo');
      expect(redoButton).toBeDisabled();
    });

    it('should enable redo button when canRedo is true', () => {
      render(<TimelineControls {...defaultProps} canRedo={true} />);

      const redoButton = screen.getByLabelText('Redo');
      expect(redoButton).not.toBeDisabled();
    });

    it('should disable split button when no clip at playhead', () => {
      render(<TimelineControls {...defaultProps} clipAtPlayhead={false} />);

      const splitButton = screen.getByLabelText('Split clip at playhead');
      expect(splitButton).toBeDisabled();
    });

    it('should enable split button when clip is at playhead', () => {
      render(<TimelineControls {...defaultProps} clipAtPlayhead={true} />);

      const splitButton = screen.getByLabelText('Split clip at playhead');
      expect(splitButton).not.toBeDisabled();
    });

    it('should disable scene detection button when pending', () => {
      render(
        <TimelineControls {...defaultProps} onDetectScenes={jest.fn()} sceneDetectPending={true} />
      );

      const sceneButton = screen.getByLabelText('Detecting scenes...');
      expect(sceneButton).toBeDisabled();
    });

    it('should disable upscale button when pending', () => {
      render(
        <TimelineControls {...defaultProps} onUpscaleVideo={jest.fn()} upscaleVideoPending={true} />
      );

      const upscaleButton = screen.getByLabelText('Upscaling selected video clip using Topaz AI');
      expect(upscaleButton).toBeDisabled();
    });
  });

  describe('User Interactions', () => {
    it('should call onZoomIn when zoom in button is clicked', () => {
      const onZoomIn = jest.fn();
      render(<TimelineControls {...defaultProps} onZoomIn={onZoomIn} />);

      const zoomInButton = screen.getByLabelText('Zoom in');
      fireEvent.click(zoomInButton);

      expect(onZoomIn).toHaveBeenCalledTimes(1);
    });

    it('should call onZoomOut when zoom out button is clicked', () => {
      const onZoomOut = jest.fn();
      render(<TimelineControls {...defaultProps} onZoomOut={onZoomOut} />);

      const zoomOutButton = screen.getByLabelText('Zoom out');
      fireEvent.click(zoomOutButton);

      expect(onZoomOut).toHaveBeenCalledTimes(1);
    });

    it('should call onUndo when undo button is clicked', () => {
      const onUndo = jest.fn();
      render(<TimelineControls {...defaultProps} canUndo={true} onUndo={onUndo} />);

      const undoButton = screen.getByLabelText('Undo');
      fireEvent.click(undoButton);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('should call onRedo when redo button is clicked', () => {
      const onRedo = jest.fn();
      render(<TimelineControls {...defaultProps} canRedo={true} onRedo={onRedo} />);

      const redoButton = screen.getByLabelText('Redo');
      fireEvent.click(redoButton);

      expect(onRedo).toHaveBeenCalledTimes(1);
    });

    it('should call onSplitAtPlayhead when split button is clicked', () => {
      const onSplitAtPlayhead = jest.fn();
      render(
        <TimelineControls
          {...defaultProps}
          clipAtPlayhead={true}
          onSplitAtPlayhead={onSplitAtPlayhead}
        />
      );

      const splitButton = screen.getByLabelText('Split clip at playhead');
      fireEvent.click(splitButton);

      expect(onSplitAtPlayhead).toHaveBeenCalledTimes(1);
    });

    it('should call onDetectScenes when scene detection button is clicked', () => {
      const onDetectScenes = jest.fn();
      render(<TimelineControls {...defaultProps} onDetectScenes={onDetectScenes} />);

      const sceneButton = screen.getByLabelText('Detect scenes in video');
      fireEvent.click(sceneButton);

      expect(onDetectScenes).toHaveBeenCalledTimes(1);
    });

    it('should call onAddText when add text button is clicked', () => {
      const onAddText = jest.fn();
      render(<TimelineControls {...defaultProps} onAddText={onAddText} />);

      const addTextButton = screen.getByLabelText('Add text overlay');
      fireEvent.click(addTextButton);

      expect(onAddText).toHaveBeenCalledTimes(1);
    });

    it('should call onAddTransition when add transition button is clicked', () => {
      const onAddTransition = jest.fn();
      render(<TimelineControls {...defaultProps} onAddTransition={onAddTransition} />);

      const addTransitionButton = screen.getByLabelText('Add transition to selected clips');
      fireEvent.click(addTransitionButton);

      expect(onAddTransition).toHaveBeenCalledTimes(1);
    });

    it('should call onUpscaleVideo when upscale button is clicked', () => {
      const onUpscaleVideo = jest.fn();
      render(<TimelineControls {...defaultProps} onUpscaleVideo={onUpscaleVideo} />);

      const upscaleButton = screen.getByLabelText('Upscale selected video clip using Topaz AI');
      fireEvent.click(upscaleButton);

      expect(onUpscaleVideo).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', () => {
      render(
        <TimelineControls
          {...defaultProps}
          onDetectScenes={jest.fn()}
          onAddText={jest.fn()}
          onAddTransition={jest.fn()}
          onUpscaleVideo={jest.fn()}
        />
      );

      expect(screen.getByLabelText('Undo')).toHaveAttribute('aria-label', 'Undo');
      expect(screen.getByLabelText('Redo')).toHaveAttribute('aria-label', 'Redo');
      expect(screen.getByLabelText('Zoom out')).toHaveAttribute('aria-label', 'Zoom out');
      expect(screen.getByLabelText('Zoom in')).toHaveAttribute('aria-label', 'Zoom in');
      expect(screen.getByLabelText('Split clip at playhead')).toHaveAttribute(
        'aria-label',
        'Split clip at playhead'
      );
    });

    it('should have proper title attributes for tooltips', () => {
      render(<TimelineControls {...defaultProps} />);

      expect(screen.getByLabelText('Undo')).toHaveAttribute('title', 'Undo (Cmd+Z)');
      expect(screen.getByLabelText('Redo')).toHaveAttribute('title', 'Redo (Cmd+Shift+Z)');
      expect(screen.getByLabelText('Zoom out')).toHaveAttribute('title', 'Zoom out');
      expect(screen.getByLabelText('Zoom in')).toHaveAttribute('title', 'Zoom in');
      expect(screen.getByLabelText('Split clip at playhead')).toHaveAttribute(
        'title',
        'Split clip at playhead (S)'
      );
    });
  });

  describe('Loading States', () => {
    it('should show loading spinner in scene detection button when pending', () => {
      render(
        <TimelineControls {...defaultProps} onDetectScenes={jest.fn()} sceneDetectPending={true} />
      );

      const button = screen.getByLabelText('Detecting scenes...');
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });

    it('should show loading spinner in upscale button when pending', () => {
      render(
        <TimelineControls {...defaultProps} onUpscaleVideo={jest.fn()} upscaleVideoPending={true} />
      );

      const button = screen.getByLabelText('Upscaling selected video clip using Topaz AI');
      const spinner = button.querySelector('svg');
      expect(spinner).toBeInTheDocument();
    });
  });
});
