/**
 * Tests for PUT /api/assets/[assetId]/tags - Asset Tags Management
 * Tests for POST /api/assets/[assetId]/favorite - Asset Favorite Toggle
 */

import { NextRequest } from 'next/server';
import { PUT, POST } from '@/app/api/assets/[assetId]/tags/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
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
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
  ensureHttpsProtocol: jest.fn((url) => url),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', (): Record<string, unknown> => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { requests: 10, window: 60 },
  },
}));

describe('PUT /api/assets/[assetId]/tags', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['test'] }),
      });

      const response = await PUT(mockRequest, {
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

      mockRequest = new NextRequest('http://localhost/api/assets/invalid-uuid/tags', {
        method: 'PUT',
        body: JSON.stringify({ tags: ['test'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 when tags is not an array', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: 'not-an-array' }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Tags must be an array');
    });

    it('should return 400 when tags is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({}),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Tags must be an array');
    });

    it('should return 400 when more than 20 tags provided', async () => {
      mockAuthenticatedUser(mockSupabase);

      const tags = Array.from({ length: 21 }, (_, i) => `tag${i}`);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Maximum 20 tags allowed');
    });

    it('should return 400 for empty tag strings', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: [''] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Each tag must be 1-50 characters');
    });

    it('should return 400 for tags longer than 50 characters', async () => {
      mockAuthenticatedUser(mockSupabase);

      const longTag = 'a'.repeat(51);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: [longTag] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Each tag must be 1-50 characters');
    });

    it('should return 400 for non-string tags', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: [123, 'valid'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Each tag must be 1-50 characters');
    });
  });

  describe('Asset Authorization', () => {
    it('should return 404 when asset not found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Asset not found' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['test'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Asset not found');
    });

    it('should return 403 when user does not own the project', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ project_id: 'other-project-id' });
      const mockProject = createMockProject({ id: 'other-project-id', user_id: 'other-user-id' });

      // First call returns asset
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Second call returns project with different owner
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['test'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Success Cases', () => {
    it('should update tags successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      // First call returns asset
      mockSupabase.single.mockResolvedValueOnce({
        data: mockAsset,
        error: null,
      });

      // Second call returns project
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      });

      // Update succeeds
      mockSupabase.eq.mockResolvedValue({
        error: null,
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['landscape', 'nature', 'outdoor'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.tags).toEqual(['landscape', 'nature', 'outdoor']);
      expect(mockSupabase.update).toHaveBeenCalledWith({
        tags: ['landscape', 'nature', 'outdoor'],
      });
    });

    it('should sanitize tags (trim and lowercase)', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['  LANDSCAPE  ', 'Nature', '  outdoor'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tags).toEqual(['landscape', 'nature', 'outdoor']);
    });

    it('should filter out empty tags after trimming', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['valid', '   ', 'another'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tags).toEqual(['valid', 'another']);
    });

    it('should allow empty tags array', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: [] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.tags).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({
        error: { message: 'Database error' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/tags`, {
        method: 'PUT',
        body: JSON.stringify({ tags: ['test'] }),
      });

      const response = await PUT(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update tags');
    });
  });
});

describe('POST /api/assets/[assetId]/favorite', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const validAssetId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/assets/invalid-uuid/favorite', {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('assetId');
    });

    it('should return 400 when is_favorite is not boolean', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: 'true' }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('is_favorite must be a boolean');
    });
  });

  describe('Success Cases', () => {
    it('should set favorite to true', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.is_favorite).toBe(true);
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_favorite: true });
    });

    it('should set favorite to false', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: false }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.is_favorite).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 when asset not found', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Asset not found' },
      });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(404);
    });

    it('should return 403 when user does not own project', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ project_id: 'other-project-id' });
      const mockProject = createMockProject({ id: 'other-project-id', user_id: 'other-user-id' });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(403);
    });

    it('should return 500 when database update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockAsset = createMockAsset({ user_id: mockUser.id });
      const mockProject = createMockProject({ user_id: mockUser.id });

      mockSupabase.single.mockResolvedValueOnce({ data: mockAsset, error: null });
      mockSupabase.single.mockResolvedValueOnce({ data: mockProject, error: null });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Update failed' } });

      mockRequest = new NextRequest(`http://localhost/api/assets/${validAssetId}/favorite`, {
        method: 'POST',
        body: JSON.stringify({ is_favorite: true }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ assetId: validAssetId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to update favorite status');
    });
  });
});
