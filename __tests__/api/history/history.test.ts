/**
 * Tests for /api/history - User Activity History API
 *
 * Tests cover GET (fetch history), POST (add entry), DELETE (clear history)
 * with authentication, validation, pagination, and error handling.
 */

import { NextRequest } from 'next/server';
import { GET, POST, DELETE } from '@/app/api/history/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/test-utils';

// Mock modules
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      if (!supabase || !supabase.auth) {
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return handler(req, { user, supabase, params: context?.params || {} });
    }),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock('@/lib/api/response', () => {
  const actual = jest.requireActual('@/lib/api/response');
  return {
    ...actual,
    withErrorHandling: (handler: any) => handler,
  };
});

jest.mock(
  '@/lib/rateLimit',
  () => ({
    checkRateLimit: jest.fn().mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      resetAt: Date.now() + 60000,
    }),
    RATE_LIMITS: {
      tier3_status_read: { requests: 30, window: 60 },
    },
  })
);

describe('GET /api/history', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    mockRequest = new NextRequest('http://localhost/api/history', {
      method: 'GET',
    });
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await GET(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce tier3 rate limiting (30/min)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      checkRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 30,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });

    it('should use user-specific rate limit identifier', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      await GET(mockRequest);

      expect(checkRateLimit).toHaveBeenCalledWith(`history-get:${mockUser.id}`, expect.any(Object));
    });
  });

  describe('Pagination', () => {
    it('should use default pagination (limit: 50, offset: 0)', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      await GET(mockRequest);

      expect(mockSupabase.range).toHaveBeenCalledWith(0, 49); // offset 0, offset + limit - 1
    });

    it('should accept custom limit parameter', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const requestWithLimit = new NextRequest('http://localhost/api/history?limit=10', {
        method: 'GET',
      });

      await GET(requestWithLimit);

      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
    });

    it('should accept custom offset parameter', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const requestWithOffset = new NextRequest('http://localhost/api/history?offset=20', {
        method: 'GET',
      });

      await GET(requestWithOffset);

      expect(mockSupabase.range).toHaveBeenCalledWith(20, 69); // offset 20, offset + default limit - 1
    });

    it('should accept both limit and offset parameters', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const requestWithParams = new NextRequest('http://localhost/api/history?limit=25&offset=50', {
        method: 'GET',
      });

      await GET(requestWithParams);

      expect(mockSupabase.range).toHaveBeenCalledWith(50, 74);
    });

    it('should enforce maximum limit of 100', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const requestWithHighLimit = new NextRequest('http://localhost/api/history?limit=150', {
        method: 'GET',
      });

      const response = await GET(requestWithHighLimit);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('limit');
    });

    it('should enforce minimum limit of 1', async () => {
      mockAuthenticatedUser(mockSupabase);

      const requestWithZeroLimit = new NextRequest('http://localhost/api/history?limit=0', {
        method: 'GET',
      });

      const response = await GET(requestWithZeroLimit);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('limit');
    });

    it('should enforce minimum offset of 0', async () => {
      mockAuthenticatedUser(mockSupabase);

      const requestWithNegativeOffset = new NextRequest('http://localhost/api/history?offset=-1', {
        method: 'GET',
      });

      const response = await GET(requestWithNegativeOffset);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('offset');
    });

    it('should reject invalid limit format', async () => {
      mockAuthenticatedUser(mockSupabase);

      const requestWithInvalidLimit = new NextRequest(
        'http://localhost/api/history?limit=invalid',
        {
          method: 'GET',
        }
      );

      const response = await GET(requestWithInvalidLimit);

      expect(response.status).toBe(400);
    });
  });

  describe('Query Execution', () => {
    it('should query user_activity_history table', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      await GET(mockRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should order results by created_at descending', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      await GET(mockRequest);

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('should return history data with count', async () => {
      mockAuthenticatedUser(mockSupabase);

      const mockHistory = [
        {
          id: '1',
          user_id: 'test-user-id',
          activity_type: 'video_generation',
          title: 'Generated video',
          created_at: '2025-01-01T00:00:00Z',
        },
        {
          id: '2',
          user_id: 'test-user-id',
          activity_type: 'image_upload',
          title: 'Uploaded image',
          created_at: '2025-01-01T01:00:00Z',
        },
      ];

      mockSupabase.range.mockResolvedValue({
        data: mockHistory,
        error: null,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.history).toEqual(mockHistory);
      expect(data.data.count).toBe(2);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.range.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        'Unable to load your activity history. Please refresh the page and try again.'
      );
    });

    it('should handle empty results gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.range.mockResolvedValue({
        data: [],
        error: null,
      });

      const response = await GET(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.history).toEqual([]);
      expect(data.data.count).toBe(0);
    });
  });
});

