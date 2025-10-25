/**
 * VideoEffectsSection Component Tests
 *
 * Comprehensive test suite covering:
 * - Effect presets rendering and application
 * - Manual controls (brightness, contrast, saturation, hue, blur)
 * - Slider interactions
 * - Reset functionality
 * - Accessibility
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  VideoEffectsSection,
  VIDEO_EFFECT_PRESETS,
} from '@/components/editor/corrections/VideoEffectsSection';

describe('VideoEffectsSection', () => {
  const mockHandlers = {
    onBrightnessChange: jest.fn(),
    onContrastChange: jest.fn(),
    onSaturationChange: jest.fn(),
    onHueChange: jest.fn(),
    onBlurChange: jest.fn(),
    onPresetApply: jest.fn(),
    onReset: jest.fn(),
  };

  const defaultProps = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    ...mockHandlers,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Effect Presets', () => {
    it('should render all 10 effect presets', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      expect(screen.getByText('Normal')).toBeInTheDocument();
      expect(screen.getByText('Vivid')).toBeInTheDocument();
      expect(screen.getByText('Vintage')).toBeInTheDocument();
      expect(screen.getByText('Black & White')).toBeInTheDocument();
      expect(screen.getByText('Cool')).toBeInTheDocument();
      expect(screen.getByText('Warm')).toBeInTheDocument();
      expect(screen.getByText('Faded')).toBeInTheDocument();
      expect(screen.getByText('Dramatic')).toBeInTheDocument();
      expect(screen.getByText('Soft Focus')).toBeInTheDocument();
      expect(screen.getByText('Dream')).toBeInTheDocument();
    });

    it('should display preset icons', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      // Check that icon emojis are rendered
      expect(screen.getByLabelText('Normal')).toHaveTextContent('🔄');
      expect(screen.getByLabelText('Vivid')).toHaveTextContent('🎨');
      expect(screen.getByLabelText('Vintage')).toHaveTextContent('📷');
    });

    it('should call onPresetApply when Normal preset is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoEffectsSection {...defaultProps} />);

      const normalButton = screen.getByRole('button', { name: /Normal/i });
      await user.click(normalButton);

      expect(mockHandlers.onPresetApply).toHaveBeenCalledWith(VIDEO_EFFECT_PRESETS[0]);
    });

    it('should call onPresetApply when Vivid preset is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoEffectsSection {...defaultProps} />);

      const vividButton = screen.getByRole('button', { name: /Vivid/i });
      await user.click(vividButton);

      expect(mockHandlers.onPresetApply).toHaveBeenCalledWith(VIDEO_EFFECT_PRESETS[1]);
    });

    it('should call onPresetApply when Black & White preset is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoEffectsSection {...defaultProps} />);

      const bwButton = screen.getByRole('button', { name: /Black & White/i });
      await user.click(bwButton);

      expect(mockHandlers.onPresetApply).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Black & White',
          effects: expect.objectContaining({
            saturation: 0,
          }),
        })
      );
    });

    it('should show preset descriptions on hover', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const vividButton = screen.getByRole('button', { name: /Vivid/i });
      expect(vividButton).toHaveAttribute('title', 'Enhanced colors and contrast');
    });
  });

  describe('Brightness Control', () => {
    it('should display current brightness value', () => {
      render(<VideoEffectsSection {...defaultProps} brightness={75} />);

      expect(screen.getByText('75%')).toBeInTheDocument();
    });

    it('should call onBrightnessChange when slider is moved', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[0]; // First slider is brightness
      fireEvent.change(slider, { target: { value: '150' } });

      expect(mockHandlers.onBrightnessChange).toHaveBeenCalledWith(150);
    });

    it('should allow brightness range from 0 to 200', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[0];
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '200');
    });

    it('should update displayed value when brightness prop changes', () => {
      const { rerender } = render(<VideoEffectsSection {...defaultProps} brightness={100} />);

      // Check initial brightness value (there may be multiple "100%" values)
      const brightnessSlider = screen.getAllByRole('slider')[0]; // First slider is brightness
      expect(brightnessSlider).toHaveValue('100');

      rerender(<VideoEffectsSection {...defaultProps} brightness={125} />);

      expect(screen.getByText('125%')).toBeInTheDocument();
      expect(brightnessSlider).toHaveValue('125');
    });
  });

  describe('Contrast Control', () => {
    it('should display current contrast value', () => {
      render(<VideoEffectsSection {...defaultProps} contrast={110} />);

      expect(screen.getByText('110%')).toBeInTheDocument();
    });

    it('should call onContrastChange when slider is moved', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[1]; // Second slider is contrast
      fireEvent.change(slider, { target: { value: '130' } });

      expect(mockHandlers.onContrastChange).toHaveBeenCalledWith(130);
    });

    it('should allow contrast range from 0 to 200', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[1];
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '200');
    });
  });

  describe('Saturation Control', () => {
    it('should display current saturation value', () => {
      render(<VideoEffectsSection {...defaultProps} saturation={85} />);

      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should call onSaturationChange when slider is moved', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[2]; // Third slider is saturation
      fireEvent.change(slider, { target: { value: '60' } });

      expect(mockHandlers.onSaturationChange).toHaveBeenCalledWith(60);
    });

    it('should allow saturation range from 0 to 200', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[2];
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '200');
    });
  });

  describe('Hue Rotation Control', () => {
    it('should display current hue value in degrees', () => {
      render(<VideoEffectsSection {...defaultProps} hue={180} />);

      expect(screen.getByText('180°')).toBeInTheDocument();
    });

    it('should call onHueChange when slider is moved', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[3]; // Fourth slider is hue
      fireEvent.change(slider, { target: { value: '270' } });

      expect(mockHandlers.onHueChange).toHaveBeenCalledWith(270);
    });

    it('should allow hue range from 0 to 360 degrees', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[3];
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '360');
    });
  });

  describe('Blur Control', () => {
    it('should display current blur value in pixels', () => {
      render(<VideoEffectsSection {...defaultProps} blur={2.5} />);

      expect(screen.getByText('2.5px')).toBeInTheDocument();
    });

    it('should call onBlurChange when slider is moved', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[4]; // Fifth slider is blur
      fireEvent.change(slider, { target: { value: '5' } });

      expect(mockHandlers.onBlurChange).toHaveBeenCalledWith(5);
    });

    it('should allow blur range from 0 to 20 pixels', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const slider = screen.getAllByRole('slider')[4];
      expect(slider).toHaveAttribute('min', '0');
      expect(slider).toHaveAttribute('max', '20');
      expect(slider).toHaveAttribute('step', '0.5');
    });

    it('should show "No blur" description when blur is 0', () => {
      render(<VideoEffectsSection {...defaultProps} blur={0} />);

      expect(screen.getByText('No blur')).toBeInTheDocument();
    });

    it('should show "Soft focus" description for blur < 5', () => {
      render(<VideoEffectsSection {...defaultProps} blur={3} />);

      expect(screen.getByText('Soft focus')).toBeInTheDocument();
    });

    it('should show "Medium blur" description for blur between 5 and 10', () => {
      render(<VideoEffectsSection {...defaultProps} blur={7} />);

      expect(screen.getByText('Medium blur')).toBeInTheDocument();
    });

    it('should show "Heavy blur" description for blur >= 10', () => {
      render(<VideoEffectsSection {...defaultProps} blur={15} />);

      expect(screen.getByText('Heavy blur')).toBeInTheDocument();
    });
  });

  describe('Reset Functionality', () => {
    it('should render reset button', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const resetButton = screen.getByRole('button', { name: /reset all/i });
      expect(resetButton).toBeInTheDocument();
    });

    it('should call onReset when reset button is clicked', async () => {
      const user = userEvent.setup();
      render(<VideoEffectsSection {...defaultProps} />);

      const resetButton = screen.getByRole('button', { name: /reset all/i });
      await user.click(resetButton);

      expect(mockHandlers.onReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have accessible labels for all controls', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      expect(screen.getByText('Brightness')).toBeInTheDocument();
      expect(screen.getByText('Contrast')).toBeInTheDocument();
      expect(screen.getByText('Saturation')).toBeInTheDocument();
      expect(screen.getByText('Hue Rotation')).toBeInTheDocument();
      expect(screen.getByText('Blur')).toBeInTheDocument();
    });

    it('should have proper button types', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });

    it('should have accessible preset buttons with titles', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      const vintageButton = screen.getByRole('button', { name: /Vintage/i });
      expect(vintageButton).toHaveAttribute('title', 'Warm, faded retro look');
    });

    it('should have accessible icon labels', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      expect(screen.getByLabelText('Normal')).toBeInTheDocument();
      expect(screen.getByLabelText('Vivid')).toBeInTheDocument();
    });
  });

  describe('Visual Feedback', () => {
    it('should render section headings', () => {
      render(<VideoEffectsSection {...defaultProps} />);

      expect(screen.getByText('Effect Presets')).toBeInTheDocument();
      expect(screen.getByText('Manual Adjustments')).toBeInTheDocument();
    });

    it('should display control icons', () => {
      const { container } = render(<VideoEffectsSection {...defaultProps} />);

      // Check for SVG icons (there should be several)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(5);
    });
  });
});
