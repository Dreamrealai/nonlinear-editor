import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TimelineContextMenu } from '@/components/timeline/TimelineContextMenu';

describe('TimelineContextMenu', () => {
  const defaultProps = {
    clipId: 'clip-1',
    x: 100,
    y: 200,
    onCopy: jest.fn(),
    onPaste: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the context menu', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    it('should render at correct position', () => {
      const { container } = render(<TimelineContextMenu {...defaultProps} x={150} y={250} />);

      const menu = container.querySelector('[role="menu"]') as HTMLElement;
      expect(menu.style.left).toBe('150px');
      expect(menu.style.top).toBe('250px');
    });

    it('should render Copy and Paste buttons', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
    });

    it('should render Split Audio button when callback provided', () => {
      render(<TimelineContextMenu {...defaultProps} onSplitAudio={jest.fn()} />);

      expect(screen.getByText('Split Audio')).toBeInTheDocument();
    });

    it('should render Split Scenes button when callback provided', () => {
      render(<TimelineContextMenu {...defaultProps} onSplitScenes={jest.fn()} />);

      expect(screen.getByText('Split Scenes')).toBeInTheDocument();
    });

    it('should render Generate Audio button when callback provided', () => {
      render(<TimelineContextMenu {...defaultProps} onGenerateAudio={jest.fn()} />);

      expect(screen.getByText('Generate Audio')).toBeInTheDocument();
    });

    it('should not render optional buttons when callbacks not provided', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      expect(screen.queryByText('Split Audio')).not.toBeInTheDocument();
      expect(screen.queryByText('Split Scenes')).not.toBeInTheDocument();
      expect(screen.queryByText('Generate Audio')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onCopy when Copy is clicked', () => {
      const onCopy = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onCopy={onCopy} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      expect(onCopy).toHaveBeenCalledTimes(1);
    });

    it('should close menu after Copy is clicked', () => {
      const onClose = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onClose={onClose} />);

      const copyButton = screen.getByText('Copy');
      fireEvent.click(copyButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onPaste when Paste is clicked', () => {
      const onPaste = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onPaste={onPaste} />);

      const pasteButton = screen.getByText('Paste');
      fireEvent.click(pasteButton);

      expect(onPaste).toHaveBeenCalledTimes(1);
    });

    it('should close menu after Paste is clicked', () => {
      const onClose = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onClose={onClose} />);

      const pasteButton = screen.getByText('Paste');
      fireEvent.click(pasteButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSplitAudio with clipId when Split Audio is clicked', () => {
      const onSplitAudio = jest.fn();
      render(
        <TimelineContextMenu {...defaultProps} clipId="test-clip" onSplitAudio={onSplitAudio} />
      );

      const splitAudioButton = screen.getByText('Split Audio');
      fireEvent.click(splitAudioButton);

      expect(onSplitAudio).toHaveBeenCalledWith('test-clip');
    });

    it('should call onSplitScenes with clipId when Split Scenes is clicked', () => {
      const onSplitScenes = jest.fn();
      render(
        <TimelineContextMenu {...defaultProps} clipId="test-clip" onSplitScenes={onSplitScenes} />
      );

      const splitScenesButton = screen.getByText('Split Scenes');
      fireEvent.click(splitScenesButton);

      expect(onSplitScenes).toHaveBeenCalledWith('test-clip');
    });

    it('should call onGenerateAudio with clipId when Generate Audio is clicked', () => {
      const onGenerateAudio = jest.fn();
      render(
        <TimelineContextMenu
          {...defaultProps}
          clipId="test-clip"
          onGenerateAudio={onGenerateAudio}
        />
      );

      const generateAudioButton = screen.getByText('Generate Audio');
      fireEvent.click(generateAudioButton);

      expect(onGenerateAudio).toHaveBeenCalledWith('test-clip');
    });

    it('should close menu after action buttons are clicked', () => {
      const onClose = jest.fn();
      render(
        <TimelineContextMenu
          {...defaultProps}
          onClose={onClose}
          onSplitAudio={jest.fn()}
          onSplitScenes={jest.fn()}
          onGenerateAudio={jest.fn()}
        />
      );

      fireEvent.click(screen.getByText('Split Audio'));
      expect(onClose).toHaveBeenCalled();

      jest.clearAllMocks();
      fireEvent.click(screen.getByText('Split Scenes'));
      expect(onClose).toHaveBeenCalled();

      jest.clearAllMocks();
      fireEvent.click(screen.getByText('Generate Audio'));
      expect(onClose).toHaveBeenCalled();
    });

    it('should stop event propagation on click', () => {
      const handleParentClick = jest.fn();
      render(
        <div onClick={handleParentClick}>
          <TimelineContextMenu {...defaultProps} />
        </div>
      );

      const menu = screen.getByRole('menu');
      fireEvent.click(menu);

      expect(handleParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should close menu when Escape is pressed', () => {
      const onClose = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onClose={onClose} />);

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Escape' });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should be keyboard focusable', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('tabIndex', '0');
    });

    it('should not close on other key presses', () => {
      const onClose = jest.fn();
      render(<TimelineContextMenu {...defaultProps} onClose={onClose} />);

      const menu = screen.getByRole('menu');
      fireEvent.keyDown(menu, { key: 'Enter' });
      fireEvent.keyDown(menu, { key: 'Space' });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Button States', () => {
    it('should disable Split Audio button when pending', () => {
      render(
        <TimelineContextMenu {...defaultProps} onSplitAudio={jest.fn()} splitAudioPending={true} />
      );

      const splitAudioButton = screen.getByText('Split Audio');
      expect(splitAudioButton).toBeDisabled();
    });

    it('should disable Split Scenes button when pending', () => {
      render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitScenes={jest.fn()}
          splitScenesPending={true}
        />
      );

      const splitScenesButton = screen.getByText('Split Scenes');
      expect(splitScenesButton).toBeDisabled();
    });

    it('should enable Split Audio button when not pending', () => {
      render(
        <TimelineContextMenu {...defaultProps} onSplitAudio={jest.fn()} splitAudioPending={false} />
      );

      const splitAudioButton = screen.getByText('Split Audio');
      expect(splitAudioButton).not.toBeDisabled();
    });

    it('should enable Split Scenes button when not pending', () => {
      render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitScenes={jest.fn()}
          splitScenesPending={false}
        />
      );

      const splitScenesButton = screen.getByText('Split Scenes');
      expect(splitScenesButton).not.toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper role attribute', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toBeInTheDocument();
    });

    it('should have aria-label', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('aria-label', 'Timeline context menu');
    });

    it('should have keyboard accessibility', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      const menu = screen.getByRole('menu');
      expect(menu).toHaveAttribute('tabIndex', '0');
    });

    it('should show disabled state visually', () => {
      render(
        <TimelineContextMenu {...defaultProps} onSplitAudio={jest.fn()} splitAudioPending={true} />
      );

      const splitAudioButton = screen.getByText('Split Audio');
      expect(splitAudioButton).toHaveClass('disabled:opacity-50');
      expect(splitAudioButton).toHaveClass('disabled:cursor-not-allowed');
    });
  });

  describe('Visual Styling', () => {
    it('should have proper z-index for overlay', () => {
      const { container } = render(<TimelineContextMenu {...defaultProps} />);

      const menu = container.querySelector('.z-50');
      expect(menu).toBeInTheDocument();
    });

    it('should have hover styles on buttons', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      const copyButton = screen.getByText('Copy');
      expect(copyButton).toHaveClass('hover:bg-neutral-100');
    });

    it('should have dividers between sections', () => {
      const { container } = render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitAudio={jest.fn()}
          onGenerateAudio={jest.fn()}
        />
      );

      const dividers = container.querySelectorAll('.bg-neutral-200');
      expect(dividers.length).toBeGreaterThan(0);
    });

    it('should display icons for each action', () => {
      render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitAudio={jest.fn()}
          onSplitScenes={jest.fn()}
          onGenerateAudio={jest.fn()}
        />
      );

      const { container } = render(<TimelineContextMenu {...defaultProps} />);
      const icons = container.querySelectorAll('svg');
      expect(icons.length).toBeGreaterThan(0);
    });
  });

  describe('Menu Layout', () => {
    it('should render all buttons when all callbacks provided', () => {
      render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitAudio={jest.fn()}
          onSplitScenes={jest.fn()}
          onGenerateAudio={jest.fn()}
        />
      );

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
      expect(screen.getByText('Split Audio')).toBeInTheDocument();
      expect(screen.getByText('Split Scenes')).toBeInTheDocument();
      expect(screen.getByText('Generate Audio')).toBeInTheDocument();
    });

    it('should render minimum buttons when no optional callbacks', () => {
      render(<TimelineContextMenu {...defaultProps} />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('Paste')).toBeInTheDocument();
      expect(screen.queryByText('Split Audio')).not.toBeInTheDocument();
      expect(screen.queryByText('Split Scenes')).not.toBeInTheDocument();
      expect(screen.queryByText('Generate Audio')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle clicks on disabled buttons', () => {
      const onSplitAudio = jest.fn();
      const onClose = jest.fn();
      render(
        <TimelineContextMenu
          {...defaultProps}
          onSplitAudio={onSplitAudio}
          splitAudioPending={true}
          onClose={onClose}
        />
      );

      const splitAudioButton = screen.getByText('Split Audio');
      fireEvent.click(splitAudioButton);

      // Handler should not be called when disabled
      expect(onSplitAudio).not.toHaveBeenCalled();
    });

    it('should handle negative coordinates', () => {
      const { container } = render(<TimelineContextMenu {...defaultProps} x={-10} y={-20} />);

      const menu = container.querySelector('[role="menu"]') as HTMLElement;
      expect(menu.style.left).toBe('-10px');
      expect(menu.style.top).toBe('-20px');
    });

    it('should handle very large coordinates', () => {
      const { container } = render(<TimelineContextMenu {...defaultProps} x={5000} y={3000} />);

      const menu = container.querySelector('[role="menu"]') as HTMLElement;
      expect(menu.style.left).toBe('5000px');
      expect(menu.style.top).toBe('3000px');
    });
  });
});
