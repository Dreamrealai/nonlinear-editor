/**
 * Tests for POST /api/frames/[frameId]/edit - Frame Edit with AI
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/frames/[frameId]/edit/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock modules
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/test-utils/mockSupabase');
  const mockClient = createMockSupabaseClient();

  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    __getMockClient: () => mockClient,
  };
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn(),
    }),
  })),
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60_000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { max: 10, windowMs: 60_000 },
  },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('@/lib/auditLog', () => ({
  auditLog: jest.fn(),
  auditSecurityEvent: jest.fn(),
  AuditAction: {
    FRAME_EDIT_REQUEST: 'frame_edit_request',
    FRAME_EDIT_COMPLETE: 'frame_edit_complete',
    FRAME_EDIT_FAILED: 'frame_edit_failed',
    FRAME_EDIT_UNAUTHORIZED: 'frame_edit_unauthorized',
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-edit-id'),
}));

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

// Mock global fetch
global.fetch = jest.fn();

const { checkRateLimit } = require('@/lib/rateLimit');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { auditLog, auditSecurityEvent } = require('@/lib/auditLog');

const validFrameId = '550e8400-e29b-41d4-a716-446655440001';
const validProjectId = '550e8400-e29b-41d4-a716-446655440002';
const validAssetId = '550e8400-e29b-41d4-a716-446655440003';

describe('POST /api/frames/[frameId]/edit', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockGenerateContent: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    const { __getMockClient } = require('@/lib/supabase');
    mockSupabase = __getMockClient();

    // Setup default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });

    // Setup default rate limit
    (checkRateLimit as jest.Mock).mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60_000,
    });

    // Setup Gemini mock
    mockGenerateContent = jest.fn().mockResolvedValue({
      response: {
        text: () => 'Edit description for frame',
      },
    });

    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    }));

    // Setup default fetch mock for frame image
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      headers: {
        get: jest.fn().mockReturnValue('image/jpeg'),
      },
    });

    // Setup default storage mock
    mockSupabase.storage.from.mockReturnThis();
    mockSupabase.storage.getPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.com/frame.jpg' },
    });

    // Set API key
    process.env['AISTUDIO_API_KEY'] = 'test-api-key';
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env['AISTUDIO_API_KEY'];
    delete process.env['GEMINI_API_KEY'];
  });

  // Helper to create default frame data
  const createMockFrame = (userId = 'test-user-id') => ({
    id: validFrameId,
    project_id: validProjectId,
    asset_id: validAssetId,
    storage_path: 'supabase://frames/user/project/frame.jpg',
    project: {
      id: validProjectId,
      user_id: userId,
    },
    asset: {
      id: validAssetId,
      user_id: userId,
    },
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when frameId is missing', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Frame ID is required');
    });

    it('should return 400 when prompt is missing', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'global',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Prompt is required');
      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({ error: 'Invalid prompt' }),
        })
      );
    });

    it('should return 400 when prompt is not a string', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 123,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit is exceeded', async () => {
      mockAuthenticatedUser(mockSupabase);
      (checkRateLimit as jest.Mock).mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60_000,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(429);
    });
  });

  describe('Authorization', () => {
    it('should return 404 when frame is not found', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Frame not found' },
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain('Frame not found');
    });

    it('should return 403 when user does not own the project', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame('different-user-id'),
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('do not own this project');
      expect(auditSecurityEvent).toHaveBeenCalled();
    });

    it('should return 403 when user does not own the asset', async () => {
      mockAuthenticatedUser(mockSupabase);

      const frame = createMockFrame();
      frame.asset.user_id = 'different-user-id';

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toContain('do not own this asset');
      expect(auditSecurityEvent).toHaveBeenCalled();
    });
  });

  describe('API Configuration', () => {
    it('should return 503 when API key is not configured', async () => {
      delete process.env['AISTUDIO_API_KEY'];
      delete process.env['GEMINI_API_KEY'];
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('API key not configured');
    });

    it('should accept GEMINI_API_KEY as fallback', async () => {
      delete process.env['AISTUDIO_API_KEY'];
      process.env['GEMINI_API_KEY'] = 'fallback-api-key';
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      // Mock existing edits query
      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      // Mock insert for frame_edits
      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-edit-id',
          frame_id: validFrameId,
          version: 1,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
    });
  });

  describe('Success Cases - Global Mode', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-edit-id',
          frame_id: validFrameId,
          version: 1,
        },
        error: null,
      });
    });

    it('should successfully edit frame in global mode', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          mode: 'global',
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.edits).toHaveLength(4); // Default numVariations
      expect(data.count).toBe(4);
    });

    it('should generate single variation when numVariations is 1', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 1,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.edits).toHaveLength(1);
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should limit numVariations to maximum of 8', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 100,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.edits).toHaveLength(8);
      expect(mockGenerateContent).toHaveBeenCalledTimes(8);
    });

    it('should increment version numbers correctly', async () => {
      // Mock existing edit with version 5
      mockSupabase.limit.mockResolvedValue({
        data: [{ version: 5 }],
        error: null,
      });

      let insertCallCount = 0;
      mockSupabase.insert.mockImplementation(() => {
        insertCallCount++;
        return mockSupabase;
      });

      mockSupabase.single.mockImplementation(() => {
        return Promise.resolve({
          data: {
            id: 'mock-edit-id',
            frame_id: validFrameId,
            version: 5 + insertCallCount,
          },
          error: null,
        });
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 2,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      expect(mockSupabase.insert).toHaveBeenCalledTimes(2);
      expect(mockSupabase.insert).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({ version: 6 })
      );
      expect(mockSupabase.insert).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({ version: 7 })
      );
    });
  });

  describe('Success Cases - Crop Mode', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-edit-id',
          frame_id: validFrameId,
          version: 1,
        },
        error: null,
      });
    });

    it('should edit with crop parameters', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Remove the object',
          mode: 'crop',
          cropX: 100,
          cropY: 200,
          cropSize: 300,
          feather: 10,
          numVariations: 1,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'crop',
          crop_x: 100,
          crop_y: 200,
          crop_size: 300,
          feather: 10,
        })
      );
    });

    it('should include crop coordinates in prompt', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Enhance the region',
          mode: 'crop',
          cropX: 50,
          cropY: 75,
          cropSize: 150,
          numVariations: 1,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('coordinates (50, 75)'),
          }),
        ])
      );
    });
  });

  describe('Reference Images', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-edit-id',
          frame_id: validFrameId,
          version: 1,
        },
        error: null,
      });
    });

    it('should fetch and include reference images', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Apply the style',
          referenceImages: ['https://example.com/ref1.jpg', 'https://example.com/ref2.jpg'],
          numVariations: 1,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(global.fetch).toHaveBeenCalledWith('https://example.com/ref1.jpg');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/ref2.jpg');
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            inlineData: expect.any(Object),
          }),
        ])
      );
    });

    it('should include reference image count in metadata', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Apply the style',
          referenceImages: ['https://example.com/ref1.jpg'],
          numVariations: 1,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            referenceImages: 1,
          }),
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should continue with other variations if one fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValueOnce({
        data: createMockFrame(),
        error: null,
      });

      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      let callCount = 0;
      mockSupabase.insert.mockImplementation(() => {
        callCount++;
        return mockSupabase;
      });

      mockSupabase.single.mockImplementation(() => {
        if (callCount === 2) {
          return Promise.resolve({ data: null, error: { message: 'Database error' } });
        }
        return Promise.resolve({
          data: {
            id: 'mock-edit-id',
            frame_id: validFrameId,
            version: callCount,
          },
          error: null,
        });
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 3,
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.edits).toHaveLength(2); // 2 successful, 1 failed
    });

    it('should handle Gemini API errors', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      mockGenerateContent.mockRejectedValue(new Error('Gemini API error'));

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 1,
        }),
      });

      await expect(
        POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) })
      ).rejects.toThrow('Gemini API error');
    });

    it('should handle frame fetch errors', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 1,
        }),
      });

      await expect(
        POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) })
      ).rejects.toThrow();
    });
  });

  describe('Audit Logging', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.select.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: createMockFrame(),
        error: null,
      });

      mockSupabase.order.mockReturnThis();
      mockSupabase.limit.mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabase.insert.mockReturnThis();
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-edit-id',
          frame_id: validFrameId,
          version: 1,
        },
        error: null,
      });
    });

    it('should log frame edit request', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 2,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'frame_edit_request',
          resourceType: 'frame',
          resourceId: validFrameId,
          metadata: expect.objectContaining({
            mode: 'global',
            numVariations: 2,
          }),
        })
      );
    });

    it('should log successful completion', async () => {
      const mockRequest = new NextRequest('http://localhost/api/frames/test/edit', {
        method: 'POST',
        body: JSON.stringify({
          prompt: 'Make it brighter',
          numVariations: 1,
        }),
      });

      await POST(mockRequest, { params: Promise.resolve({ frameId: validFrameId }) });

      expect(auditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'frame_edit_complete',
          statusCode: 200,
          metadata: expect.objectContaining({
            numEditsCreated: 1,
          }),
        })
      );
    });
  });
});
