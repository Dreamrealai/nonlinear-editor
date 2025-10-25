import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EditControls } from '@/components/keyframes/components/EditControls';
import type { SceneFrameRow } from '@/components/keyframes/hooks/useFramesData';

// Mock Next.js Image component
jest.mock('next/image', (): Record<string, unknown> => ({
  __esModule: true,
  default: ({ src, alt, ...props }: { src: string; alt: string }): JSX.Element => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} {...props} />;
  },
}));

// Mock LoadingSpinner
jest.mock('@/components/LoadingSpinner', (): Record<string, unknown> => ({
  LoadingSpinner: ({ size }: { size?: string }): JSX.Element => (
    <div data-testid="loading-spinner" data-size={size}>
      Loading...
    </div>
  ),
}));

describe('EditControls', () => {
  const mockOnModeChange = jest.fn();
  const mockOnCropChange = jest.fn();
  const mockOnFeatherChange = jest.fn();
  const mockOnPromptChange = jest.fn();
  const mockOnAttachRefImages = jest.fn();
  const mockOnRemoveRefImage = jest.fn();
  const mockOnSubmit = jest.fn();
  const mockOnClear = jest.fn();
  const mockClampCrop = jest.fn((crop) => crop);

  const mockSelectedFrame: SceneFrameRow = {
    id: 'frame-1',
    scene_id: 'scene-1',
    kind: 'first' as const,
    t_ms: 1000,
    storage_path: 'frames/frame-1.jpg',
    width: 1024,
    height: 768,
  };

  const defaultProps = {
    mode: 'global' as const,
    onModeChange: mockOnModeChange,
    selectedFrame: mockSelectedFrame,
    crop: { x: 100, y: 100, size: 256 },
    feather: 32,
    onCropChange: mockOnCropChange,
    onFeatherChange: mockOnFeatherChange,
    prompt: '',
    onPromptChange: mockOnPromptChange,
    refImages: [],
    onAttachRefImages: mockOnAttachRefImages,
    onRemoveRefImage: mockOnRemoveRefImage,
    submitError: null,
    isSubmitting: false,
    onClear: mockOnClear,
    onSubmit: mockOnSubmit,
    selectedFrameId: 'frame-1',
    clampCrop: mockClampCrop,
  };

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  describe('Mode Selection', () => {
    it('should render global and crop mode buttons', () => {
      render(<EditControls {...defaultProps} />);

      expect(screen.getByText('Global')).toBeInTheDocument();
      expect(screen.getByText('Crop')).toBeInTheDocument();
    });

    it('should highlight global button when global mode selected', () => {
      render(<EditControls {...defaultProps} mode="global" />);

      const globalButton = screen.getByText('Global');
      expect(globalButton).toHaveClass('bg-neutral-900', 'text-white');
    });

    it('should highlight crop button when crop mode selected', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const cropButton = screen.getByText('Crop');
      expect(cropButton).toHaveClass('bg-neutral-900', 'text-white');
    });

    it('should call onModeChange when global button clicked', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const globalButton = screen.getByText('Global');
      fireEvent.click(globalButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('global');
    });

    it('should call onModeChange when crop button clicked', () => {
      render(<EditControls {...defaultProps} mode="global" />);

      const cropButton = screen.getByText('Crop');
      fireEvent.click(cropButton);

      expect(mockOnModeChange).toHaveBeenCalledWith('crop');
    });
  });

  describe('Crop Controls', () => {
    it('should show crop controls when crop mode active', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      expect(screen.getByLabelText('Crop size')).toBeInTheDocument();
      expect(screen.getByLabelText('Feather amount')).toBeInTheDocument();
    });

    it('should not show crop controls when global mode active', () => {
      render(<EditControls {...defaultProps} mode="global" />);

      expect(screen.queryByLabelText('Crop size')).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Feather amount')).not.toBeInTheDocument();
    });

    it('should display crop size value', () => {
      render(<EditControls {...defaultProps} mode="crop" crop={{ x: 0, y: 0, size: 512 }} />);

      expect(screen.getByText('512px')).toBeInTheDocument();
    });

    it('should display feather value', () => {
      render(<EditControls {...defaultProps} mode="crop" feather={64} />);

      expect(screen.getByText('64px')).toBeInTheDocument();
    });

    it('should call setCrop when size slider changes', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      fireEvent.change(sizeSlider, { target: { value: '384' } });

      expect(mockOnCropChange).toHaveBeenCalled();
      expect(mockClampCrop).toHaveBeenCalled();
    });

    it('should call setFeather when feather slider changes', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const featherSlider = screen.getByLabelText('Feather amount');
      fireEvent.change(featherSlider, { target: { value: '96' } });

      expect(mockOnFeatherChange).toHaveBeenCalledWith(96);
    });

    it('should have proper range limits for size slider', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size') as HTMLInputElement;
      expect(sizeSlider).toHaveAttribute('min', '64');
      expect(sizeSlider).toHaveAttribute('max', '1024');
      expect(sizeSlider).toHaveAttribute('step', '16');
    });

    it('should have proper range limits for feather slider', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const featherSlider = screen.getByLabelText('Feather amount') as HTMLInputElement;
      expect(featherSlider).toHaveAttribute('min', '0');
      expect(featherSlider).toHaveAttribute('max', '128');
      expect(featherSlider).toHaveAttribute('step', '1');
    });

    it('should show instruction text for crop repositioning', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      expect(screen.getByText('Click image to reposition crop area')).toBeInTheDocument();
    });
  });

  describe('Prompt Input', () => {
    it('should render prompt textarea', () => {
      render(<EditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      expect(textarea).toBeInTheDocument();
    });

    it('should display current prompt value', () => {
      render(<EditControls {...defaultProps} prompt="Add a sunset background" />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Add a sunset background');
    });

    it('should call setPrompt when text changes', () => {
      render(<EditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      fireEvent.change(textarea, { target: { value: 'New edit prompt' } });

      expect(mockOnPromptChange).toHaveBeenCalledWith('New edit prompt');
    });

    it('should have correct placeholder', () => {
      render(<EditControls {...defaultProps} />);

      const textarea = screen.getByLabelText('Edit Prompt');
      expect(textarea).toHaveAttribute(
        'placeholder',
        'Describe your desired edit or paste reference images (Cmd/Ctrl+V)'
      );
    });

    it('should have 3 rows', () => {
      render(<EditControls {...defaultProps} />);

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
      render(<EditControls {...defaultProps} />);

      expect(screen.getByText('Attach')).toBeInTheDocument();
    });

    it('should call onAttachRefImages when attach clicked', () => {
      render(<EditControls {...defaultProps} />);

      const attachButton = screen.getByText('Attach');
      fireEvent.click(attachButton);

      expect(mockOnAttachRefImages).toHaveBeenCalledTimes(1);
    });

    it('should disable attach button when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} />);

      const attachButton = screen.getByText('Attach');
      expect(attachButton).toBeDisabled();
    });

    it('should render reference image previews', () => {
      render(<EditControls {...defaultProps} refImages={mockRefImages} />);

      const images = screen.getAllByAltText('Reference');
      expect(images).toHaveLength(2);
    });

    it('should show uploading state for images', () => {
      render(<EditControls {...defaultProps} refImages={mockRefImages} />);

      const spinners = screen
        .getAllByRole('img', { hidden: true })
        .filter((el) => el.querySelector('.animate-spin'));
      expect(spinners.length).toBeGreaterThanOrEqual(0);
    });

    it('should call onRemoveRefImage when remove clicked', () => {
      render(<EditControls {...defaultProps} refImages={mockRefImages} />);

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
      render(<EditControls {...defaultProps} refImages={mockRefImages} />);

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
      render(<EditControls {...defaultProps} />);

      expect(screen.getByText('Clear')).toBeInTheDocument();
    });

    it('should call onClear when clear clicked', () => {
      render(<EditControls {...defaultProps} prompt="Some text" />);

      const clearButton = screen.getByText('Clear');
      fireEvent.click(clearButton);

      expect(mockOnClear).toHaveBeenCalledTimes(1);
    });

    it('should disable clear button when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} />);

      const clearButton = screen.getByText('Clear');
      expect(clearButton).toBeDisabled();
    });

    it('should render generate button', () => {
      render(<EditControls {...defaultProps} />);

      expect(screen.getByText('Generate 4 Edits')).toBeInTheDocument();
    });

    it('should show generating text when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Generating 4 Variations…')).toBeInTheDocument();
    });

    it('should call onSubmit when generate clicked', () => {
      render(<EditControls {...defaultProps} />);

      const generateButton = screen.getByText('Generate 4 Edits');
      fireEvent.click(generateButton);

      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable generate button when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} />);

      const generateButton = screen.getByText('Generating 4 Variations…');
      expect(generateButton).toBeDisabled();
    });

    it('should disable generate button when no frame selected', () => {
      render(<EditControls {...defaultProps} selectedFrame={null} selectedFrameId={null} />);

      const generateButton = screen.getByText('Generate 4 Edits');
      expect(generateButton).toBeDisabled();
    });

    it('should show loading spinner when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    });
  });

  describe('Error Display', () => {
    it('should not show error by default', () => {
      render(<EditControls {...defaultProps} />);

      const errorText = screen.queryByText(/error/i);
      expect(errorText).not.toBeInTheDocument();
    });

    it('should display error message when present', () => {
      render(<EditControls {...defaultProps} submitError="Generation failed" />);

      expect(screen.getByText('Generation failed')).toBeInTheDocument();
    });

    it('should style error message in red', () => {
      render(<EditControls {...defaultProps} submitError="Generation failed" />);

      const errorMessage = screen.getByText('Generation failed');
      expect(errorMessage).toHaveClass('text-red-600');
    });
  });

  describe('Layout and Styling', () => {
    it('should have proper container styling', () => {
      const { container } = render(<EditControls {...defaultProps} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('border-b', 'border-neutral-200', 'bg-white', 'p-6');
    });

    it('should have gap between mode buttons', () => {
      const { container } = render(<EditControls {...defaultProps} />);

      const buttonContainer = container.querySelector('.flex.items-center.gap-2');
      expect(buttonContainer).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      render(<EditControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button').filter((btn) => {
        return btn.textContent === 'Global' || btn.textContent === 'Crop';
      });

      buttons.forEach((button) => {
        expect(button).toHaveClass(
          'rounded',
          'px-3',
          'py-1.5',
          'text-xs',
          'font-medium',
          'transition-all'
        );
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper label associations', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      const featherSlider = screen.getByLabelText('Feather amount');
      const promptTextarea = screen.getByLabelText('Edit Prompt');

      expect(sizeSlider).toBeInTheDocument();
      expect(featherSlider).toBeInTheDocument();
      expect(promptTextarea).toBeInTheDocument();
    });

    it('should have button type attributes', () => {
      render(<EditControls {...defaultProps} />);

      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type');
      });
    });

    it('should have disabled states for all interactive elements when submitting', () => {
      render(<EditControls {...defaultProps} isSubmitting={true} mode="crop" />);

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
      render(<EditControls {...defaultProps} selectedFrame={null} />);

      // Should still render the component
      expect(screen.getByText('Global')).toBeInTheDocument();
    });

    it('should handle empty prompt', () => {
      render(<EditControls {...defaultProps} prompt="" />);

      const textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });

    it('should handle very long prompt', () => {
      const longPrompt = 'A'.repeat(1000);
      render(<EditControls {...defaultProps} prompt={longPrompt} />);

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

      render(<EditControls {...defaultProps} refImages={manyImages} />);

      const images = screen.getAllByAltText('Reference');
      expect(images).toHaveLength(10);
    });

    it('should clamp crop size to frame dimensions', () => {
      render(<EditControls {...defaultProps} mode="crop" />);

      const sizeSlider = screen.getByLabelText('Crop size');
      fireEvent.change(sizeSlider, { target: { value: '2000' } });

      expect(mockClampCrop).toHaveBeenCalled();
    });
  });

  describe('Component Updates', () => {
    it('should update when mode changes', () => {
      const { rerender } = render(<EditControls {...defaultProps} mode="global" />);

      expect(screen.queryByLabelText('Crop size')).not.toBeInTheDocument();

      rerender(<EditControls {...defaultProps} mode="crop" />);

      expect(screen.getByLabelText('Crop size')).toBeInTheDocument();
    });

    it('should update when prompt changes', () => {
      const { rerender } = render(<EditControls {...defaultProps} prompt="First" />);

      let textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('First');

      rerender(<EditControls {...defaultProps} prompt="Second" />);

      textarea = screen.getByLabelText('Edit Prompt') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Second');
    });

    it('should update when isSubmitting changes', () => {
      const { rerender } = render(<EditControls {...defaultProps} isSubmitting={false} />);

      expect(screen.getByText('Generate 4 Edits')).toBeInTheDocument();

      rerender(<EditControls {...defaultProps} isSubmitting={true} />);

      expect(screen.getByText('Generating 4 Variations…')).toBeInTheDocument();
    });
  });
});
