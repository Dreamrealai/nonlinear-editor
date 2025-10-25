/**
 * Tests for GET /api/assets
 *
 * Tests listing assets with filtering and pagination
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  createMockRequest,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

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

// Mock the Supabase module
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      error: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
    },
  })
);

describe('GET /api/assets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockUser: ReturnType<typeof createMockUser>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockUser = mockAuthenticatedUser(mockSupabase);
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Successful Retrieval', () => {
    it('should return assets for authenticated user', async () => {
      // Arrange
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAssets = [
        { id: '1', user_id: mockUser.id, type: 'image', name: 'asset1.png' },
        { id: '2', user_id: mockUser.id, type: 'video', name: 'asset2.mp4' },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockAssets,
                error: null,
                count: 2,
              }),
            }),
          }),
        }),
      });

      const mockRequest = new NextRequest('http://localhost:3000/api/assets');

      // Act
      const response = await GET(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assets).toEqual(mockAssets);
      expect(data.pagination).toMatchObject({
        page: 0,
        pageSize: 50,
        totalCount: 2,
        totalPages: 1,
        hasNextPage: false,
        hasPreviousPage: false,
      });
    });

    it('should filter by project ID', async () => {
      // Arrange
      const projectId = 'c0a80121-7ac0-4e5e-9f6e-5d9f4c8e3b2a';
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0,
                }),
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({
        url: `/api/assets?projectId=${projectId}`,
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(200);
    });

    it('should filter by asset type', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockReturnValue({
                eq: jest.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0,
                }),
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({
        url: '/api/assets?type=video',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(200);
    });
  });

  describe('Pagination', () => {
    it('should handle pagination parameters', async () => {
      // Arrange
      const mockAssets = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        user_id: mockUser.id,
        type: 'image',
        name: `asset${i + 1}.png`,
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: mockAssets,
                error: null,
                count: 25,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({
        url: '/api/assets?page=0&pageSize=10',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination).toMatchObject({
        page: 0,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: false,
      });
    });

    it('should handle second page', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 25,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({
        url: '/api/assets?page=1&pageSize=10',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(data.pagination).toMatchObject({
        page: 1,
        pageSize: 10,
        totalCount: 25,
        totalPages: 3,
        hasNextPage: true,
        hasPreviousPage: true,
      });
    });

    it('should handle last page', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 25,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({
        url: '/api/assets?page=2&pageSize=10',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(data.pagination).toMatchObject({
        hasNextPage: false,
        hasPreviousPage: true,
      });
    });
  });

  describe('Validation', () => {
    it('should reject invalid project ID', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?projectId=invalid-uuid',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject invalid asset type', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?type=invalid-type',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject negative page number', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?page=-1',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Invalid page number');
    });

    it('should reject invalid page size', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?pageSize=0',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject page size over limit', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?pageSize=200',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(400);
    });

    it('should reject non-integer page number', async () => {
      // Arrange
      const mockRequest = createMockRequest({
        url: '/api/assets?page=1.5',
      });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database error' },
                count: null,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({ url: '/api/assets' });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });

      // Assert
      expect(response.status).toBe(500);
    });

    it('should handle zero count', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({ url: '/api/assets' });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.totalCount).toBe(0);
      expect(data.pagination.totalPages).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty asset list', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: 0,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({ url: '/api/assets' });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.assets).toEqual([]);
    });

    it('should handle null count from database', async () => {
      // Arrange
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockReturnValue({
              range: jest.fn().mockResolvedValue({
                data: [],
                error: null,
                count: null,
              }),
            }),
          }),
        }),
      });

      const mockRequest = createMockRequest({ url: '/api/assets' });

      // Act
      const response = await GET(mockRequest, {
        params: Promise.resolve({}),
        user: mockUser,
        supabase: mockSupabase,
      });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.pagination.totalCount).toBe(0);
    });

    it('should accept all valid asset types', async () => {
      // Arrange
      const types = ['image', 'video', 'audio'];

      for (const type of types) {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                range: jest.fn().mockReturnValue({
                  eq: jest.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0,
                  }),
                }),
              }),
            }),
          }),
        });

        const mockRequest = createMockRequest({
          url: `/api/assets?type=${type}`,
        });

        // Act
        const response = await GET(mockRequest, {
          params: Promise.resolve({}),
          user: mockUser,
          supabase: mockSupabase,
        });

        // Assert
        expect(response.status).toBe(200);
      }
    });
  });
});
