import React from 'react';
import { render, screen, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProgressBar, IndeterminateProgressBar } from '@/components/ui/ProgressBar';

describe('ProgressBar', () => {
  // Test: Basic rendering
  it('renders progress bar with correct value', () => {
    render(<ProgressBar progress={50} />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  // Test: Progress clamping
  it('clamps progress value between 0 and 100', () => {
    const { rerender } = render(<ProgressBar progress={-10} />);
    let progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '0');

    rerender(<ProgressBar progress={150} />);
    progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '100');
  });

  // Test: Label rendering
  it('displays label when provided', () => {
    render(<ProgressBar progress={75} label="Loading..." />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // Test: Percentage display
  it('shows percentage when showPercentage is true', () => {
    render(<ProgressBar progress={42} showPercentage={true} />);

    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('hides percentage when showPercentage is false', () => {
    render(<ProgressBar progress={42} showPercentage={false} />);

    expect(screen.queryByText('42%')).not.toBeInTheDocument();
  });

  // Test: Time elapsed display
  it('displays elapsed time when provided', () => {
    render(<ProgressBar progress={50} timeElapsed={125} />);

    expect(screen.getByText(/Elapsed:/)).toBeInTheDocument();
    expect(screen.getByText(/2m 5s/)).toBeInTheDocument();
  });

  // Test: Time remaining display
  it('displays remaining time when provided', () => {
    render(<ProgressBar progress={50} timeRemaining={60} />);

    expect(screen.getByText(/Remaining:/)).toBeInTheDocument();
    expect(screen.getByText(/1m 0s/)).toBeInTheDocument();
  });

  // Test: Time formatting
  it('formats time correctly for different durations', () => {
    const { rerender } = render(<ProgressBar progress={50} timeElapsed={30} />);
    expect(screen.getByText(/30s/)).toBeInTheDocument();

    rerender(<ProgressBar progress={50} timeElapsed={125} />);
    expect(screen.getByText(/2m 5s/)).toBeInTheDocument();

    rerender(<ProgressBar progress={50} timeElapsed={3665} />);
    expect(screen.getByText(/1h 1m/)).toBeInTheDocument();
  });

  // Test: Size variants
  it('applies correct size classes', () => {
    const { rerender, container } = render(<ProgressBar progress={50} size="sm" />);
    let progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-1');

    rerender(<ProgressBar progress={50} size="md" />);
    progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-2');

    rerender(<ProgressBar progress={50} size="lg" />);
    progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-3');
  });

  // Test: Color variants
  it('applies correct color variant classes', () => {
    const { rerender, container } = render(<ProgressBar progress={50} variant="primary" />);
    let progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-blue-200');

    rerender(<ProgressBar progress={50} variant="success" />);
    progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-green-200');

    rerender(<ProgressBar progress={50} variant="warning" />);
    progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-yellow-200');

    rerender(<ProgressBar progress={50} variant="danger" />);
    progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-red-200');

    rerender(<ProgressBar progress={50} variant="info" />);
    progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-cyan-200');
  });

  // Test: Custom className
  it('applies custom className', () => {
    const { container } = render(<ProgressBar progress={50} className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });

  // Test: Animated state
  it('applies animated class when animated prop is true', () => {
    const { container } = render(<ProgressBar progress={50} animated={true} />);
    const progressBar = container.querySelector('[role="progressbar"]')?.firstChild;

    expect(progressBar).toHaveClass('animate-pulse');
  });
});

describe('IndeterminateProgressBar', () => {
  // Test: Basic rendering
  it('renders indeterminate progress bar', () => {
    render(<IndeterminateProgressBar />);

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  // Test: Label display
  it('displays label when provided', () => {
    render(<IndeterminateProgressBar label="Loading..." />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // Test: Size variants
  it('applies correct size classes', () => {
    const { rerender, container } = render(<IndeterminateProgressBar size="sm" />);
    let progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-1');

    rerender(<IndeterminateProgressBar size="md" />);
    progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-2');

    rerender(<IndeterminateProgressBar size="lg" />);
    progressContainer = container.querySelector('[role="progressbar"]');
    expect(progressContainer).toHaveClass('h-3');
  });

  // Test: Color variants
  it('applies correct color variant classes', () => {
    const { rerender, container } = render(<IndeterminateProgressBar variant="primary" />);
    let progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-blue-200');

    rerender(<IndeterminateProgressBar variant="success" />);
    progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveClass('bg-green-200');
  });

  // Test: Custom className
  it('applies custom className', () => {
    const { container } = render(<IndeterminateProgressBar className="custom-class" />);

    expect(container.firstChild).toHaveClass('custom-class');
  });
});
