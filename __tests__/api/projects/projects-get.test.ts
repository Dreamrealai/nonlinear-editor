/**
 * Tests for GET /api/projects - List Projects
 */

import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/route';
import {
  createMockSupabaseClient,
  createMockProject,
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
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

jest.mock('@/lib/supabase', () => ({ createServerSupabaseClient: jest.fn() }));
jest.mock('@/lib/serverLogger', () => ({ serverLogger: { info: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/rateLimit', () => ({ RATE_LIMITS: { tier1_data_read: { requests: 60, window: 60 } } }));
jest.mock('@/lib/services/projectService', () => ({
  ProjectService: jest.fn().mockImplementation(() => ({
    listProjects: jest.fn().mockResolvedValue([
      createMockProject({ id: 'project-1', title: 'Project 1' }),
      createMockProject({ id: 'project-2', title: 'Project 2' }),
    ]),
  })),
}));

describe('GET /api/projects', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest('http://localhost/api/projects', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should list user projects', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest('http://localhost/api/projects', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('project-1');
    expect(data[1].id).toBe('project-2');
  });

  it('should return empty array when no projects exist', async () => {
    mockAuthenticatedUser(mockSupabase);
    const { ProjectService } = require('@/lib/services/projectService');
    ProjectService.mockImplementationOnce(() => ({
      listProjects: jest.fn().mockResolvedValue([]),
    }));

    const response = await GET(new NextRequest('http://localhost/api/projects', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should return 500 on service error', async () => {
    mockAuthenticatedUser(mockSupabase);
    const { ProjectService } = require('@/lib/services/projectService');
    ProjectService.mockImplementationOnce(() => ({
      listProjects: jest.fn().mockRejectedValue(new Error('Database error')),
    }));

    const response = await GET(new NextRequest('http://localhost/api/projects', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(500);
  });
});
