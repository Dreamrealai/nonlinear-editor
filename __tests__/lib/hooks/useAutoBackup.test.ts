/**
 * Tests for useAutoBackup Hook
 *
 * Tests automatic backup functionality with exponential backoff and error handling.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAutoBackup } from '@/lib/hooks/useAutoBackup';
import { browserLogger } from '@/lib/browserLogger';
import type { ProjectId } from '@/types/branded';

// Mock browser logger
const mockBrowserLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

jest.mock('@/lib/browserLogger', () => ({
  browserLogger: mockBrowserLogger,
}));

describe('useAutoBackup', () => {
  const mockProjectId = 'project-123' as ProjectId;

  beforeEach(() => {
    jest.clearAllMocks();
    mockBrowserLogger.debug.mockClear();
    mockBrowserLogger.info.mockClear();
    mockBrowserLogger.warn.mockClear();
    mockBrowserLogger.error.mockClear();
    jest.useFakeTimers();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initialization and Cleanup', () => {
    it('should not create backup immediately on mount', () => {
      renderHook(() => useAutoBackup(mockProjectId));

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create initial backup after 30 seconds', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ backup: { id: 'backup-1' } }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Fast-forward 30 seconds
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/projects/${mockProjectId}/backups`,
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ backupType: 'auto' }),
          })
        );
      });
    });

    it('should set up periodic backups every 5 minutes', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ backup: { id: 'backup-1' } }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Fast-forward past initial backup
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      // Fast-forward 5 minutes
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });
    });

    it('should cleanup intervals on unmount', () => {
      const { unmount } = renderHook(() => useAutoBackup(mockProjectId));

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Successful Backups', () => {
    it('should log success when backup succeeds', async () => {
      const mockBackupId = 'backup-123';
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ backup: { id: mockBackupId } }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.info).toHaveBeenCalledWith(
          { projectId: mockProjectId, backupId: mockBackupId },
          'Auto backup created'
        );
      });
    });

    it('should reset backoff delay after successful backup', async () => {
      // First backup fails with 429
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Trigger first backup (fails)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.warn).toHaveBeenCalled();
      });

      // Second backup succeeds
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ backup: { id: 'backup-1' } }),
      });

      // Fast-forward past backoff delay (at least 5 minutes)
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: mockProjectId }),
          'Auto backup created'
        );
      });
    });
  });

  describe('Rate Limit Handling (429)', () => {
    it('should apply exponential backoff on 429 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Trigger first backup
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: mockProjectId,
            status: 429,
            consecutiveFailures: 1,
          }),
          'Rate limit hit for auto backup, applying exponential backoff'
        );
      });
    });

    it('should skip backup during backoff period', async () => {
      // First request triggers rate limit
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Trigger first backup (rate limited)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.clearAllMocks();

      // Try again before backoff expires (should be skipped)
      act(() => {
        jest.advanceTimersByTime(30000); // Only 30s later, backoff is 1 minute
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should log debug message about skipping
      expect(mockBrowserLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: mockProjectId,
        }),
        'Skipping backup due to backoff period'
      );
    });

    it('should increase backoff delay on consecutive failures', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // First failure
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ consecutiveFailures: 1 }),
          expect.any(String)
        );
      });

      // Allow backoff to expire and trigger second failure
      act(() => {
        jest.advanceTimersByTime(6 * 60 * 1000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({ consecutiveFailures: 2 }),
          expect.any(String)
        );
      });
    });
  });

  describe('Server Error Handling (500)', () => {
    it('should handle 500 error gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error', details: 'Schema mismatch' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.warn).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: mockProjectId,
            status: 500,
            error: 'Database error',
            details: 'Schema mismatch',
          }),
          'Auto backup failed due to server error - continuing without backup'
        );
      });
    });

    it('should disable auto-backups temporarily on 500 error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Database error' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // Trigger first backup (500 error)
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.clearAllMocks();

      // Try again after 5 minutes (should be skipped due to long backoff)
      act(() => {
        jest.advanceTimersByTime(5 * 60 * 1000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should not make another request
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Other Error Handling', () => {
    it('should log other HTTP errors without throwing', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad request' }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            projectId: mockProjectId,
            status: 400,
            error: 'Bad request',
          }),
          'Auto backup failed'
        );
      });
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(Error),
            projectId: mockProjectId,
          }),
          'Failed to create auto backup'
        );
      });
    });

    it('should not show toast error for auto backups', async () => {
      // This test verifies that errors don't propagate (no throw)
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      expect(() => {
        renderHook(() => useAutoBackup(mockProjectId));

        act(() => {
          jest.advanceTimersByTime(30000);
        });
      }).not.toThrow();
    });
  });

  describe('Timing and Intervals', () => {
    it('should not create backup before AUTO_BACKUP_INTERVAL elapses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ backup: { id: 'backup-1' } }),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      // First backup at 30s
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledTimes(1);
      });

      jest.clearAllMocks();

      // Only 2 minutes later (less than 5 minute interval)
      act(() => {
        jest.advanceTimersByTime(2 * 60 * 1000);
      });

      await act(async () => {
        await Promise.resolve();
      });

      // Should not create another backup yet
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should clear existing interval when projectId changes', () => {
      const { rerender } = renderHook(({ projectId }) => useAutoBackup(projectId), {
        initialProps: { projectId: 'project-1' as ProjectId },
      });

      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      // Change project ID
      rerender({ projectId: 'project-2' as ProjectId });

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty response data', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.info).toHaveBeenCalledWith(
          expect.objectContaining({ projectId: mockProjectId, backupId: undefined }),
          'Auto backup created'
        );
      });
    });

    it('should handle JSON parse errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => {
          throw new Error('JSON parse error');
        },
      });

      renderHook(() => useAutoBackup(mockProjectId));

      act(() => {
        jest.advanceTimersByTime(30000);
      });

      await waitFor(() => {
        expect(mockBrowserLogger.error).toHaveBeenCalledWith(
          expect.objectContaining({
            error: expect.any(Error),
            projectId: mockProjectId,
          }),
          'Failed to create auto backup'
        );
      });
    });
  });
});
