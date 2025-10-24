/**
 * Tests for Project Save/Load Functions
 *
 * @module __tests__/lib/saveLoad.test
 */

import { loadTimeline, saveTimeline } from '@/lib/saveLoad';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { browserLogger } from '@/lib/browserLogger';
import type { Timeline } from '@/types/timeline';

// Mock dependencies
jest.mock('@/lib/supabase');
jest.mock('@/lib/browserLogger');

const mockCreateBrowserSupabaseClient = createBrowserSupabaseClient as jest.MockedFunction<
  typeof createBrowserSupabaseClient
>;

describe('loadTimeline', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };

    mockCreateBrowserSupabaseClient.mockReturnValue(mockSupabase);
  });

  describe('Successful Load', () => {
    it('should load timeline successfully', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { timeline_data: mockTimeline },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-123');

      expect(result).toEqual(mockTimeline);
      expect(mockSupabase.from).toHaveBeenCalledWith('timelines');
      expect(mockQuery.select).toHaveBeenCalledWith('timeline_data');
      expect(mockQuery.eq).toHaveBeenCalledWith('project_id', 'project-123');
      expect(mockQuery.order).toHaveBeenCalledWith('updated_at', { ascending: false });
      expect(mockQuery.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when no timeline found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-456');

      expect(result).toBeNull();
    });

    it('should return null when timeline_data is null', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { timeline_data: null },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-789');

      expect(result).toBeNull();
    });

    it('should handle empty timeline data', async () => {
      const emptyTimeline: Timeline = {
        tracks: [],
        duration: 0,
        currentTime: 0,
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: { timeline_data: emptyTimeline },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-empty');

      expect(result).toEqual(emptyTimeline);
    });
  });

  describe('Error Handling', () => {
    it('should log error and return null on database error', async () => {
      const mockError = { message: 'Database connection failed' };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockResolvedValue({
          data: null,
          error: mockError,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-error');

      expect(result).toBeNull();
      expect(browserLogger.error).toHaveBeenCalledWith(
        { error: mockError, projectId: 'project-error' },
        'Failed to load timeline'
      );
    });

    it('should handle exception and return null', async () => {
      const mockError = new Error('Unexpected error');

      mockSupabase.from.mockImplementation(() => {
        throw mockError;
      });

      const result = await loadTimeline('project-exception');

      expect(result).toBeNull();
      expect(browserLogger.error).toHaveBeenCalledWith(
        { error: mockError, projectId: 'project-exception' },
        'Unexpected error loading timeline'
      );
    });

    it('should handle network errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await loadTimeline('project-network');

      expect(result).toBeNull();
      expect(browserLogger.error).toHaveBeenCalled();
    });
  });
});

describe('saveTimeline', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };

    mockCreateBrowserSupabaseClient.mockReturnValue(mockSupabase);

    // Mock Date for consistent timestamps
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Successful Save', () => {
    it('should save timeline successfully', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 5,
      };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-123', mockTimeline);

      expect(mockSupabase.from).toHaveBeenCalledWith('timelines');
      expect(mockQuery.upsert).toHaveBeenCalledWith(
        {
          project_id: 'project-123',
          timeline_data: mockTimeline,
          updated_at: '2024-01-01T00:00:00.000Z',
        },
        { onConflict: 'project_id' }
      );
      expect(browserLogger.info).toHaveBeenCalledWith(
        { projectId: 'project-123' },
        'Timeline saved successfully'
      );
    });

    it('should save timeline with complex data', async () => {
      const complexTimeline: Timeline = {
        tracks: [
          {
            id: 'track-1',
            name: 'Video Track',
            type: 'video',
            clips: [],
            locked: false,
            visible: true,
          },
        ],
        duration: 120,
        currentTime: 30,
      };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-complex', complexTimeline);

      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: 'project-complex',
          timeline_data: complexTimeline,
        }),
        { onConflict: 'project_id' }
      );
    });

    it('should use upsert with onConflict for updates', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-existing', mockTimeline);

      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.any(Object),
        { onConflict: 'project_id' }
      );
    });

    it('should update timestamp on each save', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // First save
      await saveTimeline('project-timestamp', mockTimeline);

      // Advance time
      jest.advanceTimersByTime(60000); // 1 minute

      // Second save
      await saveTimeline('project-timestamp', mockTimeline);

      expect(mockQuery.upsert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          updated_at: '2024-01-01T00:00:00.000Z',
        }),
        expect.any(Object)
      );

      expect(mockQuery.upsert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          updated_at: '2024-01-01T00:01:00.000Z',
        }),
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should log error on save failure', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockError = { message: 'Database write failed' };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({
          error: mockError,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-error', mockTimeline);

      expect(browserLogger.error).toHaveBeenCalledWith(
        { error: mockError, projectId: 'project-error' },
        'Failed to save timeline'
      );
      expect(browserLogger.info).not.toHaveBeenCalled();
    });

    it('should handle exception during save', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockError = new Error('Unexpected error');

      mockSupabase.from.mockImplementation(() => {
        throw mockError;
      });

      await saveTimeline('project-exception', mockTimeline);

      expect(browserLogger.error).toHaveBeenCalledWith(
        { error: mockError, projectId: 'project-exception' },
        'Unexpected error saving timeline'
      );
    });

    it('should handle network errors gracefully', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        upsert: jest.fn().mockRejectedValue(new Error('Network error')),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-network', mockTimeline);

      expect(browserLogger.error).toHaveBeenCalled();
    });

    it('should continue execution after error (not throw)', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        upsert: jest.fn().mockRejectedValue(new Error('Error')),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      // Should not throw
      await expect(
        saveTimeline('project-no-throw', mockTimeline)
      ).resolves.toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty project ID', async () => {
      const mockTimeline: Timeline = {
        tracks: [],
        duration: 10,
        currentTime: 0,
      };

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('', mockTimeline);

      expect(mockQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: '',
        }),
        expect.any(Object)
      );
    });

    it('should handle timeline with null values', async () => {
      const mockTimeline = {
        tracks: [],
        duration: 0,
        currentTime: 0,
      } as Timeline;

      const mockQuery = {
        upsert: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await saveTimeline('project-null', mockTimeline);

      expect(mockQuery.upsert).toHaveBeenCalled();
    });
  });
});
