/**
 * Security Tests for Frame Authorization (NEW-MED-003)
 *
 * CRITICAL SECURITY TESTS:
 * - Verifies ownership verification chain (frame → asset → project → user)
 * - Tests cross-user access prevention
 * - Validates audit logging for unauthorized attempts
 * - Tests rate limiting enforcement
 * - Verifies input validation
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

// Mock modules
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseForAuth)),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      child: jest.fn(
        () => ({
          debug: jest.fn(),
          info: jest.fn(),
          warn: jest.fn(),
          error: jest.fn(),
        })
      ),
    },
  })
);

jest.mock(
  '@/lib/auditLog',
  () => ({
    auditLog: jest.fn().mockResolvedValue(undefined),
    auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
    AuditAction: {
      FRAME_EDIT_REQUEST: 'frame.edit.request',
      FRAME_EDIT_COMPLETE: 'frame.edit.complete',
      FRAME_EDIT_FAILED: 'frame.edit.failed',
      FRAME_EDIT_UNAUTHORIZED: 'frame.edit.unauthorized',
      SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access',
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    checkRateLimit: jest.fn().mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60000,
    }),
    RATE_LIMITS: {
      tier2_resource_creation: { max: 10, windowMs: 60000 },
    },
  })
);

jest.mock(
  '@google/generative-ai',
  () => ({
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
  })
);

jest.mock(
  'uuid',
  () => ({
    v4: jest.fn(() => 'mock-uuid-123'),
  })
);

global.fetch = jest.fn(() =>
  Promise.resolve({
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    headers: {
      get: () => 'image/jpeg',
    },
  })
) as jest.Mock;

// Import route AFTER mocks
import { POST } from '@/app/api/frames/[frameId]/edit/route';

describe('Frame Authorization Security Tests (NEW-MED-003)', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const mockUser = createMockUser();
  const mockProject = createMockProject();

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    mockSupabaseForAuth = mockSupabase;

    // IMPORTANT: Re-setup Supabase mock after clearAllMocks
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Get mocked functions
    const auditModule = require('@/lib/auditLog');
    mockAuditLog = auditModule.auditLog;
    mockAuditSecurityEvent = auditModule.auditSecurityEvent;

    const rateLimitModule = require('@/lib/rateLimit');
    mockCheckRateLimit = rateLimitModule.checkRateLimit;

    // Reset mocks
    mockCheckRateLimit.mockResolvedValue({
      success: true,
      limit: 10,
      remaining: 9,
      resetAt: Date.now() + 60000,
    });

    process.env.GEMINI_API_KEY = 'test-api-key';
    mockAuthenticatedUser(mockSupabase, mockUser);
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env.GEMINI_API_KEY;
  });

  /**
   * Helper to create mock frame with ownership chain
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
   * Helper to create request
   */
  function createRequest(frameId: string, body: Record<string, unknown>) {
    return new NextRequest(`http://localhost/api/frames/${frameId}/edit`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  describe('OWNERSHIP VERIFICATION CHAIN', () => {
    it('SECURITY: must verify frame → asset → project → user ownership', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Verify query includes BOTH project and asset joins
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('project:projects!inner')
      );
      expect(mockSupabase.select).toHaveBeenCalledWith(
        expect.stringContaining('asset:assets!inner')
      );
    });

    it('SECURITY: must REJECT if user does not own project', async () => {
      const attacker = mockUser.id;
      const victim = 'other-user-id';

      const frame = createMockFrame({ projectUserId: victim });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'malicious edit',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // CRITICAL: Must return 403 Forbidden
      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      const data = await response.json();
      expect(data.error).toContain('you do not own this project');

      // CRITICAL: Must log security event
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.FRAME_EDIT_UNAUTHORIZED,
        attacker,
        expect.anything(),
        expect.objectContaining({
          frameId: 'test-frame-id',
          projectId: mockProject.id,
          reason: 'project_ownership_mismatch',
        })
      );
    });

    it('SECURITY: must REJECT if user does not own asset', async () => {
      const attacker = mockUser.id;
      const victim = 'other-user-id';

      const frame = createMockFrame({ assetUserId: victim });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'malicious edit',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // CRITICAL: Must return 403 Forbidden
      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      const data = await response.json();
      expect(data.error).toContain('you do not own this asset');

      // CRITICAL: Must log security event
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.FRAME_EDIT_UNAUTHORIZED,
        attacker,
        expect.anything(),
        expect.objectContaining({
          frameId: 'test-frame-id',
          assetId: 'test-asset-id',
          reason: 'asset_ownership_mismatch',
        })
      );
    });

    it('SECURITY: must REJECT if frame does not exist', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Frame not found' },
      });

      mockRequest = createRequest('nonexistent-frame', {
        prompt: 'test',
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
          action: AuditAction.FRAME_EDIT_FAILED,
          resourceType: 'frame',
          resourceId: 'nonexistent-frame',
          statusCode: HttpStatusCode.NOT_FOUND,
        })
      );
    });
  });

  describe('CROSS-USER ACCESS PREVENTION', () => {
    it("SECURITY: User A cannot edit User B's frames", async () => {
      const userA = mockUser.id; // Authenticated user
      const userB = 'user-b-id'; // Frame owner

      const frame = createMockFrame({
        userId: userB,
        projectUserId: userB,
        assetUserId: userB,
      });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'unauthorized edit attempt',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
      expect(mockAuditSecurityEvent).toHaveBeenCalled();
    });

    it('SECURITY: Cannot bypass authorization with NULL values', async () => {
      const frame = createMockFrame();
      frame.project = null as any; // Try to bypass check with null

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Should reject if project is missing
      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
    });

    it('SECURITY: Cannot bypass authorization with missing joins', async () => {
      const frame = {
        id: 'test-frame-id',
        project_id: mockProject.id,
        asset_id: 'test-asset-id',
        // Missing project and asset joins
      };

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Should reject if joins are missing
      expect(response.status).toBe(HttpStatusCode.FORBIDDEN);
    });
  });

  describe('AUDIT LOGGING', () => {
    it('SECURITY: must log ALL unauthorized access attempts', async () => {
      const frame = createMockFrame({ projectUserId: 'other-user-id' });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'unauthorized',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Must log security event
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.FRAME_EDIT_UNAUTHORIZED,
        mockUser.id,
        expect.anything(),
        expect.objectContaining({
          frameId: 'test-frame-id',
          reason: expect.any(String),
        })
      );
    });

    it('SECURITY: audit log must include attacker user ID', async () => {
      const attacker = mockUser.id;
      const frame = createMockFrame({ projectUserId: 'victim-id' });

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'attack',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        expect.anything(),
        attacker, // CRITICAL: Must include attacker ID
        expect.anything(),
        expect.anything()
      );
    });

    it('SECURITY: must log unauthenticated access attempts', async () => {
      mockUnauthenticatedUser(mockSupabase);

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.UNAUTHORIZED);
      expect(mockAuditSecurityEvent).toHaveBeenCalledWith(
        AuditAction.SECURITY_UNAUTHORIZED_ACCESS,
        null, // No user ID for unauthenticated
        expect.anything(),
        expect.objectContaining({
          route: '/api/frames/[frameId]/edit',
        })
      );
    });
  });

  describe('INPUT VALIDATION', () => {
    it('SECURITY: must reject requests without prompt', async () => {
      mockRequest = createRequest('test-frame-id', {});

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
      const data = await response.json();
      expect(data.error).toBe('Prompt is required');

      // Should log validation failure
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.FRAME_EDIT_FAILED,
          metadata: { error: 'Invalid prompt' },
        })
      );
    });

    it('SECURITY: must reject non-string prompts', async () => {
      mockRequest = createRequest('test-frame-id', {
        prompt: { malicious: 'object' },
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
    });

    it('SECURITY: must validate frameId parameter exists', async () => {
      mockRequest = createRequest('', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: '' }),
      });

      expect(response.status).toBe(HttpStatusCode.BAD_REQUEST);
    });
  });

  describe('RATE LIMITING', () => {
    it('SECURITY: must enforce tier2 rate limiting', async () => {
      mockCheckRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 10,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.RATE_LIMITED);

      // Should have rate limit headers
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('SECURITY: rate limit must be per-user', async () => {
      const frame = createMockFrame();

      mockSupabase.single.mockResolvedValue({
        data: frame,
        error: null,
      });

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      // Rate limit should be checked with user ID
      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        `user:${mockUser.id}`,
        expect.objectContaining({
          max: 10,
          windowMs: 60000,
        })
      );
    });
  });

  describe('API CONFIGURATION', () => {
    it('SECURITY: must fail gracefully if Gemini API not configured', async () => {
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

      mockRequest = createRequest('test-frame-id', {
        prompt: 'test',
      });

      const response = await POST(mockRequest, {
        params: Promise.resolve({ frameId: 'test-frame-id' }),
      });

      expect(response.status).toBe(HttpStatusCode.SERVICE_UNAVAILABLE);
      const data = await response.json();
      expect(data.error).toContain('Gemini API key not configured');
    });
  });
});
