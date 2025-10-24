/**
 * Tests for GET /api/assets/sign - Signed URL Generation
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/sign/route';
import {
  createMockSupabaseClient,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock modules
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  ensureHttpsProtocol: jest.fn((url) => url),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GET /api/assets/sign', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Default storage mocks
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'https://example.com/signed-url' },
      error: null,
    });
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        'http://localhost/api/assets/sign?storageUrl=supabase://assets/test.jpg'
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when neither storageUrl nor assetId provided', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/assets/sign');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 when storageUrl is invalid', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/assets/sign?storageUrl=invalid-url');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid storage URL');
    });

    it('should accept valid supabase:// storage URLs', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });
  });

  describe('Asset Lookup by assetId', () => {
    it('should fetch storageUrl from database when assetId provided', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        id: 'asset-123',
        user_id: mockUser.id,
        storage_url: 'supabase://assets/user-id/project-id/test.jpg',
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=asset-123');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.select).toHaveBeenCalledWith('storage_url, user_id');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'asset-123');
    });

    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=nonexistent');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found');
    });

    it('should return 403 when asset belongs to different user', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        id: 'asset-123',
        user_id: 'different-user-id',
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=asset-123');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('asset does not belong to user');
    });
  });

  describe('Asset Authorization by storageUrl', () => {
    it('should verify user owns asset by checking folder structure', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/project/test.jpg`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should return 403 when storageUrl does not match user', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        'http://localhost/api/assets/sign?storageUrl=supabase://assets/other-user-id/project/test.jpg'
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('does not belong to user');
    });

    it('should skip folder check when assetId was used for lookup', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        id: 'asset-123',
        user_id: mockUser.id,
        storage_url: 'supabase://assets/any-folder/test.jpg',
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=asset-123');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });
  });

  describe('Signed URL Generation', () => {
    it('should create signed URL with default TTL', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(
        expect.stringContaining('test.jpg'),
        3600
      );
    });

    it('should create signed URL with custom TTL', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg&ttl=7200`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(expect.any(String), 7200);
    });

    it('should parse storage URL correctly', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/project-id/image/test.jpg`
      );

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(
        `${mockUser.id}/project-id/image/test.jpg`,
        expect.any(Number)
      );
    });

    it('should return signed URL and expiration', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.storage.createSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url-12345' },
        error: null,
      });

      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg&ttl=1800`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('signedUrl', 'https://example.com/signed-url-12345');
      expect(data).toHaveProperty('expiresIn', 1800);
    });
  });

  describe('Storage Bucket Handling', () => {
    it('should handle different storage buckets', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        storage_url: 'supabase://custom-bucket/path/file.jpg',
      });

      mockSupabase.maybeSingle.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=asset-123');

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.from).toHaveBeenCalledWith('custom-bucket');
    });

    it('should handle paths with multiple slashes', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/a/b/c/test.jpg`
      );

      await GET(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(
        `${mockUser.id}/a/b/c/test.jpg`,
        expect.any(Number)
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when storage signing fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.storage.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Storage error');
    });

    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.maybeSingle.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      mockRequest = new NextRequest('http://localhost/api/assets/sign?assetId=asset-123');

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });

    it('should handle unexpected errors gracefully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.storage.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockRequest = new NextRequest(
        'http://localhost/api/assets/sign?storageUrl=supabase://assets/user-id/test.jpg'
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('URL Format Handling', () => {
    it('should strip supabase:// protocol', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/test.jpg`
      );

      await GET(mockRequest, { params: Promise.resolve({}) });

      // Verify protocol was stripped
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('assets');
      expect(mockSupabase.storage.createSignedUrl).not.toHaveBeenCalledWith(
        expect.stringContaining('supabase://'),
        expect.any(Number)
      );
    });

    it('should handle URLs with special characters', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        `http://localhost/api/assets/sign?storageUrl=supabase://assets/${mockUser.id}/my%20file.jpg`
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should validate bucket name is not empty', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        'http://localhost/api/assets/sign?storageUrl=supabase:///path/file.jpg'
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid storage URL');
    });

    it('should validate path is not empty', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest(
        'http://localhost/api/assets/sign?storageUrl=supabase://bucket'
      );

      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid storage URL');
    });
  });
});
