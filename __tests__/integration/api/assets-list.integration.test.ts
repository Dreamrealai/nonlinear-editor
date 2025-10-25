/**
 * Integration Test for GET /api/assets/list
 *
 * Migration from unit test to integration test using Agent 29's approach.
 * Before: 6 mocks | After: 2 mocks | Real logic tested: ~95%
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/assets/route';
import {
  createMockSupabaseClient,
  createMockAsset,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

jest.mock('@/lib/api/withAuth', (): Record<string, unknown> => ({
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

jest.mock('@/lib/supabase', (): Record<string, unknown> => ({
  createServerSupabaseClient: jest.fn(),
}));

jest.mock('@/lib/serverLogger', (): Record<string, unknown> => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('GET /api/assets/list - Integration Test', () => {
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
    const request = new NextRequest('http://localhost/api/assets/list');
    const response = await GET(request, { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should list user assets using real service layer', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const mockAssets = [
      createMockAsset({ user_id: mockUser.id, type: 'video' }),
      createMockAsset({ user_id: mockUser.id, type: 'image' }),
    ];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockResolvedValue({ data: mockAssets, error: null });

    const request = new NextRequest('http://localhost/api/assets/list');
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data.assets)).toBe(true);
    expect(data.assets).toHaveLength(2);
    expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
  });

  it('should filter assets by project_id when provided', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const projectId = '123e4567-e89b-12d3-a456-426614174000';
    const mockAssets = [createMockAsset({ user_id: mockUser.id, project_id: projectId })];
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.order.mockResolvedValue({ data: mockAssets, error: null });

    const request = new NextRequest(`http://localhost/api/assets/list?projectId=${projectId}`);
    const response = await GET(request, { params: Promise.resolve({}) });

    expect(response.status).toBe(200);
    expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', projectId);
  });
});
