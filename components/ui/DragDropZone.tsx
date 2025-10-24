'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DragDropZoneProps {
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Accepted file types (e.g., 'image/*', 'video/*', '.pdf') */
  accept?: string;
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Maximum number of files allowed */
  maxFiles?: number;
  /** Custom description text */
  description?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Show file previews */
  showPreviews?: boolean;
  /** Custom validation function */
  validate?: (file: File) => string | null;
}

interface FileWithPreview extends File {
  preview?: string;
}

const DEFAULT_MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const DEFAULT_MAX_FILES = 10;

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
}

/**
 * Get file icon based on file type
 */
function getFileIcon(file: File): React.ReactNode {
  if (file.type.startsWith('image/')) {
    return <File className="h-8 w-8 text-blue-500" />;
  } else if (file.type.startsWith('video/')) {
    return <File className="h-8 w-8 text-purple-500" />;
  } else if (file.type.startsWith('audio/')) {
    return <File className="h-8 w-8 text-green-500" />;
  }
  return <File className="h-8 w-8 text-neutral-500" />;
}

export function DragDropZone({
  onFilesSelected,
  accept,
  multiple = true,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  maxFiles = DEFAULT_MAX_FILES,
  description,
  disabled = false,
  className,
  showPreviews = true,
  validate,
}: DragDropZoneProps): React.JSX.Element {
  const [isDragActive, setIsDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Validate files before processing
   */
  const validateFiles = (files: File[]): { valid: File[]; errors: string[] } => {
    const valid: File[] = [];
    const errors: string[] = [];

    // Check max files limit
    if (files.length + selectedFiles.length > maxFiles) {
      errors.push(`Maximum ${maxFiles} file${maxFiles > 1 ? 's' : ''} allowed`);
      return { valid, errors };
    }

    for (const file of files) {
      // Check file size
      if (file.size > maxFileSize) {
        errors.push(`${file.name}: File too large (max ${formatFileSize(maxFileSize)})`);
        continue;
      }

      // Check accept types
      if (accept) {
        const acceptedTypes = accept.split(',').map((t) => t.trim());
        const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
        const isAccepted = acceptedTypes.some((type) => {
          if (type.startsWith('.')) {
            return fileExtension === type.toLowerCase();
          }
          if (type.endsWith('/*')) {
            const typePrefix = type.slice(0, -2);
            return file.type.startsWith(typePrefix);
          }
          return file.type === type;
        });

        if (!isAccepted) {
          errors.push(`${file.name}: File type not accepted`);
          continue;
        }
      }

      // Custom validation
      if (validate) {
        const customError = validate(file);
        if (customError) {
          errors.push(`${file.name}: ${customError}`);
          continue;
        }
      }

      valid.push(file);
    }

    return { valid, errors };
  };

  /**
   * Handle file selection
   */
  const handleFiles = (files: File[]) => {
    const { valid, errors: validationErrors } = validateFiles(files);

    if (validationErrors.length > 0) {
      setErrors(validationErrors);
    } else {
      setErrors([]);
    }

    if (valid.length > 0) {
      const filesWithPreviews = valid.map((file) => {
        const fileWithPreview = file as FileWithPreview;
        // Create preview for images
        if (file.type.startsWith('image/')) {
          fileWithPreview.preview = URL.createObjectURL(file);
        }
        return fileWithPreview;
      });

      const newFiles = multiple ? [...selectedFiles, ...filesWithPreviews] : filesWithPreviews;

      setSelectedFiles(newFiles);
      onFilesSelected(newFiles);
    }
  };

  /**
   * Handle drag events
   */
  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragActive(true);
    }
  };

  const handleDragOut = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  /**
   * Handle file input change
   */
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  /**
   * Remove a file from selection
   */
  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);

    // Revoke object URL to prevent memory leaks
    const file = selectedFiles[index];
    if (file?.preview) {
      URL.revokeObjectURL(file.preview);
    }

    setSelectedFiles(newFiles);
    onFilesSelected(newFiles);
    setErrors([]);
  };

  /**
   * Open file picker
   */
  const openFilePicker = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  /**
   * Cleanup previews on unmount
   */
  React.useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [selectedFiles]);

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFilePicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openFilePicker();
          }
        }}
        className={cn(
          'relative cursor-pointer rounded-lg border-2 border-dashed transition-all duration-200',
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload files"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="File input"
        />

        <div className="flex flex-col items-center justify-center py-12 px-6">
          <Upload
            className={cn(
              'mb-4 h-12 w-12 transition-colors',
              isDragActive ? 'text-blue-500' : 'text-neutral-400'
            )}
          />
          <p className="mb-2 text-sm font-semibold text-neutral-700">
            {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
          </p>
          <p className="text-xs text-neutral-500">
            {description || `or click to browse (max ${formatFileSize(maxFileSize)})`}
          </p>
          {accept && <p className="mt-2 text-xs text-neutral-400">Accepted: {accept}</p>}
        </div>
      </div>

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="mt-3 rounded-lg bg-red-50 px-4 py-3">
          <p className="text-sm font-semibold text-red-900 mb-1">Upload Errors:</p>
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index} className="text-xs text-red-700">
                {error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* File previews */}
      {showPreviews && selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-neutral-700">
            Selected Files ({selectedFiles.length})
          </p>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3"
              >
                {file.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.preview}
                    alt={file.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  getFileIcon(file)
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">{file.name}</p>
                  <p className="text-xs text-neutral-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  className="rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
                  aria-label={`Remove ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
