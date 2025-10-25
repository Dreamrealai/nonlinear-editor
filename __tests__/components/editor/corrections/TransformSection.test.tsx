import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TransformSection } from '@/components/editor/corrections/TransformSection';

describe('TransformSection', () => {
  const mockOnRotationChange = jest.fn();
  const mockOnScaleChange = jest.fn();
  const mockOnFlipUpdate = jest.fn();
  const mockOnReset = jest.fn();

  const defaultProps = {
    rotation: 0,
    scale: 1.0,
    flipHorizontal: false,
    flipVertical: false,
    onRotationChange: mockOnRotationChange,
    onScaleChange: mockOnScaleChange,
    onFlipUpdate: mockOnFlipUpdate,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    // Arrange - Act - Assert
    it('should render all transform controls', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Rotation')).toBeInTheDocument();
      expect(screen.getByText('Scale')).toBeInTheDocument();
      expect(screen.getByText('Flip')).toBeInTheDocument();
    });

    it('should display rotation value with degree symbol', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} rotation={90} />);

      // Assert
      expect(screen.getByText('90°')).toBeInTheDocument();
    });

    it('should display scale value with multiplier', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} scale={1.5} />);

      // Assert
      expect(screen.getByText('1.50x')).toBeInTheDocument();
    });

    it('should render horizontal flip checkbox', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Horizontal')).toBeInTheDocument();
    });

    it('should render vertical flip checkbox', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Vertical')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Reset All')).toBeInTheDocument();
    });
  });

  describe('Slider Controls', () => {
    it('should have rotation slider with correct range (0-360 degrees)', () => {
      // Arrange & Act
      const { container } = render(<TransformSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const rotationSlider = sliders[0];

      // Assert
      expect(rotationSlider).toHaveAttribute('min', '0');
      expect(rotationSlider).toHaveAttribute('max', '360');
      expect(rotationSlider).toHaveAttribute('value', '0');
    });

    it('should have scale slider with correct range (0.1-3.0)', () => {
      // Arrange & Act
      const { container } = render(<TransformSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const scaleSlider = sliders[1];

      // Assert
      expect(scaleSlider).toHaveAttribute('min', '0.1');
      expect(scaleSlider).toHaveAttribute('max', '3');
      expect(scaleSlider).toHaveAttribute('step', '0.1');
      expect(scaleSlider).toHaveAttribute('value', '1');
    });
  });

  describe('User Interactions', () => {
    it('should call onRotationChange when rotation slider changes', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const rotationSlider = sliders[0];

      // Act
      fireEvent.change(rotationSlider, { target: { value: '180' } });

      // Assert
      expect(mockOnRotationChange).toHaveBeenCalledWith(180);
    });

    it('should call onScaleChange when scale slider changes', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const scaleSlider = sliders[1];

      // Act
      fireEvent.change(scaleSlider, { target: { value: '2.0' } });

      // Assert
      expect(mockOnScaleChange).toHaveBeenCalledWith(2.0);
    });

    it('should call onFlipUpdate when horizontal flip is toggled', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const horizontalFlipCheckbox = checkboxes[0];

      // Act
      fireEvent.click(horizontalFlipCheckbox);

      // Assert
      expect(mockOnFlipUpdate).toHaveBeenCalledWith({ flipHorizontal: true });
    });

    it('should call onFlipUpdate when vertical flip is toggled', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const verticalFlipCheckbox = checkboxes[1];

      // Act
      fireEvent.click(verticalFlipCheckbox);

      // Assert
      expect(mockOnFlipUpdate).toHaveBeenCalledWith({ flipVertical: true });
    });

    it('should call onReset when reset button is clicked', () => {
      // Arrange
      render(<TransformSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Act
      fireEvent.click(resetButton);

      // Assert
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Checkbox States', () => {
    it('should show horizontal flip as checked when true', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} flipHorizontal={true} />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const horizontalFlipCheckbox = checkboxes[0];

      // Assert
      expect(horizontalFlipCheckbox).toBeChecked();
    });

    it('should show vertical flip as checked when true', () => {
      // Arrange
      const { container } = render(<TransformSection {...defaultProps} flipVertical={true} />);
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');
      const verticalFlipCheckbox = checkboxes[1];

      // Assert
      expect(verticalFlipCheckbox).toBeChecked();
    });

    it('should show both flips as checked when both are true', () => {
      // Arrange
      const { container } = render(
        <TransformSection {...defaultProps} flipHorizontal={true} flipVertical={true} />
      );
      const checkboxes = container.querySelectorAll('input[type="checkbox"]');

      // Assert
      expect(checkboxes[0]).toBeChecked();
      expect(checkboxes[1]).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum scale value (0.1)', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} scale={0.1} />);

      // Assert
      expect(screen.getByText('0.10x')).toBeInTheDocument();
    });

    it('should handle maximum scale value (3.0)', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} scale={3.0} />);

      // Assert
      expect(screen.getByText('3.00x')).toBeInTheDocument();
    });

    it('should handle maximum rotation value (360)', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} rotation={360} />);

      // Assert
      expect(screen.getByText('360°')).toBeInTheDocument();
    });

    it('should format scale with two decimal places', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} scale={1.456} />);

      // Assert
      expect(screen.getByText('1.46x')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type for reset', () => {
      // Arrange & Act
      render(<TransformSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Assert
      expect(resetButton).toHaveAttribute('type', 'button');
    });

    it('should have labels associated with controls', () => {
      // Arrange & Act
      const { container } = render(<TransformSection {...defaultProps} />);
      const labels = container.querySelectorAll('label');

      // Assert
      expect(labels.length).toBeGreaterThan(0);
    });
  });
});
