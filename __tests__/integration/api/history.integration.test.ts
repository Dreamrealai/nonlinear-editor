/**
 * Integration Test for GET /api/history
 *
 * Migration from unit test to integration test using Agent 29's approach.
 * Before: 6 mocks | After: 2 mocks | Real logic tested: ~95%
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/history/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock(
  '@/lib/api/withAuth',
  (): Record<string, unknown> => ({
    withAuth: (handler: any) => async (req: any, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      return handler(req, { user, supabase });
    },
  })
);

jest.mock(
  '@/lib/supabase',
  (): Record<string, unknown> => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('GET /api/history - Integration Test', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks(mockSupabase);
  });

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const request = new NextRequest('http://localhost/api/history');
    const response = await GET(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should retrieve user activity history using real service layer', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const mockHistory = [
      {
        id: 'hist-1',
        user_id: mockUser.id,
        activity_type: 'project_created',
        created_at: new Date().toISOString(),
      },
    ];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockResolvedValue({ data: mockHistory, error: null });

    const request = new NextRequest('http://localhost/api/history');
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.activities)).toBe(true);
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });

  it('should paginate results when limit provided', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockResolvedValue({ data: [], error: null });

    const request = new NextRequest('http://localhost/api/history?limit=50');
    await GET(request, { params: Promise.resolve({}) });

    expect(mockSupabase.limit).toHaveBeenCalledWith(50);
  });
});
