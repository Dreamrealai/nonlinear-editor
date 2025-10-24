/**
 * Tests for POST /api/ai/chat - AI Chat with Gemini
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/ai/chat/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock the Gemini chat function
jest.mock('@/lib/gemini', () => ({
  chat: jest.fn(),
}));

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    try {
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

      // Await params if it's a Promise
      const params =
        context?.params instanceof Promise ? await context.params : context?.params || {};

      return await handler(req, { user, supabase, params });
    } catch (error) {
      console.error('Error in withAuth mock:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }),
}));

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Mock API validation helpers - use actual implementation
jest.mock('@/lib/api/validation', () => {
  const actual = jest.requireActual('@/lib/api/validation');
  return {
    ...actual,
  };
});

// Mock API response helpers
jest.mock('@/lib/api/response', () => {
  const jsonResponse = (payload: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

  return {
    errorResponse: jest.fn((message: string, status: number) =>
      jsonResponse({ error: message }, { status })
    ),
    validationError: jest.fn((message: string, field?: string) =>
      jsonResponse({ error: message, field }, { status: 400 })
    ),
    successResponse: jest.fn((data: any) => jsonResponse(data, { status: 200 })),
    serviceUnavailableResponse: jest.fn((message: string, details?: unknown) =>
      jsonResponse({ error: message, details }, { status: 503 })
    ),
  };
});

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock rate limit
jest.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: {
    tier2_resource_creation: { max: 10, windowMs: 60000 },
  },
}));

describe('POST /api/ai/chat', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello AI');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when message is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when model is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Missing required fields');
    });

    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for message exceeding max length', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'a'.repeat(5001)); // Exceeds 5000 char limit
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('too long');
    });

    it('should return 400 for chat history exceeding max size', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append('chatHistory', 'a'.repeat(101 * 1024)); // Exceeds 100KB

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('too large');
    });

    it('should return 400 for invalid chat history JSON', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append('chatHistory', 'invalid json{{{');

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid chat history');
    });

    it('should return 400 for chat history with too many messages', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      const longHistory = Array(51)
        .fill({ role: 'user', content: 'test' })
        .map(JSON.stringify)
        .join(',');
      formData.append('chatHistory', `[${longHistory}]`);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid chat history');
    });

    it('should return 400 for file exceeding max size', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Check this image');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      // Create a file larger than 10MB
      const largeFile = new File(['a'.repeat(11 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg',
      });
      formData.append('file-0', largeFile);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toContain('exceeds maximum size');
    });

    it('should return 400 for invalid file type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Check this file');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const invalidFile = new File(['content'], 'test.exe', { type: 'application/x-msdownload' });
      formData.append('file-0', invalidFile);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid file type');
    });

    it('should return 400 for exceeding max file count', async () => {
      mockAuthenticatedUser(mockSupabase);
      const formData = new FormData();
      formData.append('message', 'Check these files');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      // Add 6 files (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        const file = new File(['content'], `file${i}.jpg`, { type: 'image/jpeg' });
        formData.append(`file-${i}`, file);
      }

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Maximum 5 files');
    });
  });

  describe('Success Cases', () => {
    it('should generate chat response successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('AI response');

      const formData = new FormData();
      formData.append('message', 'Hello AI');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.response).toBe('AI response');
      expect(data.model).toBe('gemini-pro');
      expect(data.timestamp).toBeTruthy();
      expect(chat).toHaveBeenCalledWith({
        model: 'gemini-pro',
        message: 'Hello AI',
        history: [],
        files: [],
      });
    });

    it('should handle chat history correctly', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('Response with history');

      const formData = new FormData();
      formData.append('message', 'Follow up question');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append(
        'chatHistory',
        JSON.stringify([
          { role: 'user', content: 'Previous question' },
          { role: 'assistant', content: 'Previous answer' },
        ])
      );

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(chat).toHaveBeenCalledWith({
        model: 'gemini-pro',
        message: 'Follow up question',
        history: [
          { role: 'user', parts: [{ text: 'Previous question' }] },
          { role: 'model', parts: [{ text: 'Previous answer' }] },
        ],
        files: [],
      });
    });

    it('should handle file attachments', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('Image analyzed');

      const formData = new FormData();
      formData.append('message', 'What is in this image?');
      formData.append('model', 'gemini-pro-vision');
      formData.append('projectId', validProjectId);

      const file = new File(['fake image data'], 'test.jpg', { type: 'image/jpeg' });
      formData.append('file-0', file);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What is in this image?',
          files: expect.arrayContaining([
            expect.objectContaining({
              mimeType: 'image/jpeg',
              data: expect.any(String),
            }),
          ]),
        })
      );
    });

    it('should handle empty chat history', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('Response');

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append('chatHistory', '');

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(chat).toHaveBeenCalledWith(
        expect.objectContaining({
          history: [],
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return 503 for Gemini configuration error', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockRejectedValue(new Error('Missing environment variable'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('not configured');
    });

    it('should return 503 for authentication error', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockRejectedValue(new Error('Failed to authenticate'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(503);
    });

    it('should throw for other Gemini errors', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockRejectedValue(new Error('Some other error'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      await expect(POST(mockRequest, { params: Promise.resolve({}) })).rejects.toThrow(
        'Some other error'
      );
    });
  });

  describe('File Processing', () => {
    it('should accept valid image formats', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('Processed');

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (const mimeType of validMimeTypes) {
        jest.clearAllMocks();
        const mockUser = mockAuthenticatedUser(mockSupabase);
        chat.mockResolvedValue('Processed');

        const formData = new FormData();
        formData.append('message', 'Test');
        formData.append('model', 'gemini-pro-vision');
        formData.append('projectId', validProjectId);

        const file = new File(['data'], 'test.jpg', { type: mimeType });
        formData.append('file-0', file);

        const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: formData,
        });

        const response = await POST(mockRequest, { params: Promise.resolve({}) });
        expect(response.status).toBe(200);
      }
    }, 15000);

    it('should accept PDF files', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { chat } = require('@/lib/gemini');
      chat.mockResolvedValue('PDF analyzed');

      const formData = new FormData();
      formData.append('message', 'Analyze this PDF');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const file = new File(['pdf data'], 'doc.pdf', { type: 'application/pdf' });
      formData.append('file-0', file);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
    }, 15000);
  });
});
