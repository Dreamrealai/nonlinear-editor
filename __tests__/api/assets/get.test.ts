/**
 * Tests for GET /api/assets - List Assets
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/route';
import {
  createMockSupabaseClient,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Store the mock at module level
let mockSupabaseForAuth: any = null;

// Mock modules
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(() => mockSupabaseForAuth),
  })
);

// Mock withAuth wrapper that properly handles authentication
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: (handler: any, options: any) => async (req: any, context: any) => {
      const supabase = mockSupabaseForAuth;

      if (!supabase) {
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

      return handler(req, { user, supabase });
    },
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    RATE_LIMITS: {
      tier3_status_read: { requests: 30, window: 60 },
    },
  })
);

describe('GET /api/assets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabaseForAuth = mockSupabase;
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/assets');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should return all assets for authenticated user', async () => {
      const user = mockAuthenticatedUser(mockSupabase);
      const mockAssets = [
        createMockAsset({ id: 'asset-1', type: 'video' }),
        createMockAsset({ id: 'asset-2', type: 'image' }),
      ];

      mockSupabase.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: mockAssets.length,
      });

      const mockRequest = new NextRequest('http://localhost/api/assets');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.assets).toHaveLength(2);
      expect(data.pagination).toHaveProperty('totalCount');
    });

    it('should filter assets by projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const projectId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // valid UUID v4
      const mockAssets = [createMockAsset({ project_id: projectId })];

      mockSupabase.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 1,
      });

      const mockRequest = new NextRequest(`http://localhost/api/assets?projectId=${projectId}`);

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', projectId);
    });

    it('should filter assets by type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockAssets = [createMockAsset({ type: 'video' })];

      mockSupabase.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 1,
      });

      const mockRequest = new NextRequest('http://localhost/api/assets?type=video');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('type', 'video');
    });

    it('should support pagination', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: [],
        error: null,
        count: 100,
      });

      const mockRequest = new NextRequest('http://localhost/api/assets?page=2&pageSize=25');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.range).toHaveBeenCalledWith(50, 74);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid projectId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/assets?projectId=invalid');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/assets?type=invalid');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative page number', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/assets?page=-1');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for pageSize exceeding limit', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/assets?pageSize=101');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
        count: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/assets');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });
});
