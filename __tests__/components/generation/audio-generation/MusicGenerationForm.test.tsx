import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MusicGenerationForm } from '@/components/generation/audio-generation/MusicGenerationForm';

describe('MusicGenerationForm', () => {
  const mockSetPrompt = jest.fn();
  const mockSetStyle = jest.fn();
  const mockSetTitle = jest.fn();
  const mockSetCustomMode = jest.fn();
  const mockSetInstrumental = jest.fn();
  const mockOnSubmit = jest.fn();

  const defaultProps = {
    prompt: '',
    setPrompt: mockSetPrompt,
    style: '',
    setStyle: mockSetStyle,
    title: '',
    setTitle: mockSetTitle,
    customMode: false,
    setCustomMode: mockSetCustomMode,
    instrumental: false,
    setInstrumental: mockSetInstrumental,
    generating: false,
    taskId: null,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form element', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toBeInTheDocument();
    });

    it('should render prompt textarea', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Music Description *')).toBeInTheDocument();
    });

    it('should render title input', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Title (optional)')).toBeInTheDocument();
    });

    it('should render advanced settings button', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('should render generate button', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByText('Generate Music')).toBeInTheDocument();
    });
  });

  describe('Prompt Input', () => {
    it('should display current prompt value', () => {
      render(<MusicGenerationForm {...defaultProps} prompt="upbeat electronic music" />);

      const textarea = screen.getByLabelText('Music Description *') as HTMLTextAreaElement;
      expect(textarea.value).toBe('upbeat electronic music');
    });

    it('should call setPrompt when text changes', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Music Description *');
      fireEvent.change(textarea, { target: { value: 'rock music' } });

      expect(mockSetPrompt).toHaveBeenCalledWith('rock music');
    });

    it('should have correct placeholder in simple mode', () => {
      render(<MusicGenerationForm {...defaultProps} customMode={false} />);

      const textarea = screen.getByLabelText('Music Description *');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'An upbeat electronic track with synth melodies, perfect for a tech video'
      );
    });

    it('should have correct placeholder in custom mode', () => {
      render(<MusicGenerationForm {...defaultProps} customMode={true} />);

      const textarea = screen.getByLabelText('Lyrics / Description');
      expect(textarea).toHaveAttribute('placeholder', 'Enter your lyrics or description here...');
    });

    it('should change label in custom mode', () => {
      render(<MusicGenerationForm {...defaultProps} customMode={true} />);

      expect(screen.getByLabelText('Lyrics / Description')).toBeInTheDocument();
      expect(screen.queryByLabelText('Music Description *')).not.toBeInTheDocument();
    });

    it('should be required in simple mode', () => {
      render(<MusicGenerationForm {...defaultProps} customMode={false} />);

      const textarea = screen.getByLabelText('Music Description *') as HTMLTextAreaElement;
      expect(textarea.required).toBe(true);
    });

    it('should not be required in custom mode', () => {
      render(<MusicGenerationForm {...defaultProps} customMode={true} />);

      const textarea = screen.getByLabelText('Lyrics / Description') as HTMLTextAreaElement;
      expect(textarea.required).toBe(false);
    });

    it('should disable prompt when generating', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} />);

      const textarea = screen.getByLabelText('Music Description *');
      expect(textarea).toBeDisabled();
    });
  });

  describe('Title Input', () => {
    it('should display current title value', () => {
      render(<MusicGenerationForm {...defaultProps} title="My Song" />);

      const input = screen.getByLabelText('Title (optional)') as HTMLInputElement;
      expect(input.value).toBe('My Song');
    });

    it('should call setTitle when text changes', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText('Title (optional)');
      fireEvent.change(input, { target: { value: 'New Title' } });

      expect(mockSetTitle).toHaveBeenCalledWith('New Title');
    });

    it('should have correct placeholder', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const input = screen.getByLabelText('Title (optional)');
      expect(input).toHaveAttribute('placeholder', 'My Awesome Track');
    });

    it('should disable title when generating', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} />);

      const input = screen.getByLabelText('Title (optional)');
      expect(input).toBeDisabled();
    });
  });

  describe('Advanced Settings', () => {
    it('should toggle advanced settings on click', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const advancedButton = screen.getByText('Advanced Settings');

      // Initially collapsed
      expect(screen.queryByText('Generation Mode')).not.toBeInTheDocument();

      // Click to expand
      fireEvent.click(advancedButton);

      expect(screen.getByText('Generation Mode')).toBeInTheDocument();
    });

    it('should show "Show" text when collapsed', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByText('Show')).toBeInTheDocument();
    });

    it('should show "Hide" text when expanded', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      expect(screen.getByText('Hide')).toBeInTheDocument();
    });

    it('should rotate arrow icon when expanded', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} />);

      const advancedButton = screen.getByText('Advanced Settings');
      const icon = container.querySelector('.rotate-90');

      expect(icon).not.toBeInTheDocument();

      fireEvent.click(advancedButton);

      const rotatedIcon = container.querySelector('.rotate-90');
      expect(rotatedIcon).toBeInTheDocument();
    });
  });

  describe('Mode Selection', () => {
    beforeEach(() => {
      render(<MusicGenerationForm {...defaultProps} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);
    });

    it('should render mode radio buttons', () => {
      expect(screen.getByLabelText('Simple Mode')).toBeInTheDocument();
      expect(screen.getByLabelText('Custom Mode')).toBeInTheDocument();
    });

    it('should check simple mode by default', () => {
      const simpleRadio = screen.getByLabelText('Simple Mode') as HTMLInputElement;
      expect(simpleRadio.checked).toBe(true);
    });

    it('should check custom mode when customMode is true', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} customMode={true} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const customRadio = screen.getByLabelText('Custom Mode') as HTMLInputElement;
      expect(customRadio.checked).toBe(true);
    });

    it('should call setCustomMode(false) when simple mode clicked', () => {
      const simpleRadio = screen.getByLabelText('Simple Mode');
      fireEvent.change(simpleRadio, { target: { checked: true } });

      expect(mockSetCustomMode).toHaveBeenCalledWith(false);
    });

    it('should call setCustomMode(true) when custom mode clicked', () => {
      const customRadio = screen.getByLabelText('Custom Mode');
      fireEvent.change(customRadio, { target: { checked: true } });

      expect(mockSetCustomMode).toHaveBeenCalledWith(true);
    });

    it('should disable mode radios when generating', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} generating={true} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const simpleRadio = screen.getByLabelText('Simple Mode');
      const customRadio = screen.getByLabelText('Custom Mode');

      expect(simpleRadio).toBeDisabled();
      expect(customRadio).toBeDisabled();
    });
  });

  describe('Style Input (Custom Mode)', () => {
    beforeEach(() => {
      render(<MusicGenerationForm {...defaultProps} customMode={true} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);
    });

    it('should render style input in custom mode', () => {
      expect(screen.getByLabelText('Style / Genre *')).toBeInTheDocument();
    });

    it('should not render style input in simple mode', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} customMode={false} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      expect(screen.queryByLabelText('Style / Genre *')).not.toBeInTheDocument();
    });

    it('should display current style value', () => {
      const { container } = render(
        <MusicGenerationForm {...defaultProps} customMode={true} style="electronic, synth-pop" />
      );
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const input = screen.getByLabelText('Style / Genre *') as HTMLInputElement;
      expect(input.value).toBe('electronic, synth-pop');
    });

    it('should call setStyle when text changes', () => {
      const input = screen.getByLabelText('Style / Genre *');
      fireEvent.change(input, { target: { value: 'rock' } });

      expect(mockSetStyle).toHaveBeenCalledWith('rock');
    });

    it('should have correct placeholder', () => {
      const input = screen.getByLabelText('Style / Genre *');
      expect(input).toHaveAttribute('placeholder', 'electronic, synth-pop, upbeat');
    });

    it('should be required in custom mode', () => {
      const input = screen.getByLabelText('Style / Genre *') as HTMLInputElement;
      expect(input.required).toBe(true);
    });

    it('should disable style when generating', () => {
      const { container } = render(
        <MusicGenerationForm {...defaultProps} customMode={true} generating={true} />
      );
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const input = screen.getByLabelText('Style / Genre *');
      expect(input).toBeDisabled();
    });
  });

  describe('Instrumental Checkbox', () => {
    beforeEach(() => {
      render(<MusicGenerationForm {...defaultProps} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);
    });

    it('should render instrumental checkbox', () => {
      expect(screen.getByLabelText('Make instrumental (no vocals)')).toBeInTheDocument();
    });

    it('should be unchecked by default', () => {
      const checkbox = screen.getByLabelText('Make instrumental (no vocals)') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should be checked when instrumental is true', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} instrumental={true} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const checkbox = screen.getByLabelText('Make instrumental (no vocals)') as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should call setInstrumental when toggled', () => {
      const checkbox = screen.getByLabelText('Make instrumental (no vocals)');
      fireEvent.click(checkbox);

      expect(mockSetInstrumental).toHaveBeenCalledWith(true);
    });

    it('should disable checkbox when generating', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} generating={true} />);
      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const checkbox = screen.getByLabelText('Make instrumental (no vocals)');
      expect(checkbox).toBeDisabled();
    });
  });

  describe('Submit Button', () => {
    it('should call onSubmit when form submitted', () => {
      render(<MusicGenerationForm {...defaultProps} prompt="test music" />);

      const form = document.querySelector('form') as HTMLFormElement;
      fireEvent.submit(form);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should show generating text when generating', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('should show loading spinner when generating', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} generating={true} />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should disable button when generating', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} />);

      const button = screen.getByRole('button', { name: /Generating/i });
      expect(button).toBeDisabled();
    });

    it('should disable button when prompt is empty in simple mode', () => {
      render(<MusicGenerationForm {...defaultProps} prompt="" customMode={false} />);

      const button = screen.getByText('Generate Music');
      expect(button).toBeDisabled();
    });

    it('should disable button when style is empty in custom mode', () => {
      render(
        <MusicGenerationForm
          {...defaultProps}
          prompt="test"
          style=""
          customMode={true}
        />
      );

      const button = screen.getByText('Generate Music');
      expect(button).toBeDisabled();
    });

    it('should enable button when all required fields filled in simple mode', () => {
      render(<MusicGenerationForm {...defaultProps} prompt="test music" customMode={false} />);

      const button = screen.getByText('Generate Music');
      expect(button).not.toBeDisabled();
    });

    it('should enable button when all required fields filled in custom mode', () => {
      render(
        <MusicGenerationForm
          {...defaultProps}
          prompt="test"
          style="rock"
          customMode={true}
        />
      );

      const button = screen.getByText('Generate Music');
      expect(button).not.toBeDisabled();
    });

    it('should trim whitespace for validation', () => {
      render(<MusicGenerationForm {...defaultProps} prompt="   " customMode={false} />);

      const button = screen.getByText('Generate Music');
      expect(button).toBeDisabled();
    });
  });

  describe('Progress Message', () => {
    it('should not show progress message when not generating', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.queryByText(/Generation in progress/)).not.toBeInTheDocument();
    });

    it('should show progress message when generating with taskId', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} taskId="task-123" />);

      expect(screen.getByText(/Generation in progress/)).toBeInTheDocument();
    });

    it('should not show progress message when generating without taskId', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} taskId={null} />);

      expect(screen.queryByText(/Generation in progress/)).not.toBeInTheDocument();
    });

    it('should inform user they can navigate away', () => {
      render(<MusicGenerationForm {...defaultProps} generating={true} taskId="task-123" />);

      expect(screen.getByText(/You can navigate away/)).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have gradient button styling', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const button = screen.getByText('Generate Music');
      expect(button).toHaveClass('bg-gradient-to-r', 'from-purple-500', 'to-pink-500');
    });

    it('should have proper form spacing', () => {
      const { container } = render(<MusicGenerationForm {...defaultProps} />);

      const form = container.querySelector('form');
      expect(form).toHaveClass('space-y-4');
    });

    it('should have rounded borders on inputs', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const textarea = screen.getByLabelText('Music Description *');
      expect(textarea).toHaveClass('rounded-lg');
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Music Description *')).toBeInTheDocument();
      expect(screen.getByLabelText('Title (optional)')).toBeInTheDocument();
    });

    it('should have submit button type', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const button = screen.getByText('Generate Music');
      expect(button).toHaveAttribute('type', 'submit');
    });

    it('should have proper button type for advanced toggle', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const advancedButton = screen.getByText('Advanced Settings');
      expect(advancedButton).toHaveAttribute('type', 'button');
    });

    it('should have help text for inputs', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      expect(screen.getByText('Describe the music you want to generate')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long prompt', () => {
      const longPrompt = 'A'.repeat(5000);
      render(<MusicGenerationForm {...defaultProps} prompt={longPrompt} />);

      const textarea = screen.getByLabelText('Music Description *') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longPrompt);
    });

    it('should handle special characters in inputs', () => {
      render(
        <MusicGenerationForm
          {...defaultProps}
          prompt="Music with ♪ ♫ symbols"
          title="Song #1 - 'Test'"
          style="rock & roll"
        />
      );

      expect(screen.getByLabelText('Music Description *')).toHaveValue("Music with ♪ ♫ symbols");
      expect(screen.getByLabelText('Title (optional)')).toHaveValue("Song #1 - 'Test'");
    });

    it('should handle rapid mode switching', () => {
      render(<MusicGenerationForm {...defaultProps} />);

      const advancedButton = screen.getByText('Advanced Settings');
      fireEvent.click(advancedButton);

      const simpleRadio = screen.getByLabelText('Simple Mode');
      const customRadio = screen.getByLabelText('Custom Mode');

      fireEvent.change(customRadio);
      fireEvent.change(simpleRadio);
      fireEvent.change(customRadio);

      expect(mockSetCustomMode).toHaveBeenCalledTimes(3);
    });
  });
});
