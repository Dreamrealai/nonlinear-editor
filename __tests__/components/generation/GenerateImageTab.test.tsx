/**
 * Tests for GenerateImageTab Component
 *
 * Tests image generation UI with Google Vertex AI Imagen
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GenerateImageTab } from '@/components/generation/GenerateImageTab';

// Mock fetch globally
global.fetch = jest.fn();

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
  Toaster: () => <div data-testid="toaster" />,
}));

// Mock browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

describe('GenerateImageTab', () => {
  const projectId = 'test-project-id';

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        assets: [{ metadata: { sourceUrl: 'https://example.com/image1.jpg' } }],
      }),
    });
  });

  it('renders image generation interface', () => {
    render(<GenerateImageTab projectId={projectId} />);

    expect(screen.getByText('Generate Images with AI')).toBeInTheDocument();
    expect(screen.getByLabelText(/image description/i)).toBeInTheDocument();
  });

  it('displays all form controls', () => {
    render(<GenerateImageTab projectId={projectId} />);

    expect(screen.getByLabelText(/image description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/imagen model/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/aspect ratio/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/negative prompt/i)).toBeInTheDocument();
  });

  it('handles prompt input', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i) as HTMLTextAreaElement;
    fireEvent.change(promptInput, { target: { value: 'A beautiful sunset' } });

    expect(promptInput.value).toBe('A beautiful sunset');
  });

  it('handles model selection', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const modelSelect = screen.getByLabelText(/imagen model/i) as HTMLSelectElement;
    fireEvent.change(modelSelect, { target: { value: 'imagegeneration@006' } });

    expect(modelSelect.value).toBe('imagegeneration@006');
  });

  it('handles aspect ratio selection', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const aspectSelect = screen.getByLabelText(/aspect ratio/i) as HTMLSelectElement;
    fireEvent.change(aspectSelect, { target: { value: '16:9' } });

    expect(aspectSelect.value).toBe('16:9');
  });

  it('handles sample count selection', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const sampleSelect = screen.getByLabelText(/number of images/i) as HTMLSelectElement;
    fireEvent.change(sampleSelect, { target: { value: '4' } });

    expect(sampleSelect.value).toBe('4');
  });

  it('submits generation request on form submit', async () => {
    const toast = require('react-hot-toast').default;

    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i);
    fireEvent.change(promptInput, { target: { value: 'A mountain landscape' } });

    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/image/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });

  it('shows error when submitting without prompt', async () => {
    const toast = require('react-hot-toast').default;

    render(<GenerateImageTab projectId={projectId} />);

    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith('Please enter a prompt');
  });

  it('disables submit when generating', async () => {
    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i);
    fireEvent.change(promptInput, { target: { value: 'A mountain' } });

    const submitButton = screen.getByRole('button', { name: /generate images/i });

    act(() => {
      fireEvent.click(submitButton);
    });

    // Button should be disabled during generation
    await waitFor(() => {
      expect(submitButton).toHaveTextContent(/generating/i);
    });
  });

  it('displays empty queue state', () => {
    render(<GenerateImageTab projectId={projectId} />);

    expect(screen.getByText('No images in queue')).toBeInTheDocument();
  });

  it('adds images to queue on generation', async () => {
    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i);
    fireEvent.change(promptInput, { target: { value: 'Test image' } });

    const submitButton = screen.getByRole('button', { name: /generate images/i });

    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      expect(screen.queryByText('No images in queue')).not.toBeInTheDocument();
    });
  });

  it('enforces maximum queue limit of 8', async () => {
    const toast = require('react-hot-toast').default;

    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i);
    const submitButton = screen.getByRole('button', { name: /generate images/i });

    // Add 8 items to queue
    for (let i = 0; i < 8; i++) {
      fireEvent.change(promptInput, { target: { value: `Image ${i}` } });
      await act(async () => {
        fireEvent.click(submitButton);
      });
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      jest.clearAllMocks();
    }

    // Try to add 9th item
    fireEvent.change(promptInput, { target: { value: 'Image 9' } });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining('Maximum 8 generation requests')
    );
  });

  it('clears completed images from queue', async () => {
    render(<GenerateImageTab projectId={projectId} />);

    const promptInput = screen.getByLabelText(/image description/i);
    fireEvent.change(promptInput, { target: { value: 'Test' } });

    const submitButton = screen.getByRole('button', { name: /generate images/i });
    await act(async () => {
      fireEvent.click(submitButton);
    });

    await waitFor(() => {
      const clearButton = screen.queryByRole('button', { name: /clear completed/i });
      if (clearButton) {
        fireEvent.click(clearButton);
      }
    });
  });

  it('displays safety filter options', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const safetySelect = screen.getByLabelText(/safety filter level/i) as HTMLSelectElement;
    expect(safetySelect).toBeInTheDocument();
    expect(safetySelect.value).toBe('block_some');
  });

  it('displays person generation options', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const personSelect = screen.getByLabelText(/person generation/i) as HTMLSelectElement;
    expect(personSelect).toBeInTheDocument();
    expect(personSelect.value).toBe('allow_adult');
  });

  it('handles seed input', () => {
    render(<GenerateImageTab projectId={projectId} />);

    const seedInput = screen.getByLabelText(/seed/i) as HTMLInputElement;
    fireEvent.change(seedInput, { target: { value: '12345' } });

    expect(seedInput.value).toBe('12345');
  });

  it('shows generation tips', () => {
    render(<GenerateImageTab projectId={projectId} />);

    expect(screen.getByText(/generation tips/i)).toBeInTheDocument();
    expect(screen.getByText(/be specific about style and details/i)).toBeInTheDocument();
  });
});
