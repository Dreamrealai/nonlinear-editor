/**
 * Tests for POST /api/frames/[frameId]/edit - Frame Editing with Gemini
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/frames/[frameId]/edit/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
  isSupabaseServiceConfigured: jest.fn(() => true),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/auditLog', (): Record<string, unknown> => ({
  auditLog: jest.fn(),
  auditSecurityEvent: jest.fn(),
  AuditAction: {
    FRAME_EDIT_REQUEST: 'frame_edit_request',
    FRAME_EDIT_COMPLETE: 'frame_edit_complete',
    FRAME_EDIT_FAILED: 'frame_edit_failed',
    FRAME_EDIT_UNAUTHORIZED: 'frame_edit_unauthorized',
  },
}));

jest.mock('@google/generative-ai', (): Record<string, unknown> => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue('AI generated edit description'),
        },
      }),
    }),
  })),
}));

global.fetch = jest.fn();

describe('POST /api/frames/[frameId]/edit', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validFrameId = '550e8400-e29b-41d4-a716-446655440001';
  const validProjectId = '550e8400-e29b-41d4-a716-446655440000';
  const validAssetId = '550e8400-e29b-41d4-a716-446655440002';

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    process.env['AISTUDIO_API_KEY'] = 'test-api-key';

    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new ArrayBuffer(1024),
      headers: { get: () => 'image/jpeg' },
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['AISTUDIO_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test prompt' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(401);
    });
  });

  describe('Frame ID Validation', () => {
    it('should return 400 when frameId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/frames/undefined/edit', {
        method: 'POST',
        body: JSON.stringify({ prompt: 'Test' }),
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: undefined as unknown as string }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when prompt is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(400);
    });

    it('should return 400 when prompt is not a string', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 123 }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(400);
    });

    it('should limit numVariations between 1 and 8', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validFrameId,
            project_id: validProjectId,
            asset_id: validAssetId,
            storage_path: 'supabase://frames/test.jpg',
            project: { id: validProjectId, user_id: mockUser.id },
            asset: { id: validAssetId, user_id: mockUser.id },
          },
          error: null,
        })
        .mockResolvedValue({
          data: { id: 'edit-123' },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/frame.jpg' },
        }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test', numVariations: 20 }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.count).toBeLessThanOrEqual(8);
    });
  });

  describe('Frame Ownership Verification', () => {
    it('should return 404 when frame not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(404);
    });

    it('should return 403 when user does not own project', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validFrameId,
          project_id: validProjectId,
          project: { id: validProjectId, user_id: 'different-user' },
          asset: { id: validAssetId, user_id: mockUser.id },
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(403);
    });

    it('should return 403 when user does not own asset', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validFrameId,
          project_id: validProjectId,
          asset_id: validAssetId,
          project: { id: validProjectId, user_id: mockUser.id },
          asset: { id: validAssetId, user_id: 'different-user' },
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(403);
    });
  });

  describe('API Key Configuration', () => {
    it('should return 503 when API key not configured', async () => {
      delete process.env['AISTUDIO_API_KEY'];
      delete process.env['GEMINI_API_KEY'];
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validFrameId,
          project_id: validProjectId,
          asset_id: validAssetId,
          storage_path: 'supabase://frames/test.jpg',
          project: { id: validProjectId, user_id: mockUser.id },
          asset: { id: validAssetId, user_id: mockUser.id },
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(503);
    });

    it('should accept GEMINI_API_KEY as alternative', async () => {
      delete process.env['AISTUDIO_API_KEY'];
      process.env['GEMINI_API_KEY'] = 'test-gemini-key';
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validFrameId,
            project_id: validProjectId,
            asset_id: validAssetId,
            storage_path: 'supabase://frames/test.jpg',
            project: { id: validProjectId, user_id: mockUser.id },
            asset: { id: validAssetId, user_id: mockUser.id },
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValue({
          data: { id: 'edit-123' },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/frame.jpg' },
        }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Edit Modes', () => {
    it('should support global mode (default)', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validFrameId,
            project_id: validProjectId,
            asset_id: validAssetId,
            storage_path: 'supabase://frames/test.jpg',
            project: { id: validProjectId, user_id: mockUser.id },
            asset: { id: validAssetId, user_id: mockUser.id },
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValue({
          data: { id: 'edit-123', mode: 'global' },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/frame.jpg' },
        }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Test' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(200);
    });

    it('should support crop mode with parameters', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validFrameId,
            project_id: validProjectId,
            asset_id: validAssetId,
            storage_path: 'supabase://frames/test.jpg',
            project: { id: validProjectId, user_id: mockUser.id },
            asset: { id: validAssetId, user_id: mockUser.id },
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValue({
          data: { id: 'edit-123', mode: 'crop' },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/frame.jpg' },
        }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({
            prompt: 'Test',
            mode: 'crop',
            cropX: 100,
            cropY: 100,
            cropSize: 200,
            feather: 10,
          }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases', () => {
    it('should successfully create frame edits', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: validFrameId,
            project_id: validProjectId,
            asset_id: validAssetId,
            storage_path: 'supabase://frames/test.jpg',
            project: { id: validProjectId, user_id: mockUser.id },
            asset: { id: validAssetId, user_id: mockUser.id },
          },
          error: null,
        })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValue({
          data: {
            id: 'edit-123',
            frame_id: validFrameId,
            version: 1,
            prompt: 'Test',
          },
          error: null,
        });

      mockSupabase.storage.from.mockReturnValue({
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.com/frame.jpg' },
        }),
      });

      const mockRequest = new NextRequest(
        `http://localhost/api/frames/${validFrameId}/edit`,
        {
          method: 'POST',
          body: JSON.stringify({ prompt: 'Make it brighter' }),
        }
      );

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: validFrameId }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.edits).toBeDefined();
      expect(data.count).toBeGreaterThan(0);
    });
  });
});
