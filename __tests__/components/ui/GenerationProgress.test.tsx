import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GenerationProgress, GenerationStarting } from '@/components/ui/GenerationProgress';

describe('GenerationProgress', () => {
  // Test: Basic rendering
  it('renders with progress and status message', () => {
    render(<GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} />);

    // Check for status live region
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(status).toHaveAttribute('aria-live', 'polite');

    // Check for progress percentage
    expect(screen.getByText('50% complete')).toBeInTheDocument();

    // Check for attempt counter
    expect(screen.getByText('Attempt 5/10')).toBeInTheDocument();
  });

  // Test: Custom status message
  it('displays custom status message when provided', () => {
    render(
      <GenerationProgress
        progress={25}
        currentAttempt={3}
        maxAttempts={10}
        statusMessage="Custom processing message"
      />
    );

    expect(screen.getByText('Custom processing message')).toBeInTheDocument();
  });

  // Test: Auto-generated status messages based on progress
  it('generates appropriate status messages based on progress', () => {
    const { rerender } = render(
      <GenerationProgress progress={0} currentAttempt={1} maxAttempts={10} />
    );
    expect(screen.getByText('Initializing...')).toBeInTheDocument();

    rerender(<GenerationProgress progress={15} currentAttempt={2} maxAttempts={10} />);
    expect(screen.getByText('Processing request...')).toBeInTheDocument();

    rerender(
      <GenerationProgress
        progress={45}
        currentAttempt={5}
        maxAttempts={10}
        generationType="video"
      />
    );
    expect(screen.getByText('Generating video...')).toBeInTheDocument();

    rerender(<GenerationProgress progress={75} currentAttempt={8} maxAttempts={10} />);
    expect(screen.getByText('Almost done...')).toBeInTheDocument();

    rerender(<GenerationProgress progress={95} currentAttempt={9} maxAttempts={10} />);
    expect(screen.getByText('Finalizing...')).toBeInTheDocument();
  });

  // Test: Generation type variations
  it('uses correct generation type in status message', () => {
    const { rerender } = render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        generationType="video"
      />
    );
    expect(screen.getByText('Generating video...')).toBeInTheDocument();

    rerender(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        generationType="audio"
      />
    );
    expect(screen.getByText('Generating audio...')).toBeInTheDocument();

    rerender(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        generationType="image"
      />
    );
    expect(screen.getByText('Generating image...')).toBeInTheDocument();
  });

  // Test: Cancel button functionality
  it('renders cancel button when showCancel is true and calls handler on click', () => {
    const mockOnCancel = jest.fn();

    render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        showCancel={true}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel generation/i });
    expect(cancelButton).toBeInTheDocument();

    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  // Test: Cancel button hidden when showCancel is false
  it('hides cancel button when showCancel is false', () => {
    render(
      <GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} showCancel={false} />
    );

    const cancelButton = screen.queryByRole('button', { name: /cancel generation/i });
    expect(cancelButton).not.toBeInTheDocument();
  });

  // Test: Cancel button hidden when onCancel is not provided
  it('hides cancel button when onCancel is not provided', () => {
    render(
      <GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} showCancel={true} />
    );

    const cancelButton = screen.queryByRole('button', { name: /cancel generation/i });
    expect(cancelButton).not.toBeInTheDocument();
  });

  // Test: Time remaining estimation
  it('displays estimated time remaining', () => {
    render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        estimatedTimeRemaining={120}
      />
    );

    expect(screen.getByText(/~2m remaining/i)).toBeInTheDocument();
  });

  // Test: Time formatting variations
  it('formats time remaining correctly', () => {
    const { rerender } = render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        estimatedTimeRemaining={30}
      />
    );
    expect(screen.getByText(/~30s remaining/i)).toBeInTheDocument();

    rerender(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        estimatedTimeRemaining={180}
      />
    );
    expect(screen.getByText(/~3m remaining/i)).toBeInTheDocument();

    rerender(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        estimatedTimeRemaining={3900}
      />
    );
    expect(screen.getByText(/~1h 5m remaining/i)).toBeInTheDocument();
  });

  // Test: Starting state (0% progress)
  it('displays appropriate text when progress is 0', () => {
    render(<GenerationProgress progress={0} currentAttempt={0} maxAttempts={10} />);

    expect(screen.getByText('Starting...')).toBeInTheDocument();
  });

  // Test: Progress bar present
  it('renders progress bar component', () => {
    render(<GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  // Test: Helper text
  it('displays helper text about navigation', () => {
    render(<GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} />);

    expect(
      screen.getByText(/This may take several minutes. You can navigate away and come back later./i)
    ).toBeInTheDocument();
  });

  // Test: Custom className
  it('applies custom className', () => {
    const { container } = render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        className="custom-class"
      />
    );

    const statusDiv = container.querySelector('.custom-class');
    expect(statusDiv).toBeInTheDocument();
  });

  // Test: Compact variant
  it('renders compact variant correctly', () => {
    render(
      <GenerationProgress progress={50} currentAttempt={5} maxAttempts={10} variant="compact" />
    );

    // Compact variant should still show status
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();

    // Should NOT show the helper text in compact mode
    expect(screen.queryByText(/This may take several minutes/i)).not.toBeInTheDocument();

    // Should NOT show progress percentage in compact mode
    expect(screen.queryByText('50% complete')).not.toBeInTheDocument();

    // Should NOT show attempt counter in compact mode
    expect(screen.queryByText('Attempt 5/10')).not.toBeInTheDocument();
  });

  // Test: Accessibility - ARIA labels
  it('has proper ARIA attributes', () => {
    render(
      <GenerationProgress
        progress={50}
        currentAttempt={5}
        maxAttempts={10}
        statusMessage="Test message"
      />
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Generation progress: Test message');
  });
});

describe('GenerationStarting', () => {
  // Test: Basic rendering
  it('renders with default generation type', () => {
    render(<GenerationStarting />);

    expect(screen.getByText(/Starting content generation.../i)).toBeInTheDocument();
  });

  // Test: Custom generation type
  it('renders with custom generation type', () => {
    render(<GenerationStarting generationType="video" />);

    expect(screen.getByText(/Starting video generation.../i)).toBeInTheDocument();
  });

  // Test: ARIA attributes
  it('has proper ARIA attributes', () => {
    render(<GenerationStarting generationType="audio" />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label', 'Starting audio generation');
  });

  // Test: Custom className
  it('applies custom className', () => {
    const { container } = render(<GenerationStarting className="custom-starting" />);

    const statusDiv = container.querySelector('.custom-starting');
    expect(statusDiv).toBeInTheDocument();
  });
});
