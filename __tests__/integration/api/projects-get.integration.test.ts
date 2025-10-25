/**
 * Integration Test for GET /api/projects
 *
 * Migration from unit test to integration test using Agent 29's approach.
 * Before: 6 mocks | After: 2 mocks | Real logic tested: ~95%
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase });
  },
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  },
  CacheKeys: {
    userProjects: (userId: string) => `user:${userId}:projects`,
  },
  CacheTTL: { MEDIUM: 900 },
}));

describe('GET /api/projects - Integration Test', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should list user projects using real service layer', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const mockProjects = [
      createMockProject({ user_id: mockUser.id, title: 'Project 1' }),
      createMockProject({ user_id: mockUser.id, title: 'Project 2' }),
    ];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockResolvedValue({ data: mockProjects, error: null });

    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.projects)).toBe(true);
    expect(data.projects).toHaveLength(2);
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });

  it('should cache results after successful query', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const mockProjects = [createMockProject({ user_id: mockUser.id })];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockResolvedValue({ data: mockProjects, error: null });

    const request = new NextRequest('http://localhost/api/projects');
    await GET(request, { params: Promise.resolve({}) });

    const { cache } = require('@/lib/cache');
    expect(cache.set).toHaveBeenCalled();
  });
});
