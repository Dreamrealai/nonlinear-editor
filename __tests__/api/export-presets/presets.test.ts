/**
 * Tests for /api/export-presets - Export Presets
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/export-presets/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();

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

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GET /api/export-presets', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest('http://localhost/api/export-presets');
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should return platform and user presets', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockPresets = [
        {
          id: '1',
          name: 'YouTube 1080p',
          is_platform: true,
          settings: { width: 1920, height: 1080, fps: 30 },
        },
        {
          id: '2',
          name: 'Custom Preset',
          is_platform: false,
          user_id: mockUser.id,
          settings: { width: 1280, height: 720, fps: 60 },
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockPresets,
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets');
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.presets).toEqual(mockPresets);
    });

    it('should return empty array when no presets exist', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets');
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.presets).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database query fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets');
      const response = await GET(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });
});

describe('POST /api/export-presets', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing name', async () => {
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing settings', async () => {
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid width', async () => {
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
          settings: { width: 0, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid height', async () => {
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
          settings: { width: 1920, height: 10000, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid fps', async () => {
      mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
          settings: { width: 1920, height: 1080, fps: 0 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should create custom preset successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockPreset = {
        id: 'preset-id',
        user_id: mockUser.id,
        name: 'My Custom Preset',
        description: 'Test description',
        is_custom: true,
        is_platform: false,
        platform_type: 'custom',
        settings: { width: 1920, height: 1080, fps: 30 },
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPreset,
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'My Custom Preset',
          description: 'Test description',
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.preset).toEqual(mockPreset);
    });

    it('should create preset without description', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockPreset = {
        id: 'preset-id',
        user_id: mockUser.id,
        name: 'My Custom Preset',
        description: null,
        is_custom: true,
        is_platform: false,
        platform_type: 'custom',
        settings: { width: 1920, height: 1080, fps: 30 },
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockPreset,
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'My Custom Preset',
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(201);
    });

    it('should accept valid resolution ranges', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const validSettings = [
        { width: 1, height: 1, fps: 1 },
        { width: 1920, height: 1080, fps: 30 },
        { width: 3840, height: 2160, fps: 60 },
        { width: 7680, height: 4320, fps: 120 },
      ];

      for (const settings of validSettings) {
        jest.clearAllMocks();

        mockSupabase.from.mockReturnValue({
          insert: jest.fn().mockReturnThis(),
          select: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: { id: 'preset-id', settings },
            error: null,
          }),
        });

        const request = new NextRequest('http://localhost/api/export-presets', {
          method: 'POST',
          body: JSON.stringify({
            name: 'Test Preset',
            settings,
          }),
        });
        const response = await POST(request, { params: Promise.resolve({}) });

        expect(response.status).toBe(201);
      }
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database insert fails', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const request = new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Preset',
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      });
      const response = await POST(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });
});
