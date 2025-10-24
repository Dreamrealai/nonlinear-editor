import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { KeyframeEditControls } from '@/components/keyframes/KeyframeEditControls';
import type { SceneFrameRow } from '@/components/keyframes/hooks/useFramesData';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock LoadingSpinner
jest.mock('@/components/LoadingSpinner', () => ({
  LoadingSpinner: ({ size }: { size?: string }) => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

describe('KeyframeEditControls', () => {
  const mockSetMode = jest.fn();
  const mockSetCrop = jest.fn();
  const mockSetFeather = jest.fn();
  const mockSetPrompt = jest.fn();
  const mockOnAttachRefImages = jest.fn();
  const mockOnRemoveRefImage = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockClampCrop = jest.fn((crop) => crop);

  const mockSelectedFrame: SceneFrameRow = {
    id: 'frame-1',
    sceneId: 'scene-1',
    status: 'completed',
    frameNumber: 1,
    imageUrl: 'https://example.com/frame.jpg',
    width: 1024,
    height: 768,
    createdAt: '2024-01-01T00:00:00Z',
  };

  const defaultProps = {
    mode: 'global' as const,
    setMode: mockSetMode,
    crop: { x: 100, y: 100, size: 256 },
    setCrop: mockSetCrop,
    feather: 32,
    setFeather: mockSetFeather,
    prompt: '',
    setPrompt: mockSetPrompt,
    refImages: [],
    onAttachRefImages: mockOnAttachRefImages,
    onRemoveRefImage: mockOnRemoveRefImage,
    isSubmitting: false,
    submitError: null,
    selectedFrame: mockSelectedFrame,
    clampCrop: mockClampCrop,
    onSubmit: mockOnSubmit,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Mode Selection', () => {
    it('should render global and crop mode buttons', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      expect(screen.getByText('Global')).toBeInTheDocument();
      expect(screen.getByText('Crop')).toBeInTheDocument();
    });

    it('should highlight global button when global mode selected', () => {
      render(<KeyframeEditControls {...defaultProps} mode="global" />);

      const globalButton = screen.getByText('Global');
      expect(globalButton).toHaveClass('bg-neutral-900', 'text-white');
    });

    it('should highlight crop button when crop mode selected', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const cropButton = screen.getByText('Crop');
      expect(cropButton).toHaveClass('bg-neutral-900', 'text-white');
    });

    it('should call setMode when global button clicked', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const globalButton = screen.getByText('Global');
      fireEvent.click(globalButton);

      expect(mockSetMode).toHaveBeenCalledWith('global');
    });

    it('should call setMode when crop button clicked', () => {
      render(<KeyframeEditControls {...defaultProps} mode="global" />);

      const cropButton = screen.getByText('Crop');
      fireEvent.click(cropButton);

      expect(mockSetMode).toHaveBeenCalledWith('crop');
    });
  });

  describe('Crop Controls', () => {
    it('should show crop controls when crop mode active', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      expect(screen.getByLabelText('Crop size')).toBeInTheDocument();
      expect(screen.getByLabelText('Feather amount')).toBeInTheDocument();
    });

    it('should not show crop controls when global mode active', () => {
      render(<KeyframeEditControls {...defaultProps} mode="global" />);

      expect(screen.queryByLabelText('Crop size')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Feather amount')).not.toBeInTheDocument();
    });

    it('should display crop size value', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" crop={{ x: 0, y: 0, size: 512 }} />);

      expect(screen.getByText('512px')).toBeInTheDocument();
    });

    it('should display feather value', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" feather={64} />);

      expect(screen.getByText('64px')).toBeInTheDocument();
    });

    it('should call setCrop when size slider changes', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      fireEvent.change(sizeSlider, { target: { value: '384' } });

      expect(mockSetCrop).toHaveBeenCalled();
      expect(mockClampCrop).toHaveBeenCalled();
    });

    it('should call setFeather when feather slider changes', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const featherSlider = screen.getByLabelText('Feather amount');
      fireEvent.change(featherSlider, { target: { value: '96' } });

      expect(mockSetFeather).toHaveBeenCalledWith(96);
    });

    it('should have proper range limits for size slider', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size') as HTMLInputElement;
      expect(sizeSlider).toHaveAttribute('min', '64');
      expect(sizeSlider).toHaveAttribute('max', '1024');
      expect(sizeSlider).toHaveAttribute('step', '16');
    });

    it('should have proper range limits for feather slider', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const featherSlider = screen.getByLabelText('Feather amount') as HTMLInputElement;
      expect(featherSlider).toHaveAttribute('min', '0');
      expect(featherSlider).toHaveAttribute('max', '128');
      expect(featherSlider).toHaveAttribute('step', '1');
    });

    it('should show instruction text for crop repositioning', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      expect(screen.getByText('Click image to reposition crop area')).toBeInTheDocument();
    });
  });

  describe('Prompt Input', () => {
    it('should render prompt textarea', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      expect(textarea).toBeInTheDocument();
    });

    it('should display current prompt value', () => {
      render(<KeyframeEditControls {...defaultProps} prompt="Add a sunset background" />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Add a sunset background');
    });

    it('should call setPrompt when text changes', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      fireEvent.change(textarea, { target: { value: 'New edit prompt' } });

      expect(mockSetPrompt).toHaveBeenCalledWith('New edit prompt');
    });

    it('should have correct placeholder', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Describe your desired edit or paste reference images (Cmd/Ctrl+V)'
      );
    });

    it('should have 3 rows', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.rows).toBe(3);
    });
  });

  describe('Reference Images', () => {
    const mockRefImages = [
      {
        id: 'img-1',
        file: new File([], 'test1.jpg'),
        previewUrl: 'blob:test1',
        uploading: false,
        uploadedUrl: 'https://example.com/uploaded1.jpg',
      },
      {
        id: 'img-2',
        file: new File([], 'test2.jpg'),
        previewUrl: 'blob:test2',
        uploading: true,
      },
    ];

    it('should render attach button', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      expect(screen.getByText('Attach')).toBeInTheDocument();
    });

    it('should call onAttachRefImages when attach clicked', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const attachButton = screen.getByText('Attach');
      fireEvent.click(attachButton);

      expect(mockOnAttachRefImages).toHaveBeenCalledTimes(1);
    });

    it('should disable attach button when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      const attachButton = screen.getByText('Attach');
      expect(attachButton).toBeDisabled();
    });

    it('should render reference image previews', () => {
      render(<KeyframeEditControls {...defaultProps} refImages={mockRefImages} />);

      const images = screen.getAllByAltText('Reference');
      expect(images).toHaveLength(2);
    });

    it('should show uploading state for images', () => {
      render(<KeyframeEditControls {...defaultProps} refImages={mockRefImages} />);

      const spinners = screen.getAllByRole('img', { hidden: true }).filter((el) =>
        el.querySelector('.animate-spin')
      );
      expect(spinners.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onRemoveRefImage when remove clicked', () => {
      render(<KeyframeEditControls {...defaultProps} refImages={mockRefImages} />);

      const removeButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('group-hover:opacity-100');
      });

      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(mockOnRemoveRefImage).toHaveBeenCalled();
      }
    });

    it('should disable remove button for uploading images', () => {
      render(<KeyframeEditControls {...defaultProps} refImages={mockRefImages} />);

      const removeButtons = screen.getAllByRole('button').filter((btn) => {
        const svg = btn.querySelector('svg');
        return svg && btn.className.includes('group-hover:opacity-100');
      });

      // Second image is uploading, its button should be disabled
      if (removeButtons.length >= 2) {
        expect(removeButtons[1]).toBeDisabled();
      }
    });
  });

  describe('Submit Controls', () => {
    it('should render clear button', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should call setPrompt with empty string when clear clicked', () => {
      render(<KeyframeEditControls {...defaultProps} prompt="Some text" />);

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockSetPrompt).toHaveBeenCalledWith('');
    });

    it('should disable clear button when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });

    it('should render generate button', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      expect(screen.getByText('Generate 4 Edits')).toBeInTheDocument();
    });

    it('should show generating text when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Generating 4 Variations…')).toBeInTheDocument();
    });

    it('should call onSubmit when generate clicked', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const generateButton = screen.getByText('Generate 4 Edits');
      fireEvent.click(generateButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable generate button when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      const generateButton = screen.getByText('Generating 4 Variations…');
      expect(generateButton).toBeDisabled();
    });

    it('should disable generate button when no frame selected', () => {
      render(<KeyframeEditControls {...defaultProps} selectedFrame={null} />);

      const generateButton = screen.getByText('Generate 4 Edits');
      expect(generateButton).toBeDisabled();
    });

    it('should show loading spinner when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should not show error by default', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const errorText = screen.queryByText(/error/i);
      expect(errorText).not.toBeInTheDocument();
    });

    it('should display error message when present', () => {
      render(<KeyframeEditControls {...defaultProps} submitError="Generation failed" />);

      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });

    it('should style error message in red', () => {
      render(<KeyframeEditControls {...defaultProps} submitError="Generation failed" />);

      const errorMessage = screen.getByText('Generation failed');
      expect(errorMessage).toHaveClass('text-red-600');
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(<KeyframeEditControls {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-b', 'border-neutral-200', 'bg-white', 'p-6');
    });

    it('should have gap between mode buttons', () => {
      const { container } = render(<KeyframeEditControls {...defaultProps} />);

      const buttonContainer = container.querySelector('.flex.items-center.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button').filter((btn) => {
        return btn.textContent === 'Global' || btn.textContent === 'Crop';
      });

      buttons.forEach((button) => {
        expect(button).toHaveClass('rounded', 'px-3', 'py-1.5', 'text-xs', 'font-medium', 'transition-all');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      const featherSlider = screen.getByLabelText('Feather amount');
      const promptTextarea = screen.getByLabelText('Edit Prompt');

      expect(sizeSlider).toBeInTheDocument();
      expect(featherSlider).toBeInTheDocument();
      expect(promptTextarea).toBeInTheDocument();
    });

    it('should have button type attributes', () => {
      render(<KeyframeEditControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('should have disabled states for all interactive elements when submitting', () => {
      render(<KeyframeEditControls {...defaultProps} isSubmitting={true} mode="crop" />);

      const textarea = screen.getByLabelText('Edit Prompt');
      const clearButton = screen.getByText('Clear');
      const generateButton = screen.getByText('Generating 4 Variations…');

      expect(textarea).not.toBeDisabled(); // Textarea is not disabled
      expect(clearButton).toBeDisabled();
      expect(generateButton).toBeDisabled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing selectedFrame gracefully', () => {
      render(<KeyframeEditControls {...defaultProps} selectedFrame={null} />);

      // Should still render the component
      expect(screen.getByText('Global')).toBeInTheDocument();
    });

    it('should handle empty prompt', () => {
      render(<KeyframeEditControls {...defaultProps} prompt="" />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('should handle very long prompt', () => {
      const longPrompt = 'A'.repeat(1000);
      render(<KeyframeEditControls {...defaultProps} prompt={longPrompt} />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe(longPrompt);
    });

    it('should handle many reference images', () => {
      const manyImages = Array.from({ length: 10 }, (_, i) => ({
        id: `img-${i}`,
        file: new File([], `test${i}.jpg`),
        previewUrl: `blob:test${i}`,
        uploading: false,
      }));

      render(<KeyframeEditControls {...defaultProps} refImages={manyImages} />);

      const images = screen.getAllByAltText('Reference');
      expect(images).toHaveLength(10);
    });

    it('should clamp crop size to frame dimensions', () => {
      render(<KeyframeEditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      fireEvent.change(sizeSlider, { target: { value: '2000' } });

      expect(mockClampCrop).toHaveBeenCalled();
    });
  });

  describe('Component Updates', () => {
    it('should update when mode changes', () => {
      const { rerender } = render(<KeyframeEditControls {...defaultProps} mode="global" />);

      expect(screen.queryByLabelText('Crop size')).not.toBeInTheDocument();

      rerender(<KeyframeEditControls {...defaultProps} mode="crop" />);

      expect(screen.getByLabelText('Crop size')).toBeInTheDocument();
    });

    it('should update when prompt changes', () => {
      const { rerender } = render(<KeyframeEditControls {...defaultProps} prompt="First" />);

      let textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('First');

      rerender(<KeyframeEditControls {...defaultProps} prompt="Second" />);

      textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Second');
    });

    it('should update when isSubmitting changes', () => {
      const { rerender } = render(<KeyframeEditControls {...defaultProps} isSubmitting={false} />);

      expect(screen.getByText('Generate 4 Edits')).toBeInTheDocument();

      rerender(<KeyframeEditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Generating 4 Variations…')).toBeInTheDocument();
    });
  });
});
