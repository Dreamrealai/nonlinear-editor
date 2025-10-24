/**
 * Tests for POST /api/export - Video Export
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/export/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/api/response', () => ({
  unauthorizedResponse: jest.fn(
    () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  ),
  validationError: jest.fn((msg) => new Response(JSON.stringify({ error: msg }), { status: 400 })),
  notFoundResponse: jest.fn(
    () => new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
  ),
  errorResponse: jest.fn((msg, status) => new Response(JSON.stringify({ error: msg }), { status })),
  successResponse: jest.fn((data) => new Response(JSON.stringify(data), { status: 200 })),
  withErrorHandling: jest.fn((handler) => handler),
}));

jest.mock('@/lib/api/project-verification', () => ({
  verifyProjectOwnership: jest.fn(),
}));

describe('POST /api/export', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    // Clear all mock calls BEFORE setting up new mocks
    jest.clearAllMocks();

    // Create and configure mock Supabase client
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockImplementation(() => Promise.resolve(mockSupabase));

    const { verifyProjectOwnership } = require('@/lib/api/project-verification');
    verifyProjectOwnership.mockResolvedValue({ hasAccess: true });

    process.env['VIDEO_EXPORT_ENABLED'] = 'true';
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env['VIDEO_EXPORT_ENABLED'];
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project-id',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(401);
    });
  });

  describe('Feature Flag', () => {
    it('should return 503 when export is disabled', async () => {
      mockAuthenticatedUser(mockSupabase);
      process.env['VIDEO_EXPORT_ENABLED'] = 'false';

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project-id-valid',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(503);
    });
  });

  describe('Success Cases', () => {
    it('should create export job successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'job-123',
          status: 'pending',
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'test-project-id-valid',
          timeline: {
            clips: [
              {
                id: 'clip-1-valid-uuid',
                assetId: 'asset-1-valid-uuid',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
              },
            ],
          },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(202);
      const data = await response.json();
      expect(data.jobId).toBe('job-123');
      expect(data.status).toBe('queued');
    });
  });
});

describe('GET /api/export', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    // Clear all mock calls BEFORE setting up new mocks
    jest.clearAllMocks();

    // Create and configure mock Supabase client
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockImplementation(() => Promise.resolve(mockSupabase));
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Success Cases', () => {
    it('should get export job status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'job-123',
          status: 'completed',
          progress_percentage: 100,
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/export?jobId=job-123-valid-uuid');
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });
  });
});
