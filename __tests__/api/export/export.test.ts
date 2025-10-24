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
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

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

  describe('Input Validation - Required Fields', () => {
    it('should return 400 when projectId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
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
      expect(response.status).toBe(400);
    });

    it('should return 400 when timeline is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
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
      expect(response.status).toBe(400);
    });

    it('should return 400 when outputSpec is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 when all fields are missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('Timeline Validation', () => {
    it('should return 400 when timeline.clips is not an array', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: 'not-an-array' },
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
      expect(response.status).toBe(400);
    });

    it('should return 400 when clips is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {},
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
      expect(response.status).toBe(400);
    });
  });

  describe('ProjectId Validation', () => {
    it('should return 400 for invalid projectId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: 'invalid-uuid',
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
      expect(response.status).toBe(400);
    });
  });

  describe('OutputSpec Validation - Format', () => {
    it('should return 400 for invalid format', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'avi',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('OutputSpec Validation - Dimensions', () => {
    it('should return 400 for width below minimum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 0,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for width above maximum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 8000,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for height below minimum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 0,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for height above maximum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 5000,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for negative width', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: -1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for negative height', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: -1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('OutputSpec Validation - FPS', () => {
    it('should return 400 for fps below minimum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 0,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for fps above maximum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 121,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('OutputSpec Validation - Bitrates', () => {
    it('should return 400 for vBitrateK below minimum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 99,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for vBitrateK above maximum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 50001,
            aBitrateK: 128,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for aBitrateK below minimum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 31,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });

    it('should return 400 for aBitrateK above maximum', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 321,
            format: 'mp4',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(400);
    });
  });

  describe('Clip Validation', () => {
    it('should return 400 for clip with invalid id UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: 'invalid-uuid',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with invalid assetId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: 'invalid-uuid',
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with negative start time', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: -1,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with end <= start', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 10,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with end < start', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 10,
                end: 5,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with negative timelinePosition', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: -1,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for clip with negative trackIndex', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: -1,
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
      expect(response.status).toBe(400);
    });
  });

  describe('Clip Optional Fields Validation', () => {
    it('should return 400 for invalid volume (above max)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                volume: 3,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid volume (negative)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                volume: -1,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid opacity (above max)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                opacity: 2,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid opacity (negative)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                opacity: -0.5,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid speed (below min)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                speed: 0,
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid speed (above max)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                speed: 11,
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
      expect(response.status).toBe(400);
    });
  });

  describe('Transition Validation', () => {
    it('should return 400 for invalid transition type', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                transitionToNext: {
                  type: 'invalid-transition',
                  duration: 500,
                },
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
      expect(response.status).toBe(400);
    });

    it('should return 400 for negative transition duration', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
                start: 0,
                end: 10,
                timelinePosition: 0,
                trackIndex: 0,
                transitionToNext: {
                  type: 'crossfade',
                  duration: -1,
                },
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
      expect(response.status).toBe(400);
    });
  });

  describe('Project Ownership Verification', () => {
    it('should return error when user does not own project', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Project not found',
        status: 404,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
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
      expect(response.status).toBe(404);
    });

    it('should return 403 when user lacks permission', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValue({
        hasAccess: false,
        error: 'Permission denied',
        status: 403,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
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
      expect(response.status).toBe(403);
    });
  });

  describe('Database Errors', () => {
    it('should return 500 when job creation fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
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
      expect(response.status).toBe(500);
    });
  });

  describe('Success Cases', () => {
    it('should create export job successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: {
            clips: [
              {
                id: '550e8400-e29b-41d4-a716-446655440001',
                assetId: '550e8400-e29b-41d4-a716-446655440002',
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
      expect(data.jobId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(data.status).toBe('queued');
    });

    it('should accept empty clips array', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
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
      expect(response.status).toBe(202);
    });

    it('should accept webm format', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
        },
        error: null,
      });

      const mockRequest = new NextRequest('http://localhost/api/export', {
        method: 'POST',
        body: JSON.stringify({
          projectId: '550e8400-e29b-41d4-a716-446655440000',
          timeline: { clips: [] },
          outputSpec: {
            width: 1920,
            height: 1080,
            fps: 30,
            vBitrateK: 5000,
            aBitrateK: 128,
            format: 'webm',
          },
        }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      expect(response.status).toBe(202);
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
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when jobId is missing', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export');
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid jobId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export?jobId=invalid-uuid');
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for empty jobId', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/export?jobId=');
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe('Job Not Found', () => {
    it('should return 404 when job does not exist', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });

    it('should return 404 when job belongs to different user', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(404);
    });
  });

  describe('Success Cases - Job Status Mapping', () => {
    it('should get export job with pending status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'pending',
          progress_percentage: 0,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('queued');
    });

    it('should get export job with processing status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'processing',
          progress_percentage: 50,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('processing');
      expect(data.message).toContain('50%');
    });

    it('should get export job with completed status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'completed',
          progress_percentage: 100,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(data.message).toContain('completed successfully');
    });

    it('should get export job with failed status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'failed',
          progress_percentage: 25,
          error_message: 'Encoding failed',
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('failed');
      expect(data.message).toContain('Encoding failed');
    });

    it('should get export job with cancelled status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'cancelled',
          progress_percentage: 10,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('failed'); // Cancelled maps to failed
    });

    it('should handle failed job without error message', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'failed',
          progress_percentage: 0,
          error_message: null,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('Unknown error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle job with unknown status', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          status: 'unknown-status',
          progress_percentage: 0,
        },
        error: null,
      });

      const mockRequest = new NextRequest(
        'http://localhost/api/export?jobId=550e8400-e29b-41d4-a716-446655440000'
      );
      const response = await GET(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('queued'); // Default mapping
    });
  });
});
