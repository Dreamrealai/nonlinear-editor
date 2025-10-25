/**
 * Extended Tests for POST /api/video/generate
 * Adds additional coverage to existing test suite
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/video/generate/route';
import {
  createMockSupabaseClient,
  createMockUser,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
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

// Mock modules
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/__tests__/helpers/apiMocks');
  const mockClient = createMockSupabaseClient();
  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    ensureHttpsProtocol: jest.fn((url) => url),
  };
});

jest.mock('@/lib/veo', (): Record<string, unknown> => ({ generateVideo: jest.fn() }));
jest.mock('@/lib/fal-video', (): Record<string, unknown> => ({ generateFalVideo: jest.fn() }));
jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn().mockResolvedValue({ success: true }),
    RATE_LIMITS: { tier2_resource_creation: { max: 10, windowMs: 60000 } },
  })
);
jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
  })
);

describe('POST /api/video/generate - Extended Coverage', () => {
  beforeEach(() => resetAllMocks());

  it('should return 401 for unauthenticated user', async () => {
    mockUnauthenticatedUser();
    const request = new NextRequest('http://localhost/api/video/generate', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', provider: 'veo' }),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should handle empty body gracefully', async () => {
    mockAuthenticatedUser();
    const request = new NextRequest('http://localhost/api/video/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    expect([400, 500]).toContain(response.status);
  });

  it('should handle malformed JSON', async () => {
    mockAuthenticatedUser();
    const request = new NextRequest('http://localhost/api/video/generate', {
      method: 'POST',
      body: 'not-json',
    });

    const response = await POST(request, { params: Promise.resolve({}) });
    expect([400, 500]).toContain(response.status);
  });
});
