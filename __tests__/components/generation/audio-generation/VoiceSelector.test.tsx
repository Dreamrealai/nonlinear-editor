import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceSelector } from '@/components/generation/audio-generation/VoiceSelector';

describe('VoiceSelector', () => {
  const mockOnVoiceChange = jest.fn();

  const mockVoices = [
    { voice_id: 'voice-1', name: 'Sarah', category: 'Female' },
    { voice_id: 'voice-2', name: 'John', category: 'Male' },
    { voice_id: 'voice-3', name: 'Alex' }, // No category
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render voice selector container', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByLabelText('Voice Selection')).toBeInTheDocument();
    });

    it('should render label', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText('Voice Selection')).toBeInTheDocument();
    });

    it('should render help text', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText('Select a voice for your text-to-speech generation')).toBeInTheDocument();
    });

    it('should have proper styling classes', () => {
      const { container } = render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-lg', 'border', 'border-neutral-200', 'bg-white', 'p-6', 'shadow-sm');
    });
  });

  describe('Loading State', () => {
    it('should show loading spinner when loading', () => {
      render(
        <VoiceSelector
          voices={[]}
          selectedVoice=""
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={true}
        />
      );

      expect(screen.getByText('Loading voices...')).toBeInTheDocument();
    });

    it('should show loading animation', () => {
      const { container } = render(
        <VoiceSelector
          voices={[]}
          selectedVoice=""
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={true}
        />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should not show select when loading', () => {
      render(
        <VoiceSelector
          voices={[]}
          selectedVoice=""
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={true}
        />
      );

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });
  });

  describe('Voice Options', () => {
    it('should render all voices in select', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const options = Array.from(select.options);

      expect(options).toHaveLength(3);
      expect(options[0].value).toBe('voice-1');
      expect(options[1].value).toBe('voice-2');
      expect(options[2].value).toBe('voice-3');
    });

    it('should display voice names', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText(/Sarah/)).toBeInTheDocument();
      expect(screen.getByText(/John/)).toBeInTheDocument();
      expect(screen.getByText('Alex')).toBeInTheDocument();
    });

    it('should display category when available', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText(/Female/)).toBeInTheDocument();
      expect(screen.getByText(/Male/)).toBeInTheDocument();
    });

    it('should not display category separator when category is missing', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-3"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      const alexOption = Array.from(select.options).find(opt => opt.value === 'voice-3');

      expect(alexOption?.textContent).toBe('Alex');
      expect(alexOption?.textContent).not.toContain(' - ');
    });

    it('should show default voice when no voices loaded', () => {
      render(
        <VoiceSelector
          voices={[]}
          selectedVoice="EXAVITQu4vr4xnSDxMaL"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText('Sarah (Default)')).toBeInTheDocument();
    });
  });

  describe('Selection', () => {
    it('should have correct voice selected', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-2"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('voice-2');
    });

    it('should call onVoiceChange when selection changes', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'voice-2' } });

      expect(mockOnVoiceChange).toHaveBeenCalledWith('voice-2');
      expect(mockOnVoiceChange).toHaveBeenCalledTimes(1);
    });

    it('should allow changing to different voices', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');

      fireEvent.change(select, { target: { value: 'voice-2' } });
      expect(mockOnVoiceChange).toHaveBeenCalledWith('voice-2');

      fireEvent.change(select, { target: { value: 'voice-3' } });
      expect(mockOnVoiceChange).toHaveBeenCalledWith('voice-3');

      expect(mockOnVoiceChange).toHaveBeenCalledTimes(2);
    });
  });

  describe('Disabled State', () => {
    it('should disable select when disabled prop is true', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toBeDisabled();
    });

    it('should not disable select when disabled prop is false', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
          disabled={false}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).not.toBeDisabled();
    });

    it('should not call onVoiceChange when disabled', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'voice-2' } });

      expect(mockOnVoiceChange).not.toHaveBeenCalled();
    });

    it('should have disabled cursor styling when disabled', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
          disabled={true}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('disabled:cursor-not-allowed');
      expect(select).toHaveClass('disabled:opacity-50');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByLabelText('Voice Selection');
      expect(select).toBeInTheDocument();
    });

    it('should have combobox role', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');
      select.focus();

      expect(document.activeElement).toBe(select);
    });

    it('should have descriptive help text', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const helpText = screen.getByText('Select a voice for your text-to-speech generation');
      expect(helpText).toHaveClass('text-xs', 'text-neutral-500');
    });
  });

  describe('Styling', () => {
    it('should have proper select styling', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass(
        'w-full',
        'rounded-lg',
        'border',
        'border-neutral-300',
        'px-4',
        'py-3',
        'text-sm',
        'text-neutral-900'
      );
    });

    it('should have focus styles', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass(
        'focus:border-blue-500',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-blue-500/20'
      );
    });

    it('should have transition styles', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox');
      expect(select).toHaveClass('transition-colors');
    });

    it('should have proper label styling', () => {
      render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const label = screen.getByText('Voice Selection');
      expect(label).toHaveClass('text-sm', 'font-semibold', 'text-neutral-900', 'mb-2');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty voices array gracefully', () => {
      render(
        <VoiceSelector
          voices={[]}
          selectedVoice="EXAVITQu4vr4xnSDxMaL"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.options).toHaveLength(1);
      expect(select.options[0].textContent).toBe('Sarah (Default)');
    });

    it('should handle voices without categories', () => {
      const voicesNoCategory = [
        { voice_id: 'voice-1', name: 'Voice1' },
        { voice_id: 'voice-2', name: 'Voice2' },
      ];

      render(
        <VoiceSelector
          voices={voicesNoCategory}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText('Voice1')).toBeInTheDocument();
      expect(screen.getByText('Voice2')).toBeInTheDocument();
    });

    it('should handle very long voice names', () => {
      const longNameVoice = [
        {
          voice_id: 'voice-long',
          name: 'This is a very long voice name that might cause layout issues',
          category: 'Test',
        },
      ];

      render(
        <VoiceSelector
          voices={longNameVoice}
          selectedVoice="voice-long"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText(/This is a very long voice name/)).toBeInTheDocument();
    });

    it('should handle special characters in voice names', () => {
      const specialVoices = [
        { voice_id: 'voice-1', name: "O'Brien", category: 'Irish' },
        { voice_id: 'voice-2', name: 'José', category: 'Spanish' },
      ];

      render(
        <VoiceSelector
          voices={specialVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText(/O'Brien/)).toBeInTheDocument();
      expect(screen.getByText(/José/)).toBeInTheDocument();
    });
  });

  describe('Component Updates', () => {
    it('should update when voices prop changes', () => {
      const { rerender } = render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      const newVoices = [
        { voice_id: 'voice-4', name: 'Emma', category: 'Female' },
        { voice_id: 'voice-5', name: 'Tom', category: 'Male' },
      ];

      rerender(
        <VoiceSelector
          voices={newVoices}
          selectedVoice="voice-4"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.getByText(/Emma/)).toBeInTheDocument();
      expect(screen.getByText(/Tom/)).toBeInTheDocument();
      expect(screen.queryByText(/Sarah/)).not.toBeInTheDocument();
    });

    it('should update selected voice when prop changes', () => {
      const { rerender } = render(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      let select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('voice-1');

      rerender(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-2"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('voice-2');
    });

    it('should transition between loading and loaded states', () => {
      const { rerender } = render(
        <VoiceSelector
          voices={[]}
          selectedVoice=""
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={true}
        />
      );

      expect(screen.getByText('Loading voices...')).toBeInTheDocument();

      rerender(
        <VoiceSelector
          voices={mockVoices}
          selectedVoice="voice-1"
          onVoiceChange={mockOnVoiceChange}
          loadingVoices={false}
        />
      );

      expect(screen.queryByText('Loading voices...')).not.toBeInTheDocument();
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });
});
