/**
 * Tests for GenerationDashboard Component
 *
 * Tests the unified dashboard for tracking AI generation jobs (video, audio, image)
 * Covers rendering, filtering, job management, and user interactions
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import {
  GenerationDashboard,
  useGenerationDashboardModal,
} from '@/components/generation/GenerationDashboard';
import { useGenerationDashboard } from '@/lib/hooks/useGenerationDashboard';
import type { GenerationJob } from '@/lib/hooks/useGenerationDashboard';

// Mock the hook
jest.mock('@/lib/hooks/useGenerationDashboard');

const mockUseGenerationDashboard = useGenerationDashboard as jest.MockedFunction<
  typeof useGenerationDashboard
>;

// Mock job data
const createMockJob = (overrides: Partial<GenerationJob> = {}): GenerationJob => ({
  id: 'job-1',
  type: 'video',
  status: 'processing',
  progress: 50,
  title: 'Test Video Generation',
  prompt: 'A test video',
  model: 'veo-2.0',
  operationName: 'test-op',
  projectId: 'project-1',
  startedAt: new Date('2024-01-01T12:00:00Z'),
  ...overrides,
});

describe('GenerationDashboard', () => {
  const mockFns = {
    removeJob: jest.fn(),
    clearCompleted: jest.fn(),
    clearFailed: jest.fn(),
    clearAll: jest.fn(),
    refresh: jest.fn(),
    addJob: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGenerationDashboard.mockReturnValue({
      jobs: [],
      videoJobs: [],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });
  });

  // Test: Basic rendering when open
  it('renders dashboard when isOpen is true', () => {
    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Generation Dashboard')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
  });

  // Test: Does not render when closed
  it('returns null when isOpen is false', () => {
    const onClose = jest.fn();
    const { container } = render(<GenerationDashboard isOpen={false} onClose={onClose} />);

    expect(container.firstChild).toBeNull();
  });

  // Test: Close button functionality
  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Test: Refresh button functionality
  it('calls refresh when refresh button is clicked', async () => {
    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    await act(async () => {
      fireEvent.click(refreshButton);
    });

    expect(mockFns.refresh).toHaveBeenCalledTimes(1);
  });

  // Test: Empty state display
  it('displays empty state when no jobs exist', () => {
    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('No generations found')).toBeInTheDocument();
    expect(screen.getByText(/start generating videos, audio, or images/i)).toBeInTheDocument();
  });

  // Test: Displays job list
  it('displays jobs when they exist', () => {
    const job = createMockJob();
    mockUseGenerationDashboard.mockReturnValue({
      jobs: [job],
      videoJobs: [job],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [job],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Test Video Generation')).toBeInTheDocument();
    expect(screen.getByText('A test video')).toBeInTheDocument();
  });

  // Test: Job status counts
  it('displays correct job status counts in header', () => {
    const activeJob = createMockJob({ status: 'processing' });
    const completedJob = createMockJob({ id: 'job-2', status: 'completed' });
    const failedJob = createMockJob({ id: 'job-3', status: 'failed' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [activeJob, completedJob, failedJob],
      videoJobs: [activeJob, completedJob, failedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [activeJob],
      completedJobs: [completedJob],
      failedJobs: [failedJob],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText(/1 active • 1 completed • 1 failed/)).toBeInTheDocument();
  });

  // Test: Type filter - All
  it('shows all jobs when "All" filter is selected', () => {
    const videoJob = createMockJob({ id: 'job-1', type: 'video' });
    const audioJob = createMockJob({ id: 'job-2', type: 'audio', title: 'Test Audio' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [videoJob, audioJob],
      videoJobs: [videoJob],
      audioJobs: [audioJob],
      imageJobs: [],
      activeJobs: [videoJob, audioJob],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Test Video Generation')).toBeInTheDocument();
    expect(screen.getByText('Test Audio')).toBeInTheDocument();
  });

  // Test: Type filter - Video only
  it('filters to video jobs when video filter is clicked', () => {
    const videoJob = createMockJob({ id: 'job-1', type: 'video' });
    const audioJob = createMockJob({ id: 'job-2', type: 'audio', title: 'Test Audio' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [videoJob, audioJob],
      videoJobs: [videoJob],
      audioJobs: [audioJob],
      imageJobs: [],
      activeJobs: [videoJob, audioJob],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    // Click video filter button
    const videoButton = screen.getByRole('button', { name: /video \(1\)/i });
    fireEvent.click(videoButton);

    // Video job should be visible
    expect(screen.getByText('Test Video Generation')).toBeInTheDocument();
    // Audio job should not be visible
    expect(screen.queryByText('Test Audio')).not.toBeInTheDocument();
  });

  // Test: Status filter - Active only
  it('filters to active jobs when active filter is clicked', () => {
    const activeJob = createMockJob({ id: 'job-1', status: 'processing' });
    const completedJob = createMockJob({
      id: 'job-2',
      status: 'completed',
      title: 'Completed Job',
    });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [activeJob, completedJob],
      videoJobs: [activeJob, completedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [activeJob],
      completedJobs: [completedJob],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    // Click active filter
    const activeButton = screen.getByRole('button', { name: /active \(1\)/i });
    fireEvent.click(activeButton);

    // Active job should be visible
    expect(screen.getByText('Test Video Generation')).toBeInTheDocument();
    // Completed job should not be visible
    expect(screen.queryByText('Completed Job')).not.toBeInTheDocument();
  });

  // Test: Clear completed button
  it('shows clear completed button when completed jobs exist', () => {
    const completedJob = createMockJob({ status: 'completed' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [completedJob],
      videoJobs: [completedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [completedJob],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByRole('button', { name: /clear completed/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(mockFns.clearCompleted).toHaveBeenCalledTimes(1);
  });

  // Test: Clear failed button
  it('shows clear failed button when failed jobs exist', () => {
    const failedJob = createMockJob({ status: 'failed' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [failedJob],
      videoJobs: [failedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [],
      failedJobs: [failedJob],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByRole('button', { name: /clear failed/i });
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(mockFns.clearFailed).toHaveBeenCalledTimes(1);
  });

  // Test: Clear all button
  it('shows clear all button and calls clearAll', () => {
    const job = createMockJob();

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [job],
      videoJobs: [job],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [job],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const clearButton = screen.getByRole('button', { name: /clear all/i });
    fireEvent.click(clearButton);
    expect(mockFns.clearAll).toHaveBeenCalledTimes(1);
  });

  // Test: Remove individual job
  it('removes job when remove button is clicked', () => {
    const job = createMockJob();

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [job],
      videoJobs: [job],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [job],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const removeButton = screen.getByRole('button', { name: /remove job/i });
    fireEvent.click(removeButton);

    expect(mockFns.removeJob).toHaveBeenCalledWith('job-1');
  });

  // Test: Modal variant
  it('renders as modal variant with backdrop', () => {
    const onClose = jest.fn();
    const { container } = render(
      <GenerationDashboard isOpen={true} onClose={onClose} variant="modal" />
    );

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).toBeInTheDocument();
    expect(backdrop).toHaveClass('bg-black/50');
  });

  // Test: Sidebar variant
  it('renders as sidebar variant without backdrop', () => {
    const onClose = jest.fn();
    const { container } = render(
      <GenerationDashboard isOpen={true} onClose={onClose} variant="sidebar" />
    );

    const backdrop = container.querySelector('.fixed.inset-0');
    expect(backdrop).not.toBeInTheDocument();

    const sidebar = container.querySelector('.border-l');
    expect(sidebar).toBeInTheDocument();
  });

  // Test: Modal backdrop click closes dashboard
  it('closes dashboard when modal backdrop is clicked', () => {
    const onClose = jest.fn();
    const { container } = render(
      <GenerationDashboard isOpen={true} onClose={onClose} variant="modal" />
    );

    const backdrop = container.querySelector('.fixed.inset-0');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    }
  });

  // Test: Loading state
  it('displays loading spinner on refresh button when loading', () => {
    mockUseGenerationDashboard.mockReturnValue({
      jobs: [],
      videoJobs: [],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [],
      failedJobs: [],
      isLoading: true,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    const { container } = render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    expect(refreshButton).toBeDisabled();

    // Check for animate-spin class indicating loading
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // Test: Job with error message
  it('displays error message for failed jobs', () => {
    const failedJob = createMockJob({
      status: 'failed',
      error: 'Generation timeout',
    });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [failedJob],
      videoJobs: [failedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [],
      failedJobs: [failedJob],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Generation timeout')).toBeInTheDocument();
  });

  // Test: Completed job shows success message
  it('displays success message for completed jobs', () => {
    const completedJob = createMockJob({
      status: 'completed',
      assetId: 'asset-1',
    });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [completedJob],
      videoJobs: [completedJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [],
      completedJobs: [completedJob],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    expect(screen.getByText('Generation completed!')).toBeInTheDocument();
  });

  // Test: Progress bar for active jobs
  it('displays progress bar for processing jobs', () => {
    const processingJob = createMockJob({
      status: 'processing',
      progress: 75,
    });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [processingJob],
      videoJobs: [processingJob],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [processingJob],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} />);

    // GenerationProgress component should be rendered
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
  });

  // Test: Project ID filtering
  it('filters jobs by projectId when provided', () => {
    const job1 = createMockJob({ id: 'job-1', projectId: 'project-1' });
    const job2 = createMockJob({ id: 'job-2', projectId: 'project-2', title: 'Other Project' });

    mockUseGenerationDashboard.mockReturnValue({
      jobs: [job1], // Hook already filtered by projectId
      videoJobs: [job1],
      audioJobs: [],
      imageJobs: [],
      activeJobs: [job1],
      completedJobs: [],
      failedJobs: [],
      isLoading: false,
      error: null,
      ...mockFns,
    });

    const onClose = jest.fn();
    render(<GenerationDashboard isOpen={true} onClose={onClose} projectId="project-1" />);

    expect(screen.getByText('Test Video Generation')).toBeInTheDocument();
    expect(screen.queryByText('Other Project')).not.toBeInTheDocument();
  });
});

describe('useGenerationDashboardModal', () => {
  // Test: Initial state is closed
  it('returns initial state with isOpen false', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useGenerationDashboardModal()
    );

    expect(result.current.isOpen).toBe(false);
  });

  // Test: Open functionality
  it('opens modal when open() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useGenerationDashboardModal()
    );

    act(() => {
      result.current.open();
    });

    expect(result.current.isOpen).toBe(true);
  });

  // Test: Close functionality
  it('closes modal when close() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useGenerationDashboardModal()
    );

    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.close();
    });
    expect(result.current.isOpen).toBe(false);
  });

  // Test: Toggle functionality
  it('toggles modal state when toggle() is called', () => {
    const { result } = require('@testing-library/react').renderHook(() =>
      useGenerationDashboardModal()
    );

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(true);

    act(() => {
      result.current.toggle();
    });
    expect(result.current.isOpen).toBe(false);
  });
});
