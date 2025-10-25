import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error message');
  }
  return <div>No error</div>;
};

// Mock browserLogger
jest.mock(
  '@/lib/browserLogger',
  (): Record<string, unknown> => ({
    browserLogger: {
      error: jest.fn(),
    },
  })
);

describe('ErrorBoundary', () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll((): void => {
    console.error = jest.fn();
  });

  beforeEach((): void => {
    jest.clearAllMocks();
  });

  afterEach((): void => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  afterAll((): void => {
    console.error = originalError;
    jest.restoreAllMocks();
  });

  it('should render children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('should render error UI when child throws error', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText(/The application encountered an unexpected error/)).toBeInTheDocument();
  });

  it('should display error message in details', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.getByText('Error details');
    expect(details).toBeInTheDocument();

    // Error message should be in a pre tag
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('should render custom fallback if provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });

  it('should have reload button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const reloadButton = screen.getByText('Reload Page');
    expect(reloadButton).toBeInTheDocument();
  });

  it('should have try again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Try Again button should be present
    const tryAgainButton = screen.getByText('Try Again');
    expect(tryAgainButton).toBeInTheDocument();
  });

  it('should log error to console', () => {
    const consoleErrorSpy = jest.spyOn(console, 'error');

    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should show warning icon in error UI', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check for SVG path that represents the warning icon
    const svg = document.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('should display error details in collapsible section', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const details = screen.getByText('Error details').closest('details');
    expect(details).toBeInTheDocument();
  });

  it('should apply correct styling classes', () => {
    render(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Check that error container has expected classes
    const heading = screen.getByText('Something went wrong');
    expect(heading).toHaveClass('text-xl', 'font-semibold');
  });

  it('should handle multiple errors', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('No error')).toBeInTheDocument();

    rerender(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should display boundary name when provided', () => {
    render(
      <ErrorBoundary name="TestBoundary">
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    // Error should be shown
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    render(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalled();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Test error message' }),
      expect.objectContaining({ componentStack: expect.any(String) })
    );
  });

  it('should log error with context when provided', () => {
    const { browserLogger } = require('@/lib/browserLogger');

    render(
      <ErrorBoundary name="TestBoundary" context={{ projectId: '123', page: 'test' }}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(browserLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        boundaryName: 'TestBoundary',
        projectId: '123',
        page: 'test',
      }),
      expect.stringContaining('TestBoundary')
    );
  });
});
