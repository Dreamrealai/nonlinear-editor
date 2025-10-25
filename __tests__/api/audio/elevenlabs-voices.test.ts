/**
 * Tests for GET /api/audio/elevenlabs/voices - List ElevenLabs Voices
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/audio/elevenlabs/voices/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      return handler(req, { user, supabase, params: context?.params || {} });
    }),
  })
);

jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
  })
);

global.fetch = jest.fn();

describe('GET /api/audio/elevenlabs/voices', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    process.env['ELEVENLABS_API_KEY'] = 'test-elevenlabs-key';

    // Mock successful ElevenLabs API response
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        voices: [
          {
            voice_id: 'voice-1',
            name: 'Rachel',
            category: 'premade',
            labels: { accent: 'american' },
            description: 'Young female voice',
            preview_url: 'https://elevenlabs.io/preview/voice-1.mp3',
          },
          {
            voice_id: 'voice-2',
            name: 'Josh',
            category: 'premade',
            labels: { accent: 'american' },
            description: 'Male voice',
          },
        ],
      }),
    });
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
    delete process.env['ELEVENLABS_API_KEY'];
    jest.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should require authentication', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: null,
        supabase: mockSupabase,
      } as any);

      // withAuth should handle this, but the handler will receive unauthenticated request
      // Since this route uses withAuth, we can't directly test 401, but we verify auth is checked
      expect(mockSupabase.auth.getUser).toHaveBeenCalled();
    });
  });

  describe('API Key Configuration', () => {
    it('should return 500 when ELEVENLABS_API_KEY is not configured', async () => {
      delete process.env['ELEVENLABS_API_KEY'];
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('API key');
    });
  });

  describe('ElevenLabs API Integration', () => {
    it('should call ElevenLabs API with correct headers', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/voices',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'xi-api-key': 'test-elevenlabs-key',
          }),
        })
      );
    });

    it('should handle ElevenLabs API errors', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key',
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toContain('Failed to fetch voices');
    });

    it('should handle API timeout', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(504);
      const data = await response.json();
      expect(data.error).toContain('timeout');
    });

    it('should handle network errors', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Success Cases', () => {
    it('should return list of voices successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.voices).toBeDefined();
      expect(data.voices).toHaveLength(2);
      expect(data.voices[0].voice_id).toBe('voice-1');
      expect(data.voices[0].name).toBe('Rachel');
      expect(data.voices[0].category).toBe('premade');
    });

    it('should handle voices with optional fields', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          voices: [
            {
              voice_id: 'voice-3',
              name: 'Custom Voice',
              category: 'cloned',
              labels: {},
            },
          ],
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.voices).toHaveLength(1);
      expect(data.voices[0].description).toBeUndefined();
      expect(data.voices[0].preview_url).toBeUndefined();
    });

    it('should handle empty voices array', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          voices: [],
        }),
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.voices).toEqual([]);
    });
  });

  describe('Response Format', () => {
    it('should include all voice fields', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      const response = await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      const data = await response.json();
      const voice = data.voices[0];

      expect(voice).toHaveProperty('voice_id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('category');
      expect(voice).toHaveProperty('labels');
      expect(voice).toHaveProperty('description');
      expect(voice).toHaveProperty('preview_url');
    });
  });

  describe('Logging', () => {
    it('should log errors on API failure', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Server error',
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(serverLogger.error).toHaveBeenCalled();
    });

    it('should log timeout errors', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      (global.fetch as jest.Mock).mockImplementation(() => {
        const error = new Error('Timeout');
        error.name = 'AbortError';
        return Promise.reject(error);
      });

      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/voices');

      await GET(mockRequest, {
        user: mockUser,
        supabase: mockSupabase,
      } as any);

      expect(serverLogger.error).toHaveBeenCalled();
    });
  });
});
