import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VoiceGenerationForm } from '@/components/generation/audio-generation/VoiceGenerationForm';

// Mock VoiceSelector component
jest.mock('@/components/generation/audio-generation/VoiceSelector', () => ({
  VoiceSelector: ({
    voices,
    selectedVoice,
    onVoiceChange,
    loadingVoices,
    disabled,
  }: {
    voices: Array<{ voice_id: string; name: string; category?: string }>;
    selectedVoice: string;
    onVoiceChange: (id: string) => void;
    loadingVoices: boolean;
    disabled?: boolean;
  }) => (
    <div data-testid="voice-selector">
      <label htmlFor="voice-select">Voice Selection</label>
      {loadingVoices ? (
        <div>Loading voices...</div>
      ) : (
        <select
          id="voice-select"
          value={selectedVoice}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={disabled}
        >
          {voices.map((voice) => (
            <option key={voice.voice_id} value={voice.voice_id}>
              {voice.name}
            </option>
          ))}
        </select>
      )}
    </div>
  ),
}));

describe('VoiceGenerationForm', () => {
  const mockSetVoiceText = jest.fn();
  const mockSetSelectedVoice = jest.fn();
  const mockOnSubmit = jest.fn();

  const mockVoices = [
    { voice_id: 'voice-1', name: 'Sarah', category: 'Female' },
    { voice_id: 'voice-2', name: 'John', category: 'Male' },
  ];

  const defaultProps = {
    voiceText: '',
    setVoiceText: mockSetVoiceText,
    voices: mockVoices,
    selectedVoice: 'voice-1',
    setSelectedVoice: mockSetSelectedVoice,
    loadingVoices: false,
    generating: false,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form element', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should render text input textarea', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Text to Convert to Speech *')).toBeInTheDocument();
    });

    it('should render VoiceSelector component', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(screen.getByTestId('voice-selector')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(screen.getByText('Generate Voice')).toBeInTheDocument();
    });

    it('should have proper form spacing', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-4');
    });
  });

  describe('Text Input', () => {
    it('should display current text value', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="Hello world" />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Hello world');
    });

    it('should call setVoiceText when text changes', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      fireEvent.change(textarea, { target: { value: 'New text content' } });

      expect(mockSetVoiceText).toHaveBeenCalledWith('New text content');
    });

    it('should have correct placeholder', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Enter the text you want to convert to speech...'
      );
    });

    it('should have 6 rows', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(6);
    });

    it('should be required', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.required).toBe(true);
    });

    it('should disable textarea when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      expect(textarea).toBeDisabled();
    });

    it('should have help text', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(
        screen.getByText('Enter the text you want to convert to natural-sounding speech')
      ).toBeInTheDocument();
    });
  });

  describe('Voice Selection', () => {
    it('should pass voices to VoiceSelector', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const voiceOptions = screen.getAllByRole('option');
      expect(voiceOptions).toHaveLength(2);
      expect(voiceOptions[0]).toHaveTextContent('Sarah');
      expect(voiceOptions[1]).toHaveTextContent('John');
    });

    it('should pass selected voice to VoiceSelector', () => {
      render(<VoiceGenerationForm {...defaultProps} selectedVoice="voice-2" />);

      const select = screen.getByLabelText('Voice Selection') as HTMLSelectElement;
      expect(select.value).toBe('voice-2');
    });

    it('should call setSelectedVoice when voice changes', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const select = screen.getByLabelText('Voice Selection');
      fireEvent.change(select, { target: { value: 'voice-2' } });

      expect(mockSetSelectedVoice).toHaveBeenCalledWith('voice-2');
    });

    it('should pass loading state to VoiceSelector', () => {
      render(<VoiceGenerationForm {...defaultProps} loadingVoices={true} />);

      expect(screen.getByText('Loading voices...')).toBeInTheDocument();
    });

    it('should disable VoiceSelector when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      const select = screen.getByLabelText('Voice Selection');
      expect(select).toBeDisabled();
    });
  });

  describe('Submit Button', () => {
    it('should call onSubmit when form submitted', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="test text" />);

      const form = document.querySelector('form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should show generating text when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should show loading spinner when generating', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      const button = screen.getByRole('button', { name: /Generating/i });
      expect(button).toBeDisabled();
    });

    it('should disable button when text is empty', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="" />);

      const button = screen.getByText('Generate Voice');
      expect(button).toBeDisabled();
    });

    it('should disable button when text is only whitespace', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="   " />);

      const button = screen.getByText('Generate Voice');
      expect(button).toBeDisabled();
    });

    it('should enable button when text is provided', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="Hello world" />);

      const button = screen.getByText('Generate Voice');
      expect(button).not.toBeDisabled();
    });

    it('should have submit type', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const button = screen.getByText('Generate Voice');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should display microphone icon', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  describe('Progress Message', () => {
    it('should not show progress message when not generating', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(screen.queryByText(/Generating voice/)).not.toBeInTheDocument();
    });

    it('should show progress message when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      expect(screen.getByText('Generating voice... This should take just a few seconds.')).toBeInTheDocument();
    });

    it('should inform about expected duration', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      expect(screen.getByText(/few seconds/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have gradient button styling', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const button = screen.getByText('Generate Voice');
      expect(button).toHaveClass('bg-gradient-to-r', 'from-blue-500', 'to-cyan-500');
    });

    it('should have rounded borders on textarea', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      expect(textarea).toHaveClass('rounded-lg');
    });

    it('should have shadow on cards', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const cards = container.querySelectorAll('.shadow-sm');
      expect(cards.length).toBeGreaterThan(0);
    });

    it('should have transition effects on button', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const button = screen.getByText('Generate Voice');
      expect(button).toHaveClass('transition-all');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label association for textarea', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      expect(textarea).toBeInTheDocument();
    });

    it('should have asterisk indicating required field', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      expect(screen.getByText(/Text to Convert to Speech \*/)).toBeInTheDocument();
    });

    it('should have descriptive help text', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const helpText = screen.getByText(
        'Enter the text you want to convert to natural-sounding speech'
      );
      expect(helpText).toHaveClass('text-xs', 'text-neutral-500');
    });

    it('should have disabled cursor styling when button is disabled', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="" />);

      const button = screen.getByText('Generate Voice');
      expect(button).toHaveClass('disabled:cursor-not-allowed');
    });

    it('should properly disable all inputs when generating', () => {
      render(<VoiceGenerationForm {...defaultProps} generating={true} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      const select = screen.getByLabelText('Voice Selection');
      const button = screen.getByRole('button', { name: /Generating/i });

      expect(textarea).toBeDisabled();
      expect(select).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });

  describe('Layout', () => {
    it('should render sections in correct order', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const sections = container.querySelectorAll('.rounded-lg.border');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('should have proper spacing between sections', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-4');
    });

    it('should have flex layout for submit section', () => {
      const { container } = render(<VoiceGenerationForm {...defaultProps} />);

      const submitSection = container.querySelector('.flex.items-center.justify-between');
      expect(submitSection).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long text input', () => {
      const longText = 'A'.repeat(10000);
      render(<VoiceGenerationForm {...defaultProps} voiceText={longText} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longText);
    });

    it('should handle special characters in text', () => {
      const specialText = "Hello! How's it going? 50% off! €£$¥";
      render(<VoiceGenerationForm {...defaultProps} voiceText={specialText} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe(specialText);
    });

    it('should handle unicode characters', () => {
      const unicodeText = '你好 🌍 مرحبا';
      render(<VoiceGenerationForm {...defaultProps} voiceText={unicodeText} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe(unicodeText);
    });

    it('should handle newlines in text', () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      render(<VoiceGenerationForm {...defaultProps} voiceText={multilineText} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe(multilineText);
    });

    it('should handle empty voices array', () => {
      render(<VoiceGenerationForm {...defaultProps} voices={[]} />);

      const voiceOptions = screen.queryAllByRole('option');
      expect(voiceOptions).toHaveLength(0);
    });

    it('should handle rapid text changes', () => {
      render(<VoiceGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Text to Convert to Speech *');

      fireEvent.change(textarea, { target: { value: 'First' } });
      fireEvent.change(textarea, { target: { value: 'Second' } });
      fireEvent.change(textarea, { target: { value: 'Third' } });

      expect(mockSetVoiceText).toHaveBeenCalledTimes(3);
      expect(mockSetVoiceText).toHaveBeenLastCalledWith('Third');
    });
  });

  describe('Form Validation', () => {
    it('should allow submission with valid text', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="Valid text" />);

      const form = document.querySelector('form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should not allow submission with empty text via button disabled state', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="" />);

      const button = screen.getByText('Generate Voice');
      expect(button).toBeDisabled();

      fireEvent.click(button);

      // onSubmit should not be called due to button being disabled
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('should trim whitespace for validation', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="   \n   " />);

      const button = screen.getByText('Generate Voice');
      expect(button).toBeDisabled();
    });

    it('should allow text with leading/trailing whitespace if there is content', () => {
      render(<VoiceGenerationForm {...defaultProps} voiceText="  hello  " />);

      const button = screen.getByText('Generate Voice');
      expect(button).not.toBeDisabled();
    });
  });

  describe('Component Updates', () => {
    it('should update when voiceText prop changes', () => {
      const { rerender } = render(<VoiceGenerationForm {...defaultProps} voiceText="First" />);

      let textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe('First');

      rerender(<VoiceGenerationForm {...defaultProps} voiceText="Second" />);

      textarea = screen.getByLabelText('Text to Convert to Speech *') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Second');
    });

    it('should update when generating state changes', () => {
      const { rerender } = render(<VoiceGenerationForm {...defaultProps} generating={false} />);

      expect(screen.getByText('Generate Voice')).toBeInTheDocument();

      rerender(<VoiceGenerationForm {...defaultProps} generating={true} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should update when voices prop changes', () => {
      const { rerender } = render(<VoiceGenerationForm {...defaultProps} voices={mockVoices} />);

      let voiceOptions = screen.getAllByRole('option');
      expect(voiceOptions).toHaveLength(2);

      const newVoices = [
        { voice_id: 'voice-3', name: 'Emma', category: 'Female' },
      ];

      rerender(<VoiceGenerationForm {...defaultProps} voices={newVoices} />);

      voiceOptions = screen.getAllByRole('option');
      expect(voiceOptions).toHaveLength(1);
      expect(voiceOptions[0]).toHaveTextContent('Emma');
    });

    it('should update when loadingVoices state changes', () => {
      const { rerender } = render(<VoiceGenerationForm {...defaultProps} loadingVoices={false} />);

      expect(screen.queryByText('Loading voices...')).not.toBeInTheDocument();

      rerender(<VoiceGenerationForm {...defaultProps} loadingVoices={true} />);

      expect(screen.getByText('Loading voices...')).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should handle full generation flow', () => {
      const { rerender } = render(<VoiceGenerationForm {...defaultProps} />);

      // Enter text
      const textarea = screen.getByLabelText('Text to Convert to Speech *');
      fireEvent.change(textarea, { target: { value: 'Test speech' } });

      expect(mockSetVoiceText).toHaveBeenCalledWith('Test speech');

      // Select voice
      const select = screen.getByLabelText('Voice Selection');
      fireEvent.change(select, { target: { value: 'voice-2' } });

      expect(mockSetSelectedVoice).toHaveBeenCalledWith('voice-2');

      // Update props to reflect state changes
      rerender(
        <VoiceGenerationForm
          {...defaultProps}
          voiceText="Test speech"
          selectedVoice="voice-2"
        />
      );

      // Submit form
      const form = document.querySelector('form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });
});
