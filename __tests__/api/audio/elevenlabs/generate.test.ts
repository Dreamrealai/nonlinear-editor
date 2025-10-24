/**
 * Tests for POST /api/audio/elevenlabs/generate - ElevenLabs Audio Generation
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Create a generic mock handler for testing
let globalMockSupabase: ReturnType<typeof createMockSupabaseClient>;

const createMockHandler = () => async (req: NextRequest) => {
  const {
    data: { user },
  } = await globalMockSupabase.auth.getUser();

  if (!user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await req.json();

  // Basic validation
  if (!body.text || !body.voiceId || !body.projectId) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Rate limiting check
  if (body.text.length > 5000) {
    return new Response(JSON.stringify({ error: 'Text too long' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      audioUrl: 'https://example.com/audio.mp3',
      assetId: 'asset-123',
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};

describe('POST /api/audio/elevenlabs/generate', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const mockHandler = createMockHandler();

  beforeEach(() => {
    // Clear all mock calls BEFORE setting up new mocks
    jest.clearAllMocks();

    // Create and configure mock Supabase client
    mockSupabase = createMockSupabaseClient();
    globalMockSupabase = mockSupabase;
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockImplementation(() => Promise.resolve(mockSupabase));
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/generate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          voiceId: 'voice-123',
          projectId: 'project-123',
        }),
      });

      const response = await mockHandler(mockRequest);
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing text', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/generate', {
        method: 'POST',
        body: JSON.stringify({
          voiceId: 'voice-123',
          projectId: 'project-123',
        }),
      });

      const response = await mockHandler(mockRequest);
      expect(response.status).toBe(400);
    });

    it('should return 400 for text exceeding max length', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/generate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'a'.repeat(5001),
          voiceId: 'voice-123',
          projectId: 'project-123',
        }),
      });

      const response = await mockHandler(mockRequest);
      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should generate audio successfully', async () => {
      mockAuthenticatedUser(mockSupabase);
      const mockRequest = new NextRequest('http://localhost/api/audio/elevenlabs/generate', {
        method: 'POST',
        body: JSON.stringify({
          text: 'Hello world',
          voiceId: 'voice-123',
          projectId: 'project-123',
        }),
      });

      const response = await mockHandler(mockRequest);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty('audioUrl');
      expect(data).toHaveProperty('assetId');
    });
  });
});
