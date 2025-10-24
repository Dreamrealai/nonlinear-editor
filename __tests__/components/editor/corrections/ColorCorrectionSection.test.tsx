import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ColorCorrectionSection } from '@/components/editor/corrections/ColorCorrectionSection';

describe('ColorCorrectionSection', () => {
  const mockOnBrightnessChange = jest.fn();
  const mockOnContrastChange = jest.fn();
  const mockOnSaturationChange = jest.fn();
  const mockOnHueChange = jest.fn();
  const mockOnReset = jest.fn();

  const defaultProps = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    onBrightnessChange: mockOnBrightnessChange,
    onContrastChange: mockOnContrastChange,
    onSaturationChange: mockOnSaturationChange,
    onHueChange: mockOnHueChange,
    onReset: mockOnReset,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    // Arrange - Act - Assert
    it('should render all color correction controls', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
      expect(screen.getByText('Hue')).toBeInTheDocument();
    });

    it('should display brightness value with percentage', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} brightness={150} />);

      // Assert
      expect(screen.getByText('150%')).toBeInTheDocument();
    });

    it('should display contrast value with percentage', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} contrast={75} />);

      // Assert
      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should display saturation value with percentage', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} saturation={125} />);

      // Assert
      expect(screen.getByText('125%')).toBeInTheDocument();
    });

    it('should display hue value with degree symbol', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} hue={180} />);

      // Assert
      expect(screen.getByText('180°')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Reset All')).toBeInTheDocument();
    });
  });

  describe('Slider Controls', () => {
    it('should have brightness slider with correct range', () => {
      // Arrange & Act
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const brightnessSlider = sliders[0];

      // Assert
      expect(brightnessSlider).toHaveAttribute('min', '0');
      expect(brightnessSlider).toHaveAttribute('max', '200');
      expect(brightnessSlider).toHaveAttribute('value', '100');
    });

    it('should have contrast slider with correct range', () => {
      // Arrange & Act
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const contrastSlider = sliders[1];

      // Assert
      expect(contrastSlider).toHaveAttribute('min', '0');
      expect(contrastSlider).toHaveAttribute('max', '200');
      expect(contrastSlider).toHaveAttribute('value', '100');
    });

    it('should have saturation slider with correct range', () => {
      // Arrange & Act
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const saturationSlider = sliders[2];

      // Assert
      expect(saturationSlider).toHaveAttribute('min', '0');
      expect(saturationSlider).toHaveAttribute('max', '200');
      expect(saturationSlider).toHaveAttribute('value', '100');
    });

    it('should have hue slider with correct range (0-360 degrees)', () => {
      // Arrange & Act
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const hueSlider = sliders[3];

      // Assert
      expect(hueSlider).toHaveAttribute('min', '0');
      expect(hueSlider).toHaveAttribute('max', '360');
      expect(hueSlider).toHaveAttribute('value', '0');
    });
  });

  describe('User Interactions', () => {
    it('should call onBrightnessChange when brightness slider changes', () => {
      // Arrange
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const brightnessSlider = sliders[0];

      // Act
      fireEvent.change(brightnessSlider, { target: { value: '150' } });

      // Assert
      expect(mockOnBrightnessChange).toHaveBeenCalledWith(150);
    });

    it('should call onContrastChange when contrast slider changes', () => {
      // Arrange
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const contrastSlider = sliders[1];

      // Act
      fireEvent.change(contrastSlider, { target: { value: '75' } });

      // Assert
      expect(mockOnContrastChange).toHaveBeenCalledWith(75);
    });

    it('should call onSaturationChange when saturation slider changes', () => {
      // Arrange
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const saturationSlider = sliders[2];

      // Act
      fireEvent.change(saturationSlider, { target: { value: '125' } });

      // Assert
      expect(mockOnSaturationChange).toHaveBeenCalledWith(125);
    });

    it('should call onHueChange when hue slider changes', () => {
      // Arrange
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const hueSlider = sliders[3];

      // Act
      fireEvent.change(hueSlider, { target: { value: '180' } });

      // Assert
      expect(mockOnHueChange).toHaveBeenCalledWith(180);
    });

    it('should call onReset when reset button is clicked', () => {
      // Arrange
      render(<ColorCorrectionSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Act
      fireEvent.click(resetButton);

      // Assert
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimum brightness value (0)', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} brightness={0} />);

      // Assert
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle maximum brightness value (200)', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} brightness={200} />);

      // Assert
      expect(screen.getByText('200%')).toBeInTheDocument();
    });

    it('should handle maximum hue value (360)', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} hue={360} />);

      // Assert
      expect(screen.getByText('360°')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type for reset', () => {
      // Arrange & Act
      render(<ColorCorrectionSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Assert
      expect(resetButton).toHaveAttribute('type', 'button');
    });

    it('should have labels associated with sliders', () => {
      // Arrange & Act
      const { container } = render(<ColorCorrectionSection {...defaultProps} />);
      const labels = container.querySelectorAll('label');

      // Assert
      expect(labels.length).toBe(4); // One for each slider
    });
  });
});
