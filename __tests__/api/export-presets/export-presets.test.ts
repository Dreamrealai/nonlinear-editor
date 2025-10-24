/**
 * Tests for /api/export-presets - Export Presets Management
 * GET - List all presets, POST - Create custom preset
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
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

jest.mock('@/lib/supabase', () => ({ createServerSupabaseClient: jest.fn() }));
jest.mock('@/lib/serverLogger', () => ({ serverLogger: { info: jest.fn(), error: jest.fn() } }));
jest.mock('@/lib/rateLimit', () => ({ RATE_LIMITS: { tier3_status_read: { requests: 60, window: 60 }, tier2_resource_creation: { requests: 10, window: 60 } } }));

describe('GET /api/export-presets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    mockSupabase.order.mockResolvedValue({
      data: [
        { id: 'preset-1', name: 'YouTube 1080p', is_platform: true, is_custom: false },
        { id: 'preset-2', name: 'My Custom', is_platform: false, is_custom: true, user_id: 'test-user-id' },
      ],
      error: null,
    });
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest('http://localhost/api/export-presets', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(401);
  });

  it('should return platform and user presets', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const response = await GET(new NextRequest('http://localhost/api/export-presets', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.presets).toHaveLength(2);
    expect(mockSupabase.or).toHaveBeenCalledWith(`is_platform.eq.true,user_id.eq.${mockUser.id}`);
  });

  it('should order by platform first, then created_at', async () => {
    mockAuthenticatedUser(mockSupabase);
    await GET(new NextRequest('http://localhost/api/export-presets', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(mockSupabase.order).toHaveBeenCalledWith('is_platform', { ascending: false });
    expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: true });
  });

  it('should return 500 on database error', async () => {
    mockAuthenticatedUser(mockSupabase);
    mockSupabase.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    const response = await GET(new NextRequest('http://localhost/api/export-presets', { method: 'GET' }), { params: Promise.resolve({}) });
    expect(response.status).toBe(500);
  });
});

describe('POST /api/export-presets', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    mockSupabase.single.mockResolvedValue({
      data: { id: 'new-preset', name: 'My Custom Preset' },
      error: null,
    });
  });

  afterEach(() => resetAllMocks());

  it('should return 401 when not authenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', settings: { width: 1920, height: 1080, fps: 30 } }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(401);
  });

  it('should create custom preset with valid data', async () => {
    const mockUser = mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({
          name: 'My Custom',
          description: 'Test preset',
          settings: { width: 1920, height: 1080, fps: 30 },
        }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(200);
    expect(mockSupabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: mockUser.id,
        name: 'My Custom',
        description: 'Test preset',
        is_custom: true,
        is_platform: false,
      })
    );
  });

  it('should return 400 when name is missing', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ settings: { width: 1920, height: 1080, fps: 30 } }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(400);
  });

  it('should return 400 when settings is invalid', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', settings: 'invalid' }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(400);
  });

  it('should return 400 when width is invalid', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', settings: { width: 0, height: 1080, fps: 30 } }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(400);
  });

  it('should return 400 when height exceeds max', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', settings: { width: 1920, height: 10000, fps: 30 } }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(400);
  });

  it('should accept optional description', async () => {
    mockAuthenticatedUser(mockSupabase);
    const response = await POST(
      new NextRequest('http://localhost/api/export-presets', {
        method: 'POST',
        body: JSON.stringify({ name: 'Test', settings: { width: 1920, height: 1080, fps: 30 } }),
      }),
      { params: Promise.resolve({}) }
    );
    expect(response.status).toBe(200);
  });
});
