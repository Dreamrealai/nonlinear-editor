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

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { 'Content-Type': 'application/json' } 
      });
    }
    
    return handler(req, { user, supabase });
  }),
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    error: jest.fn(),
  },
}));

describe('GET /api/assets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
    jest.clearAllMocks();
  });

  afterEach(() => {
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

      mockSupabase.from('assets').select = jest.fn().mockReturnValue({
        ...mockSupabase,
        count: mockAssets.length,
      });
      mockSupabase.range.mockResolvedValue({
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
      const mockAssets = [createMockAsset({ project_id: 'project-1' })];

      mockSupabase.range.mockResolvedValue({
        data: mockAssets,
        error: null,
        count: 1,
      });

      const mockRequest = new NextRequest('http://localhost/api/assets?projectId=project-1-valid-uuid');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'project-1-valid-uuid');
    });

    it('should filter assets by type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockAssets = [createMockAsset({ type: 'video' })];

      mockSupabase.range.mockResolvedValue({
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
      mockSupabase.range.mockResolvedValue({
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
      mockSupabase.range.mockResolvedValue({
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
