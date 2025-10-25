import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VideoGenerationForm } from '@/components/generation/VideoGenerationForm';
import { VIDEO_MODELS, VIDEO_MODEL_CONFIGS } from '@/lib/config/models';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: function MockImage({ src, alt }: any) {
    return <img src={src} alt={alt} />;
  },
}));

// Mock AssetLibraryModal
jest.mock('@/components/generation/AssetLibraryModal', () => ({
  __esModule: true,
  default: function MockAssetLibraryModal({ onClose, onSelect }: any) {
    return (
      <div data-testid="asset-library-modal">
        <button onClick={onClose}>Close</button>
        <button onClick={() => onSelect({ id: 'asset-1', url: 'https://example.com/image.jpg' })}>
          Select Asset
        </button>
      </div>
    );
  },
}));

describe('VideoGenerationForm', () => {
  const mockFileInputRef = { current: document.createElement('input') };
  const defaultProps = {
    prompt: '',
    model: VIDEO_MODELS.VEO_3_1_GENERATE,
    aspectRatio: '16:9' as const,
    duration: 8 as const,
    modelConfig: VIDEO_MODEL_CONFIGS[VIDEO_MODELS.VEO_3_1_GENERATE],
    disabled: false,
    queueLength: 0,
    imagePreviewUrl: null,
    fileInputRef: mockFileInputRef as any,
    showAssetLibrary: false,
    onPromptChange: jest.fn(),
    onModelChange: jest.fn(),
    onAspectRatioChange: jest.fn(),
    onDurationChange: jest.fn(),
    onSubmit: jest.fn(),
    onFileInputChange: jest.fn(),
    onClearImage: jest.fn(),
    onAssetSelect: jest.fn(),
    onShowAssetLibrary: jest.fn(),
    projectId: 'test-project-id',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Model')).toBeInTheDocument();
      expect(screen.getByLabelText('Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
      expect(screen.getByLabelText('Video Description *')).toBeInTheDocument();
    });

    it('should display current form values', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          prompt="Test prompt"
          aspectRatio="9:16"
          duration={10}
        />
      );

      const promptField = screen.getByLabelText('Video Description *') as HTMLTextAreaElement;
      expect(promptField.value).toBe('Test prompt');

      const aspectRatioField = screen.getByLabelText('Aspect Ratio') as HTMLSelectElement;
      expect(aspectRatioField.value).toBe('9:16');

      const durationField = screen.getByLabelText('Duration') as HTMLSelectElement;
      expect(durationField.value).toBe('10');
    });

    it('should show queue counter', () => {
      render(<VideoGenerationForm {...defaultProps} queueLength={3} />);

      expect(screen.getByText('3/8 videos in queue')).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      expect(screen.getByText('Add to Queue')).toBeInTheDocument();
    });
  });

  describe('Model Selection', () => {
    it('should display all available models', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const modelSelect = screen.getByLabelText('Model') as HTMLSelectElement;
      expect(modelSelect).toBeInTheDocument();

      // Should have options for all video models
      expect(screen.getByText(/Veo 3.1 \(Latest\)/)).toBeInTheDocument();
      expect(screen.getByText(/Veo 3.1 Fast/)).toBeInTheDocument();
      expect(screen.getByText(/Veo 2.0/)).toBeInTheDocument();
    });

    it('should call onModelChange when model is selected', () => {
      const onModelChange = jest.fn();
      render(<VideoGenerationForm {...defaultProps} onModelChange={onModelChange} />);

      const modelSelect = screen.getByLabelText('Model');
      fireEvent.change(modelSelect, { target: { value: VIDEO_MODELS.VEO_2_0_GENERATE } });

      expect(onModelChange).toHaveBeenCalledWith(VIDEO_MODELS.VEO_2_0_GENERATE);
    });

    it('should disable model select when form is disabled', () => {
      render(<VideoGenerationForm {...defaultProps} disabled={true} />);

      const modelSelect = screen.getByLabelText('Model');
      expect(modelSelect).toBeDisabled();
    });
  });

  describe('Aspect Ratio', () => {
    it('should display supported aspect ratios', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const aspectRatioSelect = screen.getByLabelText('Aspect Ratio');
      fireEvent.click(aspectRatioSelect);

      // Should show aspect ratio options based on model config
      expect(screen.getByText(/16:9/)).toBeInTheDocument();
    });

    it('should call onAspectRatioChange when aspect ratio is selected', () => {
      const onAspectRatioChange = jest.fn();
      render(<VideoGenerationForm {...defaultProps} onAspectRatioChange={onAspectRatioChange} />);

      const aspectRatioSelect = screen.getByLabelText('Aspect Ratio');
      fireEvent.change(aspectRatioSelect, { target: { value: '9:16' } });

      expect(onAspectRatioChange).toHaveBeenCalledWith('9:16');
    });
  });

  describe('Duration', () => {
    it('should display supported durations', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const durationSelect = screen.getByLabelText('Duration');
      expect(durationSelect).toBeInTheDocument();
    });

    it('should call onDurationChange when duration is selected', () => {
      const onDurationChange = jest.fn();
      render(<VideoGenerationForm {...defaultProps} onDurationChange={onDurationChange} />);

      const durationSelect = screen.getByLabelText('Duration');
      fireEvent.change(durationSelect, { target: { value: '10' } });

      expect(onDurationChange).toHaveBeenCalledWith(10);
    });
  });

  describe('Prompt Input', () => {
    it('should render prompt textarea', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const promptField = screen.getByLabelText('Video Description *');
      expect(promptField).toBeInTheDocument();
      expect(promptField.tagName).toBe('TEXTAREA');
    });

    it('should call onPromptChange when typing', () => {
      const onPromptChange = jest.fn();
      render(<VideoGenerationForm {...defaultProps} onPromptChange={onPromptChange} />);

      const promptField = screen.getByLabelText('Video Description *');
      fireEvent.change(promptField, { target: { value: 'New prompt text' } });

      expect(onPromptChange).toHaveBeenCalledWith('New prompt text');
    });

    it('should have placeholder text', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const promptField = screen.getByLabelText('Video Description *') as HTMLTextAreaElement;
      expect(promptField.placeholder).toContain('dystopian sprawl');
    });

    it('should be required field', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const promptField = screen.getByLabelText('Video Description *');
      expect(promptField).toBeRequired();
    });
  });

  describe('Image Upload', () => {
    it('should show image upload area when model supports it', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
        />
      );

      expect(screen.getByText(/Click to upload, paste/)).toBeInTheDocument();
    });

    it('should not show image upload when model does not support it', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: false }}
        />
      );

      expect(screen.queryByText(/Click to upload/)).not.toBeInTheDocument();
    });

    it('should display image preview when image is loaded', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          imagePreviewUrl="https://example.com/image.jpg"
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
        />
      );

      const image = screen.getByAlt('Selected reference');
      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', 'https://example.com/image.jpg');
    });

    it('should call onClearImage when clear button is clicked', () => {
      const onClearImage = jest.fn();
      render(
        <VideoGenerationForm
          {...defaultProps}
          imagePreviewUrl="https://example.com/image.jpg"
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
          onClearImage={onClearImage}
        />
      );

      const clearButton = screen.getByTitle('Remove image');
      fireEvent.click(clearButton);

      expect(onClearImage).toHaveBeenCalledTimes(1);
    });

    it('should show asset library button', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
        />
      );

      expect(screen.getByText('select from library')).toBeInTheDocument();
    });

    it('should open asset library when button is clicked', () => {
      const onShowAssetLibrary = jest.fn();
      render(
        <VideoGenerationForm
          {...defaultProps}
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
          onShowAssetLibrary={onShowAssetLibrary}
        />
      );

      const libraryButton = screen.getByText('select from library');
      fireEvent.click(libraryButton);

      expect(onShowAssetLibrary).toHaveBeenCalledWith(true);
    });
  });

  describe('Asset Library Modal', () => {
    it('should render asset library when showAssetLibrary is true', () => {
      render(<VideoGenerationForm {...defaultProps} showAssetLibrary={true} />);

      expect(screen.getByTestId('asset-library-modal')).toBeInTheDocument();
    });

    it('should not render asset library when showAssetLibrary is false', () => {
      render(<VideoGenerationForm {...defaultProps} showAssetLibrary={false} />);

      expect(screen.queryByTestId('asset-library-modal')).not.toBeInTheDocument();
    });

    it('should call onAssetSelect when asset is selected', () => {
      const onAssetSelect = jest.fn();
      const onShowAssetLibrary = jest.fn();
      render(
        <VideoGenerationForm
          {...defaultProps}
          showAssetLibrary={true}
          onAssetSelect={onAssetSelect}
          onShowAssetLibrary={onShowAssetLibrary}
        />
      );

      const selectButton = screen.getByText('Select Asset');
      fireEvent.click(selectButton);

      expect(onAssetSelect).toHaveBeenCalledWith({
        id: 'asset-1',
        url: 'https://example.com/image.jpg',
      });
      expect(onShowAssetLibrary).toHaveBeenCalledWith(false);
    });

    it('should close modal when close button is clicked', () => {
      const onShowAssetLibrary = jest.fn();
      render(
        <VideoGenerationForm
          {...defaultProps}
          showAssetLibrary={true}
          onShowAssetLibrary={onShowAssetLibrary}
        />
      );

      const closeButton = screen.getByText('Close');
      fireEvent.click(closeButton);

      expect(onShowAssetLibrary).toHaveBeenCalledWith(false);
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when form is submitted', () => {
      const onSubmit = jest.fn((e) => e.preventDefault());
      render(<VideoGenerationForm {...defaultProps} prompt="Test" onSubmit={onSubmit} />);

      const form = screen.getByRole('button', { name: 'Add to Queue' }).closest('form');
      fireEvent.submit(form!);

      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it('should disable submit button when no prompt', () => {
      render(<VideoGenerationForm {...defaultProps} prompt="" />);

      const submitButton = screen.getByText('Add to Queue');
      expect(submitButton).toBeDisabled();
    });

    it('should enable submit button when prompt is provided', () => {
      render(<VideoGenerationForm {...defaultProps} prompt="Test prompt" />);

      const submitButton = screen.getByText('Add to Queue');
      expect(submitButton).not.toBeDisabled();
    });

    it('should disable submit button when disabled prop is true', () => {
      render(<VideoGenerationForm {...defaultProps} prompt="Test" disabled={true} />);

      const submitButton = screen.getByText('Add to Queue');
      expect(submitButton).toBeDisabled();
    });

    it('should disable submit button when queue is full', () => {
      render(<VideoGenerationForm {...defaultProps} prompt="Test" queueLength={8} />);

      const submitButton = screen.getByText('Add to Queue');
      expect(submitButton).toBeDisabled();
    });

    it('should show loading state when submitting', () => {
      render(<VideoGenerationForm {...defaultProps} prompt="Test" disabled={true} />);

      expect(screen.getByText('Adding to Queue...')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all form fields', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      expect(screen.getByLabelText('Model')).toBeInTheDocument();
      expect(screen.getByLabelText('Aspect Ratio')).toBeInTheDocument();
      expect(screen.getByLabelText('Duration')).toBeInTheDocument();
      expect(screen.getByLabelText('Video Description *')).toBeInTheDocument();
    });

    it('should mark required fields', () => {
      render(<VideoGenerationForm {...defaultProps} />);

      const promptField = screen.getByLabelText('Video Description *');
      expect(promptField).toBeRequired();
    });

    it('should have descriptive button titles', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          imagePreviewUrl="https://example.com/image.jpg"
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
        />
      );

      expect(screen.getByTitle('Remove image')).toBeInTheDocument();
    });

    it('should have ARIA labels for image selection', () => {
      render(
        <VideoGenerationForm
          {...defaultProps}
          modelConfig={{ ...defaultProps.modelConfig, supportsReferenceImage: true }}
        />
      );

      const libraryButton = screen.getByLabelText('Select image from library');
      expect(libraryButton).toBeInTheDocument();
    });
  });

  describe('Disabled State', () => {
    it('should disable all inputs when disabled', () => {
      render(<VideoGenerationForm {...defaultProps} disabled={true} />);

      expect(screen.getByLabelText('Model')).toBeDisabled();
      expect(screen.getByLabelText('Aspect Ratio')).toBeDisabled();
      expect(screen.getByLabelText('Duration')).toBeDisabled();
      expect(screen.getByLabelText('Video Description *')).toBeDisabled();
    });

    it('should disable submit button when disabled', () => {
      render(<VideoGenerationForm {...defaultProps} disabled={true} prompt="Test" />);

      const submitButton = screen.getByText('Adding to Queue...');
      expect(submitButton).toBeDisabled();
    });
  });
});
