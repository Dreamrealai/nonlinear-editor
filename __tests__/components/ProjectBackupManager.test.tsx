/**
 * Tests for ProjectBackupManager Component
 *
 * Tests backup management UI with version history
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProjectBackupManager } from '@/components/ProjectBackupManager';

// Mock fetch
global.fetch = jest.fn();

// Mock toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    success: jest.fn(),
  },
}));

// Mock browser logger
jest.mock('@/lib/browserLogger', () => ({
  browserLogger: {
    error: jest.fn(),
  },
}));

// Mock window.confirm
global.confirm = jest.fn(() => true);

const mockBackup = {
  id: 'backup-1',
  backup_name: 'Auto Backup - 2024-01-01',
  backup_type: 'auto' as const,
  created_at: '2024-01-01T12:00:00Z',
  project_id: 'project-1',
};

describe('ProjectBackupManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [] }),
    });
  });

  it('renders backup manager interface', async () => {
    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Project Backups')).toBeInTheDocument();
    });
  });

  it('displays loading state initially', () => {
    const { container } = render(<ProjectBackupManager projectId="project-1" />);

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('loads backups on mount', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [mockBackup] }),
    });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/project-1/backups');
    });
  });

  it('displays empty state when no backups', async () => {
    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('No backups yet')).toBeInTheDocument();
      expect(screen.getByText(/create your first backup/i)).toBeInTheDocument();
    });
  });

  it('displays backup list when backups exist', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [mockBackup] }),
    });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Auto Backup - 2024-01-01')).toBeInTheDocument();
    });
  });

  it('shows auto backup badge', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [mockBackup] }),
    });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Auto')).toBeInTheDocument();
    });
  });

  it('shows manual backup badge', async () => {
    const manualBackup = { ...mockBackup, backup_type: 'manual' as const };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [manualBackup] }),
    });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('Manual')).toBeInTheDocument();
    });
  });

  it('creates backup when create button is clicked', async () => {
    const toast = require('react-hot-toast').default;

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [mockBackup] }) });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => screen.getByText('Project Backups'));

    const createButton = screen.getByRole('button', { name: /create backup/i });
    await act(async () => {
      fireEvent.click(createButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/projects/project-1/backups',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  it('shows restore confirmation dialog', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ backups: [mockBackup] }),
    });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => screen.getByText('Auto Backup - 2024-01-01'));

    const restoreButton = screen.getByRole('button', { name: /restore/i });
    fireEvent.click(restoreButton);

    await waitFor(() => {
      expect(screen.getByText('Restore Backup?')).toBeInTheDocument();
    });
  });

  it('restores backup when confirmed', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [mockBackup] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) });

    // Mock window.location.reload
    delete (window as any).location;
    window.location = { reload: jest.fn() } as any;

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => screen.getByText('Auto Backup - 2024-01-01'));

    const restoreButton = screen.getByRole('button', { name: /restore/i });
    fireEvent.click(restoreButton);

    await waitFor(() => screen.getByText('Restore Backup?'));

    const confirmButton = screen.getByRole('button', { name: /restore backup/i });
    await act(async () => {
      fireEvent.click(confirmButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/project-1/backups/${mockBackup.id}/restore`,
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('downloads backup', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [mockBackup] }) })
      .mockResolvedValueOnce({
        ok: true,
        blob: async () => new Blob(['backup data']),
      });

    // Mock URL and document methods
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = jest.fn();
    document.body.appendChild = jest.fn();
    document.body.removeChild = jest.fn();

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => screen.getByText('Auto Backup - 2024-01-01'));

    const downloadButton = screen.getByRole('button', { name: /download/i });
    await act(async () => {
      fireEvent.click(downloadButton);
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(`/api/projects/project-1/backups/${mockBackup.id}`);
    });
  });

  it('deletes backup with confirmation', async () => {
    (global.confirm as jest.Mock).mockReturnValue(true);
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [mockBackup] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ backups: [] }) });

    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => screen.getByText('Auto Backup - 2024-01-01'));

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await act(async () => {
      fireEvent.click(deleteButton);
    });

    expect(global.confirm).toHaveBeenCalled();

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        `/api/projects/project-1/backups/${mockBackup.id}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('displays backup information', async () => {
    render(<ProjectBackupManager projectId="project-1" />);

    await waitFor(() => {
      expect(screen.getByText('About Backups')).toBeInTheDocument();
      expect(screen.getByText(/auto backups are created every 5 minutes/i)).toBeInTheDocument();
    });
  });

  it('shows project title in header', async () => {
    render(<ProjectBackupManager projectId="project-1" projectTitle="My Project" />);

    await waitFor(() => {
      expect(screen.getByText(/my project/i)).toBeInTheDocument();
    });
  });
});