describe('DELETE /api/history', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    mockRequest = new NextRequest('http://localhost/api/history', {
      method: 'DELETE',
    });
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Deletion', () => {
    it('should delete all activity history for the user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockResolvedValue({ error: null });

      await DELETE(mockRequest);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_activity_history');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should return success message', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('Activity history cleared');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when deletion fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      const response = await DELETE(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        'Unable to clear your activity history. Please try again or contact support if the problem persists.'
      );
    });
  });
});

describe('POST /api/history', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'video_generation',
          title: 'Test video',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'test-activity-id',
          user_id: mockUser.id,
          activity_type: 'video_generation',
          title: 'Test video',
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'video_generation',
          title: 'Test video',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Input Validation', () => {
    it('should validate activity_type is required', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('activity_type');
    });

    it('should validate activity_type is a valid enum value', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'invalid_type',
          title: 'Test',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('activity_type');
    });

    it('should accept valid activity types', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const validTypes = [
        'video_generation',
        'audio_generation',
        'image_upload',
        'video_upload',
        'audio_upload',
        'frame_edit',
        'video_upscale',
      ];

      for (const activityType of validTypes) {
        mockSupabase.single.mockResolvedValue({
          data: {
            id: 'test-id',
            user_id: mockUser.id,
            activity_type: activityType,
            title: 'Test',
          },
          error: null,
        });

        mockRequest = new NextRequest('http://localhost/api/history', {
          method: 'POST',
          body: JSON.stringify({
            activity_type: activityType,
            title: 'Test',
          }),
        });

        const response = await POST(mockRequest);
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Activity Entry Creation', () => {
    it('should insert activity with all fields', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const activityData = {
        project_id: 'test-project-id',
        activity_type: 'video_generation',
        title: 'Generated video',
        description: 'Test description',
        model: 'test-model',
        asset_id: 'test-asset-id',
        metadata: { duration: 10 },
      };

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'test-activity-id',
          user_id: mockUser.id,
          ...activityData,
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify(activityData),
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUser.id,
          project_id: 'test-project-id',
          activity_type: 'video_generation',
          title: 'Generated video',
          description: 'Test description',
          model: 'test-model',
          asset_id: 'test-asset-id',
          metadata: { duration: 10 },
        })
      );
    });

    it('should use empty object for metadata if not provided', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'test-activity-id',
          user_id: mockUser.id,
          activity_type: 'video_generation',
          title: 'Test',
          metadata: {},
        },
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'video_generation',
          title: 'Test',
        }),
      });

      await POST(mockRequest);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {},
        })
      );
    });

    it('should return created activity in response', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const createdActivity = {
        id: 'test-activity-id',
        user_id: mockUser.id,
        activity_type: 'video_generation',
        title: 'Test video',
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockResolvedValue({
        data: createdActivity,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'video_generation',
          title: 'Test video',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.success).toBe(true);
      expect(data.data.activity).toEqual(createdActivity);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database insert fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      mockRequest = new NextRequest('http://localhost/api/history', {
        method: 'POST',
        body: JSON.stringify({
          activity_type: 'video_generation',
          title: 'Test',
        }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe(
        'Unable to record this activity in your history. The activity was completed successfully, but logging failed.'
      );
    });
  });
});
