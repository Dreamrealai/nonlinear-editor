/**
 * Tests for POST /api/assets/[assetId]/thumbnail - Asset Thumbnail Generation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/assets/[assetId]/thumbnail/route';
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

// Mock modules
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  ensureHttpsProtocol: jest.fn((url) => url),
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
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 5,
    remaining: 4,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { requests: 5, window: 60 },
  },
}));

// Mock ThumbnailService
jest.mock('@/lib/services/thumbnailService', () => ({
  ThumbnailService: jest.fn().mockImplementation(() => ({
    generateVideoThumbnail: jest.fn().mockResolvedValue({
      buffer: Buffer.from('fake-video-thumbnail'),
      metadata: {
        width: 320,
        height: 180,
        format: 'jpeg',
        size: 12345,
      },
    }),
    generateImageThumbnail: jest.fn().mockResolvedValue({
      buffer: Buffer.from('fake-image-thumbnail'),
      metadata: {
        width: 320,
        height: 240,
        format: 'jpeg',
        size: 10000,
      },
    }),
  })),
}));

// Mock fetch
global.fetch = jest.fn() as jest.Mock;

describe('POST /api/assets/[assetId]/thumbnail', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';

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

    // Mock fetch for asset download
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      statusText: 'OK',
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    });
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/assets/invalid-uuid/thumbnail', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 for invalid JSON body', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: 'invalid json{',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid JSON in request body');
    });
  });

  describe('Asset Authorization', () => {
    it('should return 404 when asset not found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Asset not found' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found or access denied');
    });

    it('should return 404 when user does not own asset', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: 'other-user-id' });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found or access denied');
    });
  });

  describe('Existing Thumbnail Handling', () => {
    it('should return existing thumbnail when available and force is false', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const existingThumbnail = 'data:image/jpeg;base64,existing';
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        metadata: { thumbnail: existingThumbnail },
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.thumbnail).toBe(existingThumbnail);
      expect(data.metadata.cached).toBe(true);
    });

    it('should regenerate thumbnail when force is true', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
        metadata: { thumbnail: 'data:image/jpeg;base64,old' },
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({ force: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.thumbnail).toContain('data:image/jpeg;base64,');
      expect(data.metadata.cached).toBeUndefined();
    });
  });

  describe('Asset Type Validation', () => {
    it('should return 400 for audio assets', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'audio',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot generate thumbnail for asset type: audio');
    });

    it('should return 400 for text assets', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'text',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot generate thumbnail for asset type: text');
    });
  });

  describe('Storage URL Validation', () => {
    it('should return 400 for invalid storage URL format', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'invalid-url',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid storage URL format');
    });
  });

  describe('Video Thumbnail Generation', () => {
    it('should generate thumbnail for video asset', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.thumbnail).toContain('data:image/jpeg;base64,');
      expect(data.metadata).toHaveProperty('width');
      expect(data.metadata).toHaveProperty('height');
    });

    it('should accept custom timestamp for video thumbnail', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({ timestamp: 5.5 }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should accept custom width for video thumbnail', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({ width: 640 }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it('should accept custom quality for video thumbnail', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({ quality: 90 }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Image Thumbnail Generation', () => {
    it('should generate thumbnail for image asset', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'image',
        storage_url: 'supabase://images/test.jpg',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.thumbnail).toContain('data:image/jpeg;base64,');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when signed URL creation fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.storage.createSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'Storage error' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to access asset file');
    });

    it('should return 500 when asset download fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to download asset file');
    });

    it('should return 500 when thumbnail generation fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      // Mock thumbnail service to throw error
      const { ThumbnailService } = require('@/lib/services/thumbnailService');
      ThumbnailService.mockImplementationOnce(() => ({
        generateVideoThumbnail: jest.fn().mockRejectedValue(new Error('FFmpeg error')),
      }));

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Thumbnail generation failed');
    });

    it('should return thumbnail even if metadata update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({
        user_id: mockUser.id,
        type: 'video',
        storage_url: 'supabase://videos/test.mp4',
      });

      mockSupabase.single.mockResolvedValue({
        data: mockAsset,
        error: null,
      });

      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Update failed' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/thumbnail`, {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.thumbnail).toBeDefined();
    });
  });
});
