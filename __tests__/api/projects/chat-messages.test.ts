/**
 * Tests for POST /api/projects/[projectId]/chat/messages - Save Chat Message
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/projects/[projectId]/chat/messages/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/__tests__/helpers/apiMocks';

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock validation
jest.mock('@/lib/validation', () => ({
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

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
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
}));


describe('POST /api/projects/[projectId]/chat/messages', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
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

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid UUID format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const invalidId = 'not-a-uuid';
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${invalidId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: invalidId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('UUID');
    });

    it('should return 400 when role is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when content is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when role is empty string', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: '   ', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when content is empty string', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: '   ' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 for invalid role value', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'system', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid role');
      expect(data.error).toContain('user');
      expect(data.error).toContain('assistant');
    });

    it('should return 400 when role is not a string', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 123, content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
    });

    it('should return 400 when content is not a string', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 12345 }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should create a user message successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockMessage = {
        id: 'msg-123',
        project_id: validProjectId,
        role: 'user',
        content: 'Hello, world!',
        model: null,
        attachments: null,
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockReturnValue({
        data: mockMessage,
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello, world!' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toEqual(mockMessage);
      expect(mockSupabase.from).toHaveBeenCalledWith('chat_messages');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        project_id: validProjectId,
        role: 'user',
        content: 'Hello, world!',
        model: null,
        attachments: null,
      });
    });

    it('should create an assistant message successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockMessage = {
        id: 'msg-456',
        project_id: validProjectId,
        role: 'assistant',
        content: 'How can I help?',
        model: 'gemini-pro',
        attachments: null,
        created_at: '2025-01-01T00:00:00Z',
      };

      mockSupabase.single.mockReturnValue({
        data: mockMessage,
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({
            role: 'assistant',
            content: 'How can I help?',
            model: 'gemini-pro',
          }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message.role).toBe('assistant');
      expect(data.message.model).toBe('gemini-pro');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        project_id: validProjectId,
        role: 'assistant',
        content: 'How can I help?',
        model: 'gemini-pro',
        attachments: null,
      });
    });

    it('should handle optional model field', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockReturnValue({
        data: { id: '123', model: null },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(201);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          model: null,
        })
      );
    });

    it('should handle optional attachments field', async () => {
      mockAuthenticatedUser(mockSupabase);
      const attachments = [{ type: 'image', url: 'https://example.com/image.jpg' }];
      mockSupabase.single.mockReturnValue({
        data: { id: '123', attachments },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Check this out', attachments }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(201);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          attachments,
        })
      );
    });

    it('should use select().single() chain', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockReturnValue({
        data: { id: '123' },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Test' }),
        }
      );

      await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database insert fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockReturnValue({
        data: null,
        error: { message: 'Insert failed' },
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to save chat message');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Hello' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON body', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: 'invalid json{{{',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      await expect(
        POST(mockRequest, {
          params: Promise.resolve({ projectId: validProjectId }),
        })
      ).rejects.toThrow();
    });
  });

  describe('RLS Enforcement', () => {
    it('should rely on RLS to prevent unauthorized access', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockReturnValue({
        data: { id: '123' },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/projects/${validProjectId}/chat/messages`,
        {
          method: 'POST',
          body: JSON.stringify({ role: 'user', content: 'Test' }),
        }
      );

      await POST(mockRequest, {
        params: Promise.resolve({ projectId: validProjectId }),
      });

      // Verify user is authenticated
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
      expect(mockUser).toBeTruthy();

      // RLS enforcement happens at database level via insert operation
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          project_id: validProjectId,
        })
      );
    });
  });
});
