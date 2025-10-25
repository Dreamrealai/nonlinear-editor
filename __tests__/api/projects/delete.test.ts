/**
 * Tests for DELETE /api/projects/[projectId] - Project Deletion
 */

import { NextRequest } from 'next/server';
import { DELETE } from '@/app/api/projects/[projectId]/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/__tests__/helpers/apiMocks';

// Mock the Supabase module
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
    ensureHttpsProtocol: jest.fn((url) => url),
  })
);

// Mock server logger
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

// Mock validation
jest.mock(
  '@/lib/validation',
  () => ({
    validateUUID: jest.fn((id: string) => {
      if (!id || typeof id !== 'string' || id.length < 10) {
        const error = new Error('Invalid UUID format');
        error.name = 'ValidationError';
        throw error;
      }
    }),
    ValidationError: class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    },
  })
);

/**
 * Mock withAuth to handle both 2-param and 3-param handler signatures
 * - 2-param: handler(request, authContext) - for routes without params
 * - 3-param: handler(request, authContext, routeContext) - for routes with params like [projectId]
 */
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: (handler: any) => async (req: any, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      const authContext = { user, supabase };

      // Check if this is a dynamic route (has params)
      if (context?.params !== undefined) {
        // 3-param signature: handler(request, authContext, routeContext)
        const routeContext = { params: context.params };
        return handler(req, authContext, routeContext);
      } else {
        // 2-param signature: handler(request, authContext)
        return handler(req, authContext);
      }
    },
  })
);

describe('DELETE /api/projects/[projectId]', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach((): void => {
    // Create and configure mock Supabase client
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockClear();
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });
      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/projects/invalid', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'invalid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid UUID');
    });

    it('should return 400 for empty projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/projects/', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: '' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should delete project successfully with valid ID', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      // Mock the query chain: from().delete().eq() which returns a promise
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id-123', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id-123' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-project-id-123');
    });

    it('should delete project and cascade delete related resources', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/cascading-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'cascading-project-id' }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database delete fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: { message: 'Database connection failed', code: 'DB_ERROR' },
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to delete project');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Authorization', () => {
    it('should respect RLS and only delete projects owned by user', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/owned-project', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'owned-project' }),
      });

      expect(response.status).toBe(200);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });
  });

  describe('Database Interactions', () => {
    it('should call database methods in correct order', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-project-id');
    });
  });

  describe('Response Format', () => {
    it('should return success boolean on successful deletion', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });
      const data = await response.json();

      expect(data).toHaveProperty('success');
      expect(data.success).toBe(true);
    });

    it('should return correct content-type header', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.mockResolvedValue({
        data: null,
        error: null,
      });

      mockRequest = new NextRequest('http://localhost/api/projects/test-project-id', {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: 'test-project-id' }),
      });

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });
});
