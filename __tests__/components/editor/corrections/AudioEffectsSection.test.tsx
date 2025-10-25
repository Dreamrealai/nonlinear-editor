import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioEffectsSection } from '@/components/editor/corrections/AudioEffectsSection';

describe('AudioEffectsSection', () => {
  const mockOnBassGainChange = jest.fn();
  const mockOnMidGainChange = jest.fn();
  const mockOnTrebleGainChange = jest.fn();
  const mockOnCompressionChange = jest.fn();
  const mockOnAudioUpdate = jest.fn();
  const mockOnReset = jest.fn();

  const defaultProps = {
    volume: 0,
    mute: false,
    fadeIn: 0,
    fadeOut: 0,
    bassGain: 0,
    midGain: 0,
    trebleGain: 0,
    compression: 0,
    normalize: false,
    onVolumeChange: jest.fn(),
    onFadeInChange: jest.fn(),
    onFadeOutChange: jest.fn(),
    onBassGainChange: mockOnBassGainChange,
    onMidGainChange: mockOnMidGainChange,
    onTrebleGainChange: mockOnTrebleGainChange,
    onCompressionChange: mockOnCompressionChange,
    onAudioUpdate: mockOnAudioUpdate,
    onReset: mockOnReset,
  };

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  afterEach(async (): Promise<void> => {
    cleanup();
    // Wait for any pending async operations to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
  });

  describe('Rendering', () => {
    // Arrange - Act - Assert
    it('should render 3-band equalizer section', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('3-Band Equalizer')).toBeInTheDocument();
    });

    it('should render all equalizer bands', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Bass')).toBeInTheDocument();
      expect(screen.getByText('Mid')).toBeInTheDocument();
      expect(screen.getByText('Treble')).toBeInTheDocument();
    });

    it('should display frequency ranges for each band', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('100-400 Hz')).toBeInTheDocument();
      expect(screen.getByText('400-4000 Hz')).toBeInTheDocument();
      expect(screen.getByText('4000+ Hz')).toBeInTheDocument();
    });

    it('should render compression control', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Compression')).toBeInTheDocument();
    });

    it('should render normalization control', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Auto-Normalize')).toBeInTheDocument();
    });

    it('should render reset button', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Reset All')).toBeInTheDocument();
    });
  });

  describe('Value Display', () => {
    it('should display bass gain with dB unit and sign', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={3} />);

      // Assert
      expect(screen.getByText('+3 dB')).toBeInTheDocument();
    });

    it('should display negative bass gain without extra minus sign', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={-6} />);

      // Assert
      expect(screen.getByText('-6 dB')).toBeInTheDocument();
    });

    it('should display zero gain without sign', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={0} />);

      // Assert - Use getAllByText since all gains default to 0
      const zeroDbElements = screen.getAllByText('0 dB');
      expect(zeroDbElements.length).toBeGreaterThan(0);
      expect(zeroDbElements[0]).toBeInTheDocument();
    });

    it('should display mid gain with dB unit', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} midGain={4.5} />);

      // Assert
      expect(screen.getByText('+4.5 dB')).toBeInTheDocument();
    });

    it('should display treble gain with dB unit', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} trebleGain={-3} />);

      // Assert
      expect(screen.getByText('-3 dB')).toBeInTheDocument();
    });

    it('should display compression with percentage', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} compression={50} />);

      // Assert
      expect(screen.getByText('50%')).toBeInTheDocument();
    });
  });

  describe('Slider Controls', () => {
    it('should have bass gain slider with correct range (-12 to +12 dB)', () => {
      // Arrange & Act
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const bassSlider = sliders[0];

      // Assert
      expect(bassSlider).toHaveAttribute('min', '-12');
      expect(bassSlider).toHaveAttribute('max', '12');
      expect(bassSlider).toHaveAttribute('step', '0.5');
    });

    it('should have mid gain slider with correct range', () => {
      // Arrange & Act
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const midSlider = sliders[1];

      // Assert
      expect(midSlider).toHaveAttribute('min', '-12');
      expect(midSlider).toHaveAttribute('max', '12');
      expect(midSlider).toHaveAttribute('step', '0.5');
    });

    it('should have treble gain slider with correct range', () => {
      // Arrange & Act
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const trebleSlider = sliders[2];

      // Assert
      expect(trebleSlider).toHaveAttribute('min', '-12');
      expect(trebleSlider).toHaveAttribute('max', '12');
      expect(trebleSlider).toHaveAttribute('step', '0.5');
    });

    it('should have compression slider with correct range (0-100%)', () => {
      // Arrange & Act
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const compressionSlider = sliders[3];

      // Assert
      expect(compressionSlider).toHaveAttribute('min', '0');
      expect(compressionSlider).toHaveAttribute('max', '100');
    });
  });

  describe('User Interactions', () => {
    it('should call onBassGainChange when bass slider changes', () => {
      // Arrange
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const bassSlider = sliders[0];

      // Act
      fireEvent.change(bassSlider, { target: { value: '6' } });

      // Assert
      expect(mockOnBassGainChange).toHaveBeenCalledWith(6);
    });

    it('should call onMidGainChange when mid slider changes', () => {
      // Arrange
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const midSlider = sliders[1];

      // Act
      fireEvent.change(midSlider, { target: { value: '3.5' } });

      // Assert
      expect(mockOnMidGainChange).toHaveBeenCalledWith(3.5);
    });

    it('should call onTrebleGainChange when treble slider changes', () => {
      // Arrange
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const trebleSlider = sliders[2];

      // Act
      fireEvent.change(trebleSlider, { target: { value: '-4.5' } });

      // Assert
      expect(mockOnTrebleGainChange).toHaveBeenCalledWith(-4.5);
    });

    it('should call onCompressionChange when compression slider changes', () => {
      // Arrange
      const { container } = render(<AudioEffectsSection {...defaultProps} />);
      const sliders = container.querySelectorAll('input[type="range"]');
      const compressionSlider = sliders[3];

      // Act
      fireEvent.change(compressionSlider, { target: { value: '75' } });

      // Assert
      expect(mockOnCompressionChange).toHaveBeenCalledWith(75);
    });

    it('should call onAudioUpdate when normalize is toggled on', () => {
      // Arrange
      render(<AudioEffectsSection {...defaultProps} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Act
      fireEvent.click(normalizeCheckbox);

      // Assert
      expect(mockOnAudioUpdate).toHaveBeenCalledWith({ normalize: true });
    });

    it('should call onAudioUpdate when normalize is toggled off', () => {
      // Arrange
      render(<AudioEffectsSection {...defaultProps} normalize={true} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Act
      fireEvent.click(normalizeCheckbox);

      // Assert
      expect(mockOnAudioUpdate).toHaveBeenCalledWith({ normalize: false });
    });

    it('should call onReset when reset button is clicked', () => {
      // Arrange
      render(<AudioEffectsSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Act
      fireEvent.click(resetButton);

      // Assert
      expect(mockOnReset).toHaveBeenCalledTimes(1);
    });
  });

  describe('Normalize Checkbox State', () => {
    it('should show normalize as unchecked when false', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} normalize={false} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Assert
      expect(normalizeCheckbox).not.toBeChecked();
    });

    it('should show normalize as checked when true', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} normalize={true} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Assert
      expect(normalizeCheckbox).toBeChecked();
    });
  });

  describe('Edge Cases', () => {
    it('should handle maximum bass gain (+12 dB)', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={12} />);

      // Assert
      expect(screen.getByText('+12 dB')).toBeInTheDocument();
    });

    it('should handle minimum bass gain (-12 dB)', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={-12} />);

      // Assert
      expect(screen.getByText('-12 dB')).toBeInTheDocument();
    });

    it('should handle maximum compression (100%)', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} compression={100} />);

      // Assert
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should handle minimum compression (0%)', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} compression={0} />);

      // Assert
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should handle fractional gain values', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} bassGain={2.5} />);

      // Assert
      expect(screen.getByText('+2.5 dB')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper button type for reset', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);
      const resetButton = screen.getByText('Reset All');

      // Assert
      expect(resetButton).toHaveAttribute('type', 'button');
    });

    it('should have aria-label for normalize checkbox', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Assert
      expect(normalizeCheckbox).toHaveAttribute('aria-label', 'Auto-normalize audio');
    });

    it('should have proper id for normalize checkbox', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);
      const normalizeCheckbox = screen.getByLabelText('Auto-normalize audio');

      // Assert
      expect(normalizeCheckbox).toHaveAttribute('id', 'audio-normalize');
    });
  });

  describe('Informational Text', () => {
    it('should show compression description', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Reduces dynamic range for consistent volume')).toBeInTheDocument();
    });

    it('should show normalize description', () => {
      // Arrange & Act
      render(<AudioEffectsSection {...defaultProps} />);

      // Assert
      expect(screen.getByText('Adjust peak volume to -3dB')).toBeInTheDocument();
    });
  });
});
