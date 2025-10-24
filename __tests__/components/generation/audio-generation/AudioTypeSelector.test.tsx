import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AudioTypeSelector } from '@/components/generation/audio-generation/AudioTypeSelector';

describe('AudioTypeSelector', () => {
  const mockOnTypeChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all three audio type buttons', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      expect(screen.getByText('Music (Suno)')).toBeInTheDocument();
      expect(screen.getByText('Voice (ElevenLabs)')).toBeInTheDocument();
      expect(screen.getByText('Sound Effects')).toBeInTheDocument();
    });

    it('should have three buttons', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should render buttons with correct type attribute', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Music Selection', () => {
    it('should highlight music button when music is selected', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      expect(musicButton).toHaveClass('bg-neutral-900');
      expect(musicButton).toHaveClass('text-white');
    });

    it('should not highlight other buttons when music is selected', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');
      const sfxButton = screen.getByText('Sound Effects');

      expect(voiceButton).toHaveClass('text-neutral-600');
      expect(sfxButton).toHaveClass('text-neutral-600');
    });

    it('should call onTypeChange with music when music button clicked', () => {
      render(<AudioTypeSelector audioType="voice" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      fireEvent.click(musicButton);

      expect(mockOnTypeChange).toHaveBeenCalledWith('music');
      expect(mockOnTypeChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Voice Selection', () => {
    it('should highlight voice button when voice is selected', () => {
      render(<AudioTypeSelector audioType="voice" onTypeChange={mockOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');
      expect(voiceButton).toHaveClass('bg-neutral-900');
      expect(voiceButton).toHaveClass('text-white');
    });

    it('should not highlight other buttons when voice is selected', () => {
      render(<AudioTypeSelector audioType="voice" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      const sfxButton = screen.getByText('Sound Effects');

      expect(musicButton).toHaveClass('text-neutral-600');
      expect(sfxButton).toHaveClass('text-neutral-600');
    });

    it('should call onTypeChange with voice when voice button clicked', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');
      fireEvent.click(voiceButton);

      expect(mockOnTypeChange).toHaveBeenCalledWith('voice');
      expect(mockOnTypeChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('SFX Selection', () => {
    it('should highlight sfx button when sfx is selected', () => {
      render(<AudioTypeSelector audioType="sfx" onTypeChange={mockOnTypeChange} />);

      const sfxButton = screen.getByText('Sound Effects');
      expect(sfxButton).toHaveClass('bg-neutral-900');
      expect(sfxButton).toHaveClass('text-white');
    });

    it('should not highlight other buttons when sfx is selected', () => {
      render(<AudioTypeSelector audioType="sfx" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      const voiceButton = screen.getByText('Voice (ElevenLabs)');

      expect(musicButton).toHaveClass('text-neutral-600');
      expect(voiceButton).toHaveClass('text-neutral-600');
    });

    it('should call onTypeChange with sfx when sfx button clicked', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const sfxButton = screen.getByText('Sound Effects');
      fireEvent.click(sfxButton);

      expect(mockOnTypeChange).toHaveBeenCalledWith('sfx');
      expect(mockOnTypeChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('Interactions', () => {
    it('should allow switching between types', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      // Click voice
      fireEvent.click(screen.getByText('Voice (ElevenLabs)'));
      expect(mockOnTypeChange).toHaveBeenCalledWith('voice');

      // Click sfx
      fireEvent.click(screen.getByText('Sound Effects'));
      expect(mockOnTypeChange).toHaveBeenCalledWith('sfx');

      // Click music
      fireEvent.click(screen.getByText('Music (Suno)'));
      expect(mockOnTypeChange).toHaveBeenCalledWith('music');

      expect(mockOnTypeChange).toHaveBeenCalledTimes(3);
    });

    it('should not prevent clicking already selected type', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      fireEvent.click(musicButton);

      expect(mockOnTypeChange).toHaveBeenCalledWith('music');
    });
  });

  describe('Visual States', () => {
    it('should apply shadow to selected button', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      expect(musicButton).toHaveClass('shadow-sm');
    });

    it('should have hover styles on unselected buttons', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');
      expect(voiceButton).toHaveClass('hover:text-neutral-900');
    });

    it('should have transition styles on all buttons', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('transition-all');
      });
    });

    it('should apply correct border radius', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('rounded-md');
      });
    });
  });

  describe('Layout', () => {
    it('should have flex container with gap', () => {
      const { container } = render(
        <AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex');
      expect(wrapper).toHaveClass('gap-2');
    });

    it('should have equal width buttons', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('flex-1');
      });
    });

    it('should have proper spacing and borders', () => {
      const { container } = render(
        <AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('rounded-lg');
      expect(wrapper).toHaveClass('border');
      expect(wrapper).toHaveClass('border-neutral-200');
      expect(wrapper).toHaveClass('bg-white');
      expect(wrapper).toHaveClass('p-1');
    });

    it('should have bottom margin', () => {
      const { container } = render(
        <AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('mb-6');
    });
  });

  describe('Typography', () => {
    it('should have correct text styling', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('text-sm');
        expect(button).toHaveClass('font-medium');
      });
    });

    it('should display provider names in labels', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      expect(screen.getByText(/Suno/)).toBeInTheDocument();
      expect(screen.getByText(/ElevenLabs/)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have button role for all options', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
    });

    it('should be keyboard accessible', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');

      // Buttons should be focusable
      musicButton.focus();
      expect(document.activeElement).toBe(musicButton);
    });

    it('should have clear visual distinction between selected and unselected', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const musicButton = screen.getByText('Music (Suno)');
      const voiceButton = screen.getByText('Voice (ElevenLabs)');

      // Selected has dark background and white text
      expect(musicButton).toHaveClass('bg-neutral-900', 'text-white');

      // Unselected has light text
      expect(voiceButton).toHaveClass('text-neutral-600');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid clicks', () => {
      render(<AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');

      // Click multiple times rapidly
      fireEvent.click(voiceButton);
      fireEvent.click(voiceButton);
      fireEvent.click(voiceButton);

      expect(mockOnTypeChange).toHaveBeenCalledTimes(3);
      expect(mockOnTypeChange).toHaveBeenCalledWith('voice');
    });

    it('should handle all types correctly', () => {
      const types: Array<'music' | 'voice' | 'sfx'> = ['music', 'voice', 'sfx'];

      types.forEach((type) => {
        const { container } = render(
          <AudioTypeSelector audioType={type} onTypeChange={mockOnTypeChange} />
        );

        // Should render without errors
        expect(container.firstChild).toBeInTheDocument();
      });
    });
  });

  describe('Component Updates', () => {
    it('should update highlighting when audioType prop changes', () => {
      const { rerender } = render(
        <AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />
      );

      let musicButton = screen.getByText('Music (Suno)');
      expect(musicButton).toHaveClass('bg-neutral-900');

      rerender(<AudioTypeSelector audioType="voice" onTypeChange={mockOnTypeChange} />);

      musicButton = screen.getByText('Music (Suno)');
      const voiceButton = screen.getByText('Voice (ElevenLabs)');

      expect(musicButton).not.toHaveClass('bg-neutral-900');
      expect(voiceButton).toHaveClass('bg-neutral-900');
    });

    it('should accept new onTypeChange callback', () => {
      const newOnTypeChange = jest.fn();

      const { rerender } = render(
        <AudioTypeSelector audioType="music" onTypeChange={mockOnTypeChange} />
      );

      rerender(<AudioTypeSelector audioType="music" onTypeChange={newOnTypeChange} />);

      const voiceButton = screen.getByText('Voice (ElevenLabs)');
      fireEvent.click(voiceButton);

      expect(newOnTypeChange).toHaveBeenCalledWith('voice');
      expect(mockOnTypeChange).not.toHaveBeenCalled();
    });
  });
});
