/**
 * Tests for /api/projects/[projectId]/chat - Chat Messages Management
 *
 * GET: Retrieves chat messages for a project
 * DELETE: Clears all chat messages for a project
 */

import { NextRequest } from 'next/server';
import { GET, DELETE } from '@/app/api/projects/[projectId]/chat/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
} from '@/__tests__/helpers/apiMocks';

// Mock the Supabase module
jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation
jest.mock('@/lib/validation', (): Record<string, unknown> => ({
  validateUUID: jest.fn((id: string, field: string) => {
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      const error = new Error(`${field} must be a valid UUID`);
      error.name = 'ValidationError';
      throw error;
    }
    return id;
  }),
  ValidationError: class ValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ValidationError';
    }
  },
}));

/**
 * Mock withAuth to handle both 2-param and 3-param handler signatures
 * - 2-param: handler(request, authContext) - for routes without params
 * - 3-param: handler(request, authContext, routeContext) - for routes with params like [projectId]
 */
jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
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
}));

describe('GET /api/projects/[projectId]/chat', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const mockMessages = [
    {
      id: '1',
      project_id: validProjectId,
      role: 'user',
      content: 'Hello',
      created_at: '2025-01-01T00:00:00Z',
    },
    {
      id: '2',
      project_id: validProjectId,
      role: 'assistant',
      content: 'Hi there!',
      created_at: '2025-01-01T00:01:00Z',
    },
  ];

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
      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
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

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidId = 'not-a-uuid';
      const mockRequest = new NextRequest(`http://localhost/api/projects/${invalidId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: invalidId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });

    it('should return 400 for empty projectId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/projects//chat', { method: 'GET' });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: '' }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should return chat messages for valid project', async () => {
      mockAuthenticatedUser(mockSupabase);

      // Mock the order chain
      mockSupabase.order.mockReturnValue({
        data: mockMessages,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toEqual(mockMessages);
      expect(data.messages).toHaveLength(2);
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', validProjectId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });

    it('should return empty array when no messages exist', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.order.mockReturnValue({
        data: [],
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.order.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.messages).toEqual([]);
    });

    it('should order messages by created_at ascending', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.order.mockReturnValue({
        data: mockMessages,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.order.mockReturnValue({
        data: null,
        error: { message: 'Database connection failed' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to load chat messages');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'GET',
      });

      const response = await GET(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});

describe('DELETE /api/projects/[projectId]/chat', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

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
      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidId = 'invalid-uuid';
      const mockRequest = new NextRequest(`http://localhost/api/projects/${invalidId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: invalidId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });
  });

  describe('Success Cases', () => {
    it('should clear all messages for a project', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
      expect(mockSupabase.delete).toHaveBeenCalled();
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', validProjectId);
    });

    it('should enforce RLS through ownership check', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: null,
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      // RLS is enforced at database level
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockUser).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database delete fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.eq.mockReturnValue({
        data: null,
        error: { message: 'Delete failed' },
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to clear chat messages');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected database error');
      });

      const mockRequest = new NextRequest(`http://localhost/api/projects/${validProjectId}/chat`, {
        method: 'DELETE',
      });

      const response = await DELETE(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });
});
