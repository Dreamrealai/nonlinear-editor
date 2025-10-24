/**
 * Tests for POST /api/frames/[frameId]/edit - Frame Edit with AI
 *
 * Tests comprehensive security checks including:
 * - Authentication requirements
 * - Authorization (ownership verification chain: frame → asset → project → user)
 * - Rate limiting
 * - Audit logging for successful and failed attempts
 * - Input validation
 * - Edge cases (non-existent resources, missing API keys)
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';
import { AuditAction } from '@/lib/auditLog';
import { HttpStatusCode } from '@/lib/errors/errorCodes';

// Store mocks at module level
let mockSupabaseForAuth: any = null;
let mockAuditLog: jest.Mock;
let mockAuditSecurityEvent: jest.Mock;
let mockCheckRateLimit: jest.Mock;

// Mock modules - MUST be at top level before route import
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseForAuth)),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    child: jest.fn(() => ({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    })),
  },
}));

jest.mock('@/lib/auditLog', () => ({
  auditLog: jest.fn().mockResolvedValue(undefined),
  auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
  AuditAction: {
    FRAME_EDIT_REQUEST: 'frame.edit.request',
    FRAME_EDIT_COMPLETE: 'frame.edit.complete',
    FRAME_EDIT_FAILED: 'frame.edit.failed',
    FRAME_EDIT_UNAUTHORIZED: 'frame.edit.unauthorized',
    SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { max: 10, windowMs: 60000 },
  },
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn(() => ({
    getGenerativeModel: jest.fn(() => ({
      generateContent: jest.fn(() =>
        Promise.resolve({
          response: {
            text: jest.fn(() => 'Mock AI edit instructions'),
          },
        })
      ),
    })),
  })),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

// Mock fetch for frame image fetching
global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    headers: {
      get: () => 'image/jpeg',
    },
  })
) as jest.Mock;

// Import route AFTER mocks are configured
import { POST } from '@/app/api/frames/[frameId]/edit/route';

describe('POST /api/frames/[frameId]/edit', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const mockUser = createMockUser();
  const mockProject = createMockProject();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabaseForAuth = mockSupabase;

    // Get mocked functions
    const auditModule = require('@/lib/auditLog');
    mockAuditLog = auditModule.auditLog;
    mockAuditSecurityEvent = auditModule.auditSecurityEvent;

    const rateLimitModule = require('@/lib/rateLimit');
    mockCheckRateLimit = rateLimitModule.checkRateLimit;

    // Set environment variable for Gemini API
    process.env.GEMINI_API_KEY = 'test-api-key';

    // Default authenticated user
    mockAuthenticatedUser(mockSupabase, mockUser);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env.GEMINI_API_KEY;
  });

  /**
   * Helper function to create a mock frame with ownership chain
   */
  function createMockFrame(overrides?: {
    frameId?: string;
    userId?: string;
    projectUserId?: string;
    assetUserId?: string;
  }) {
    const frameId = overrides?.frameId || 'test-frame-id';
    const userId = overrides?.userId || mockUser.id;
    const projectUserId = overrides?.projectUserId || userId;
    const assetUserId = overrides?.assetUserId || userId;

    return {
      id: frameId,
      project_id: mockProject.id,
      asset_id: 'test-asset-id',
      storage_path: 'supabase://frames/test-user-id/test-project-id/test-frame.jpg',
      timestamp: 0,
      created_at: '2025-01-01T00:00:00Z',
      project: {
        id: mockProject.id,
        user_id: projectUserId,
      },
      asset: {
        id: 'test-asset-id',
        user_id: assetUserId,
      },
    };
  }

  /**
   * Helper function to create a mock request
   */
  function createFrameEditRequest(frameId: string, body: Record<string, unknown>) {
    return new NextRequest(`http://localhost/api/frames/${frameId}/edit`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');

      // Should log security event
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.SECURITY_UNAUTHORIZED_ACCESS,
        null,
        expect.anything(),
        expect.objectContaining({
          route: '/api/frames/[frameId]/edit',
        })
      );
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when prompt is missing', async () => {
      mockRequest = createFrameEditRequest('test-frame-id', {});

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
      const data = await response.json();
      expect(data.error).toBe('Prompt is required');

      // Should log failed attempt
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_FAILED,
          resourceType: 'frame',
          resourceId: 'test-frame-id',
          metadata: { error: 'Invalid prompt' },
          statusCode: HttpStatusCode.BAD_REQUEST,
        })
      );
    });

    it('should return 400 when prompt is not a string', async () => {
      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 123,
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
      const data = await response.json();
      expect(data.error).toBe('Prompt is required');
    });
  });

  describe('Authorization - Ownership Verification', () => {
    it('should return 404 when frame does not exist', async () => {
      // Mock frame not found
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Frame not found' },
      });

      mockRequest = createFrameEditRequest('nonexistent-frame', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'nonexistent-frame' }),
      });

      expect(response.status).toBe(HttpStatusCode.NOT_FOUND);
      const data = await response.json();
      expect(data.error).toBe('Frame not found');

      // Should log failed attempt
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_FAILED,
          resourceType: 'frame',
          resourceId: 'nonexistent-frame',
          statusCode: HttpStatusCode.NOT_FOUND,
        })
      );
    });

    it('should return 403 when user does not own the project', async () => {
      const otherUserId = 'other-user-id';
      const frame = createMockFrame({ projectUserId: otherUserId });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized - you do not own this project');

      // Should log unauthorized attempt
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.FRAME_EDIT_UNAUTHORIZED,
        mockUser.id,
        expect.anything(),
        expect.objectContaining({
          frameId: 'test-frame-id',
          projectId: mockProject.id,
          reason: 'project_ownership_mismatch',
        })
      );
    });

    it('should return 403 when user does not own the asset', async () => {
      const otherUserId = 'other-user-id';
      const frame = createMockFrame({ assetUserId: otherUserId });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized - you do not own this asset');

      // Should log unauthorized attempt
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.FRAME_EDIT_UNAUTHORIZED,
        mockUser.id,
        expect.anything(),
        expect.objectContaining({
          frameId: 'test-frame-id',
          assetId: 'test-asset-id',
          reason: 'asset_ownership_mismatch',
        })
      );
    });

    it('should succeed when user owns both project and asset', async () => {
      const frame = createMockFrame();

      // Mock frame query
      mockSupabase.single.mockResolvedValueOnce({
        data: frame,
        error: null,
      });

      // Mock existing edits query
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      // Mock storage getPublicUrl
      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      // Mock insert edit
      mockSupabase.single.mockResolvedValueOnce({
        data: {
          id: 'mock-uuid-123',
          frame_id: 'test-frame-id',
          version: 1,
          mode: 'global',
          prompt: 'Make it brighter',
        },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
        mode: 'global',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.OK);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.edits).toHaveLength(4); // Default numVariations

      // Should log request and completion
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_REQUEST,
          resourceType: 'frame',
          resourceId: 'test-frame-id',
        })
      );

      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_COMPLETE,
          resourceType: 'frame',
          resourceId: 'test-frame-id',
          statusCode: HttpStatusCode.OK,
        })
      );
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting for frame edit operations', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.RATE_LIMITED);
      const data = await response.json();
      expect(data.error).toBe('Rate limit exceeded');

      // Should have rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should use tier2_resource_creation rate limit', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Should check rate limit with user identifier
      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        `user:${mockUser.id}`,
        expect.objectContaining({
          max: 10,
          windowMs: 60000,
        })
      );
    });
  });

  describe('API Configuration', () => {
    it('should return 503 when Gemini API key is not configured', async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.AISTUDIO_API_KEY;

      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.SERVICE_UNAVAILABLE);
      const data = await response.json();
      expect(data.error).toContain('Gemini API key not configured');

      // Should log failed attempt
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_FAILED,
          metadata: { error: 'Gemini API key not configured' },
          statusCode: HttpStatusCode.SERVICE_UNAVAILABLE,
        })
      );
    });
  });

  describe('Edit Variations', () => {
    it('should create multiple variations when numVariations is specified', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      // Mock insert for multiple variations
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-uuid-123',
          frame_id: 'test-frame-id',
          version: 1,
        },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
        numVariations: 2,
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.OK);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.count).toBe(2);
      expect(data.edits).toHaveLength(2);
    });

    it('should limit variations to maximum of 8', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'mock-uuid-123',
          frame_id: 'test-frame-id',
          version: 1,
        },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
        numVariations: 100, // Request way more than allowed
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.OK);
      const data = await response.json();
      expect(data.count).toBe(8); // Should be limited to 8
    });
  });

  describe('Audit Logging', () => {
    it('should log frame edit request at start', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'mock-uuid-123' },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
        mode: 'crop',
        referenceImages: ['https://example.com/ref.jpg'],
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Should log request
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_REQUEST,
          resourceType: 'frame',
          resourceId: 'test-frame-id',
          metadata: expect.objectContaining({
            mode: 'crop',
            hasReferenceImages: true,
          }),
        })
      );
    });

    it('should log completion with duration and metadata', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'mock-uuid-123' },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it brighter',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Should log completion
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUser.id,
          action: AuditAction.FRAME_EDIT_COMPLETE,
          resourceType: 'frame',
          resourceId: 'test-frame-id',
          metadata: expect.objectContaining({
            projectId: mockProject.id,
            assetId: 'test-asset-id',
            numEditsCreated: 4,
          }),
          statusCode: HttpStatusCode.OK,
          durationMs: expect.any(Number),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle reference images in the request', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'mock-uuid-123' },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Make it match the reference',
        referenceImages: ['https://example.com/ref1.jpg', 'https://example.com/ref2.jpg'],
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.OK);

      // Should fetch reference images
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/ref1.jpg');
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/ref2.jpg');
    });

    it('should handle crop mode with coordinates', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockSupabase.storage.getPublicUrl.mockReturnValue({
        data: { publicUrl: 'https://example.com/test-frame.jpg' },
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'mock-uuid-123' },
        error: null,
      });

      mockRequest = createFrameEditRequest('test-frame-id', {
        prompt: 'Enhance the selected area',
        mode: 'crop',
        cropX: 100,
        cropY: 200,
        cropSize: 300,
        feather: 10,
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.OK);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });
});
