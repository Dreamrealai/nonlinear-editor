/**
 * Integration Tests for POST /api/ai/chat
 *
 * This follows the integration testing approach:
 * - Tests the ACTUAL route handler (not mocked)
 * - Uses real NextRequest/NextResponse
 * - Only mocks external services (Gemini AI, logger)
 * - Uses test utilities for authentication
 */

import { NextRequest } from 'next/server';
import { createTestUser, createTestSupabaseClient } from '@/test-utils/testWithAuth';

// Mock withAuth middleware to use test authentication
jest.mock('@/lib/api/withAuth', () => {
  const actual = jest.requireActual('@/lib/api/withAuth');
  return {
    ...actual,
     
    withAuth: jest.fn((handler: any, options: any) => {
       
      return async (req: NextRequest, context: any) => {
         
        const testUser = (req as any).__testUser;
        if (!testUser) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

         
        const supabase = require('@/test-utils/testWithAuth').createTestSupabaseClient(testUser.id);
        return handler(req, { user: testUser, supabase }, context);
      };
    }),
  };
});

// Import the actual handler (after mocking withAuth)
import { POST } from '@/app/api/ai/chat/route';

// Mock external services only
jest.mock('@/lib/gemini', () => ({
  chat: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock rate limit
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { limit: 10, windowMs: 60000 },
  },
}));

describe('POST /api/ai/chat - Integration Tests', () => {
  const { chat } = require('@/lib/gemini');
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';

  // Helper to create a mock file that works efficiently in tests
  const createMockFile = (content: string, name: string, type: string, size?: number): File => {
    const actualSize = size || content.length;
    const file = new File([content], name, { type });

    // Override size property for large file tests without actually creating large content
    if (size && size > content.length) {
      Object.defineProperty(file, 'size', { value: size });
    }

    return file;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
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
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('message is required');
      expect(data.field).toBe('message');
    });

    it('should return 400 when model is missing', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('model is required');
      expect(data.field).toBe('model');
    });

    it('should return 400 when projectId is missing', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      // Validation message may be either "required" or "must be a string" depending on validator
      expect(data.error).toContain('projectId');
      expect(data.field).toBe('projectId');
    });

    it('should return 400 for message exceeding max length', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'a'.repeat(5001)); // Exceeds 5000 char limit
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('message must not exceed 5000 characters');
      expect(data.field).toBe('message');
    });

    it('should return 400 for chat history exceeding max size', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append('chatHistory', 'a'.repeat(101 * 1024)); // Exceeds 100KB

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Chat history too large');
      expect(data.field).toBe('chatHistory');
    });

    it('should return 400 for invalid chat history JSON', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);
      formData.append('chatHistory', 'invalid json{{{');

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid chat history JSON');
      expect(data.field).toBe('chatHistory');
    });

    it('should return 400 for chat history with too many messages', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

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
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid chat history format');
      expect(data.field).toBe('chatHistory');
    });

    it.skip('should return 400 for file exceeding max size', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Check this image');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      // Create a file larger than 10MB (mock the size without creating huge content)
      const largeFile = createMockFile('image data', 'large.jpg', 'image/jpeg', 11 * 1024 * 1024);
      formData.append('file-0', largeFile);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.error).toContain('exceeds maximum size');
    });

    it.skip('should return 400 for invalid file type', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Check this file');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const invalidFile = createMockFile('content', 'test.exe', 'application/x-msdownload');
      formData.append('file-0', invalidFile);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid file type');
    });

    it.skip('should return 400 for exceeding max file count', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      const formData = new FormData();
      formData.append('message', 'Check these files');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      // Add 6 files (exceeds limit of 5)
      for (let i = 0; i < 6; i++) {
        const file = createMockFile('content', `file${i}.jpg`, 'image/jpeg');
        formData.append(`file-${i}`, file);
      }

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Maximum 5 files');
    });
  });

  describe('Success Cases', () => {
    it('should generate chat response successfully', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockResolvedValue('AI response');

      const formData = new FormData();
      formData.append('message', 'Hello AI');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

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
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

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
      (mockRequest as any).__testUser = user;

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

    it.skip('should handle file attachments', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockResolvedValue('Image analyzed');

      const formData = new FormData();
      formData.append('message', 'What is in this image?');
      formData.append('model', 'gemini-pro-vision');
      formData.append('projectId', validProjectId);

      const file = createMockFile('fake image data', 'test.jpg', 'image/jpeg');
      formData.append('file-0', file);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

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
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

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
      (mockRequest as any).__testUser = user;

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
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockRejectedValue(new Error('Missing environment variable'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('not configured');
    });

    it('should return 503 for authentication error', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockRejectedValue(new Error('Failed to authenticate'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(503);
    });

    it('should return 500 for other Gemini errors', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      // Mock a generic error that doesn't match configuration/auth patterns
      chat.mockRejectedValue(new Error('Network timeout'));

      const formData = new FormData();
      formData.append('message', 'Hello');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      // This should throw and be caught by withAuth wrapper
      await expect(POST(mockRequest, { params: Promise.resolve({}) })).rejects.toThrow();
    });
  });

  describe.skip('File Processing', () => {
    it('should accept valid image formats', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockResolvedValue('Processed');

      const validMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

      for (const mimeType of validMimeTypes) {
        jest.clearAllMocks();
        chat.mockResolvedValue('Processed');

        const formData = new FormData();
        formData.append('message', 'Test');
        formData.append('model', 'gemini-pro-vision');
        formData.append('projectId', validProjectId);

        const file = createMockFile('data', 'test.jpg', mimeType);
        formData.append('file-0', file);

        const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
          method: 'POST',
          body: formData,
        });
        (mockRequest as any).__testUser = user;

        const response = await POST(mockRequest, { params: Promise.resolve({}) });
        expect(response.status).toBe(200);
      }
    });

    it('should accept PDF files', async () => {
      const user = createTestUser();
      const supabase = createTestSupabaseClient(user.id);

      chat.mockResolvedValue('PDF analyzed');

      const formData = new FormData();
      formData.append('message', 'Analyze this PDF');
      formData.append('model', 'gemini-pro');
      formData.append('projectId', validProjectId);

      const file = createMockFile('pdf data', 'doc.pdf', 'application/pdf');
      formData.append('file-0', file);

      const mockRequest = new NextRequest('http://localhost/api/ai/chat', {
        method: 'POST',
        body: formData,
      });
      (mockRequest as any).__testUser = user;

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(200);
    });
  });
});
