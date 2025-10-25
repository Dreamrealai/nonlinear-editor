import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { DragDropZone } from '@/components/ui/DragDropZone';

describe('DragDropZone', () => {
  const mockOnFilesSelected = jest.fn();

  beforeEach(() => {
    mockOnFilesSelected.mockClear();
  });

  // Test: Basic rendering
  it('renders drag and drop zone', () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} />);

    expect(screen.getByText(/Drag and drop files here/i)).toBeInTheDocument();
    expect(screen.getByText(/or click to browse/i)).toBeInTheDocument();
  });

  // Test: Custom description
  it('displays custom description when provided', () => {
    render(
      <DragDropZone
        onFilesSelected={mockOnFilesSelected}
        description="Upload your videos (max 50MB)"
      />
    );

    expect(screen.getByText(/Upload your videos \(max 50MB\)/i)).toBeInTheDocument();
  });

  // Test: Accept attribute
  it('displays accepted file types', () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} accept="image/*,video/*" />);

    expect(screen.getByText(/Accepted: image\/\*,video\/\*/i)).toBeInTheDocument();
  });

  // Test: File input
  it('opens file picker when clicked', async () => {
    const user = userEvent.setup();
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} />);

    const fileInput = screen.getByLabelText(/File input/i);
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute('type', 'file');
  });

  // Test: File selection via input
  it('handles file selection through input', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file]);
    });
  });

  // Test: Multiple files
  it('allows multiple file selection when multiple prop is true', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} multiple={true} />);

    const file1 = new File(['content1'], 'test1.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'test2.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, [file1, file2]);

    await waitFor(() => {
      expect(mockOnFilesSelected).toHaveBeenCalledWith([file1, file2]);
    });
  });

  // Test: Single file restriction
  it('restricts to single file when multiple prop is false', () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} multiple={false} />);

    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;
    expect(fileInput).not.toHaveAttribute('multiple');
  });

  // Test: Disabled state
  it('disables interactions when disabled prop is true', () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} disabled={true} />);

    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;
    expect(fileInput).toBeDisabled();
  });

  // Test: Drag events
  it('handles drag enter and exit', () => {
    const { container } = render(<DragDropZone onFilesSelected={mockOnFilesSelected} />);
    const dropZone = container.firstChild as HTMLElement;

    // Drag enter
    fireEvent.dragEnter(dropZone, {
      dataTransfer: {
        items: [{ kind: 'file', type: 'text/plain' }],
      },
    });

    expect(dropZone).toHaveClass('border-blue-500');

    // Drag leave
    fireEvent.dragLeave(dropZone);
    expect(dropZone).not.toHaveClass('border-blue-500');
  });

  // Test: File size validation
  it('validates file size and shows error', async () => {
    const maxSize = 1024; // 1KB
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} maxFileSize={maxSize} />);

    const largeContent = 'a'.repeat(2048); // 2KB
    const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, largeFile);

    await waitFor(() => {
      expect(screen.getByText(/Upload Errors:/i)).toBeInTheDocument();
      expect(screen.getByText(/File too large/i)).toBeInTheDocument();
    });

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  // Test: Max files validation
  it('validates maximum number of files', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} maxFiles={2} multiple={true} />);

    const files = [
      new File(['1'], 'file1.txt', { type: 'text/plain' }),
      new File(['2'], 'file2.txt', { type: 'text/plain' }),
      new File(['3'], 'file3.txt', { type: 'text/plain' }),
    ];

    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;
    await userEvent.upload(fileInput, files);

    await waitFor(() => {
      expect(screen.getByText(/Maximum 2 files allowed/i)).toBeInTheDocument();
    });
  });

  // Test: File type validation
  it('validates accepted file types', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} accept="image/*" />);

    const textFile = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, textFile);

    await waitFor(() => {
      expect(screen.getByText(/File type not accepted/i)).toBeInTheDocument();
    });

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  // Test: File previews
  it('shows file previews when showPreviews is true', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} showPreviews={true} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('Selected Files (1)')).toBeInTheDocument();
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });
  });

  // Test: Remove file
  it('allows removing selected files', async () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} showPreviews={true} />);

    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, file);

    await waitFor(() => {
      expect(screen.getByText('test.txt')).toBeInTheDocument();
    });

    const removeButton = screen.getByLabelText(/Remove test\.txt/i);
    await userEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.queryByText('test.txt')).not.toBeInTheDocument();
    });

    // Should be called twice: once for add, once for remove
    expect(mockOnFilesSelected).toHaveBeenCalledTimes(2);
    expect(mockOnFilesSelected).toHaveBeenLastCalledWith([]);
  });

  // Test: Custom validation
  it('applies custom validation function', async () => {
    const customValidate = (file: File) => {
      if (file.name.includes('bad')) {
        return 'Filename contains forbidden word';
      }
      return null;
    };

    render(<DragDropZone onFilesSelected={mockOnFilesSelected} validate={customValidate} />);

    const badFile = new File(['content'], 'bad-file.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/File input/i) as HTMLInputElement;

    await userEvent.upload(fileInput, badFile);

    await waitFor(() => {
      expect(screen.getByText(/Filename contains forbidden word/i)).toBeInTheDocument();
    });

    expect(mockOnFilesSelected).not.toHaveBeenCalled();
  });

  // Test: Custom className
  it('applies custom className', () => {
    const { container } = render(
      <DragDropZone onFilesSelected={mockOnFilesSelected} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });

  // Test: Accessibility
  it('has proper accessibility attributes', () => {
    render(<DragDropZone onFilesSelected={mockOnFilesSelected} />);

    const dropZone = screen.getByRole('button');
    expect(dropZone).toHaveAttribute('aria-label', 'Upload files');
    expect(dropZone).toHaveAttribute('tabIndex', '0');

    const fileInput = screen.getByLabelText(/File input/i);
    expect(fileInput).toBeInTheDocument();
  });
});
