/**
 * Tests for GET /api/assets - List Assets with Pagination and Filtering
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/route';
import {
  createMockSupabaseClient,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: { tier1_data_read: { requests: 60, window: 60 } },
}));

describe('GET /api/assets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Default range response
    mockSupabase.range.mockResolvedValue({
      data: [createMockAsset(), createMockAsset({ id: 'asset-2' })],
      error: null,
      count: 2,
    });
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Pagination', () => {
    it('should return paginated assets with default values', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assets).toBeDefined();
      expect(data.pagination).toMatchObject({
        page: 0,
        pageSize: 50,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should accept custom page parameter', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?page=2', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.page).toBe(2);
      expect(mockSupabase.range).toHaveBeenCalledWith(100, 149); // page 2 * pageSize 50
    });

    it('should accept custom pageSize parameter', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?pageSize=10', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.pageSize).toBe(10);
      expect(mockSupabase.range).toHaveBeenCalledWith(0, 9);
    });

    it('should return 400 for negative page number', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?page=-1', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid page number');
    });

    it('should return 400 for non-integer page number', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?page=1.5', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for pageSize less than 1', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?pageSize=0', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid page size');
    });

    it('should return 400 for pageSize greater than 100', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?pageSize=101', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid page size');
    });
  });

  describe('Filtering', () => {
    it('should filter by projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await GET(
        new NextRequest(`http://localhost/api/assets?projectId=${projectId}`, { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', projectId);
    });

    it('should filter by asset type', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?type=video', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'video');
    });

    it('should accept all valid asset types', async () => {
      mockAuthenticatedUser(mockSupabase);
      const validTypes = ['image', 'video', 'audio'];

      for (const type of validTypes) {
        jest.clearAllMocks();
        mockSupabase.range.mockResolvedValue({ data: [], error: null, count: 0 });

        const response = await GET(
          new NextRequest(`http://localhost/api/assets?type=${type}`, { method: 'GET' }),
          { params: Promise.resolve({}) }
        );

        expect(response.status).toBe(200);
        expect(mockSupabase.eq).toHaveBeenCalledWith('type', type);
      }
    });

    it('should return 400 for invalid asset type', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?type=invalid', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('type');
    });

    it('should return 400 for invalid projectId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets?projectId=invalid-uuid', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('projectId');
    });

    it('should filter by both projectId and type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const projectId = '123e4567-e89b-12d3-a456-426614174000';

      const response = await GET(
        new NextRequest(`http://localhost/api/assets?projectId=${projectId}&type=image`, {
          method: 'GET',
        }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', projectId);
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'image');
    });
  });

  describe('Query Constraints', () => {
    it('should only return assets owned by the user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });

    it('should order assets by created_at descending', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('Pagination Metadata', () => {
    it('should calculate hasNextPage correctly', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: Array(10).fill(createMockAsset()),
        error: null,
        count: 100, // 100 total, 10 per page = 10 pages
      });

      const response = await GET(
        new NextRequest('http://localhost/api/assets?page=0&pageSize=10', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.hasPreviousPage).toBe(false);
    });

    it('should calculate hasPreviousPage correctly', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: Array(10).fill(createMockAsset()),
        error: null,
        count: 100,
      });

      const response = await GET(
        new NextRequest('http://localhost/api/assets?page=5&pageSize=10', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.hasNextPage).toBe(true);
      expect(data.pagination.hasPreviousPage).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
        count: null,
      });

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database error');
    });

    it('should handle null count gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.range.mockResolvedValue({
        data: [createMockAsset()],
        error: null,
        count: null,
      });

      const response = await GET(
        new NextRequest('http://localhost/api/assets', { method: 'GET' }),
        { params: Promise.resolve({}) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pagination.totalCount).toBe(0);
    });
  });
});
