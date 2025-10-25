/**
 * Tests for /api/templates - Project Templates
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/templates/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase/server');
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
  })
);

jest.mock(
  '@/lib/supabase/server',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      error: jest.fn(),
    },
  })
);

describe('GET /api/templates', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest('http://localhost/api/templates');
      const response = await GET(request, { user: null as any, supabase: mockSupabase });

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should return templates with default pagination', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockTemplates = [
        { id: '1', name: 'Template 1', category: 'video', is_public: true },
        { id: '2', name: 'Template 2', category: 'photo', is_public: false, user_id: mockUser.id },
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        textSearch: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: mockTemplates,
          error: null,
          count: 2,
        }),
      });

      const request = new NextRequest('http://localhost/api/templates');
      const response = await GET(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.templates).toEqual(mockTemplates);
      expect(data.total).toBe(2);
      expect(data.page).toBe(0);
      expect(data.pageSize).toBe(20);
    });

    it('should filter by category', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/templates?category=video');
      await GET(request, { user: mockUser, supabase: mockSupabase });

      expect(mockQuery.eq).toHaveBeenCalledWith('category', 'video');
    });

    it('should filter by tags', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        contains: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/templates?tags=cinematic,modern');
      await GET(request, { user: mockUser, supabase: mockSupabase });

      expect(mockQuery.contains).toHaveBeenCalledWith('tags', ['cinematic', 'modern']);
    });

    it('should handle pagination parameters', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({
          data: [],
          error: null,
          count: 0,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const request = new NextRequest('http://localhost/api/templates?page=2&pageSize=10');
      const response = await GET(request, { user: mockUser, supabase: mockSupabase });

      const data = await response.json();
      expect(data.page).toBe(2);
      expect(data.pageSize).toBe(10);
      expect(mockQuery.range).toHaveBeenCalledWith(20, 29);
    });
  });
});

describe('POST /api/templates', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase/server');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
          timeline_data: { clips: [] },
        }),
      });
      const response = await POST(request, { user: null as any, supabase: mockSupabase });

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for missing name', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          category: 'video',
          timeline_data: { clips: [] },
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing category', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          timeline_data: { clips: [] },
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(400);
    });

    it('should return 400 for missing timeline_data', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should create template successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const mockTemplate = {
        id: 'template-id',
        user_id: mockUser.id,
        name: 'Test Template',
        category: 'video',
        timeline_data: { clips: [] },
        is_public: false,
        is_featured: false,
        duration_seconds: 0,
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockTemplate,
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
          timeline_data: { clips: [] },
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.template).toEqual(mockTemplate);
    });

    it('should calculate duration from timeline data', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      const timelineData = {
        clips: [
          { timelinePosition: 0, start: 0, end: 5 },
          { timelinePosition: 5, start: 0, end: 3 },
        ],
      };

      const mockInsert = jest.fn().mockReturnThis();
      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'template-id' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
          timeline_data: timelineData,
        }),
      });
      await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          duration_seconds: 8, // 5 + 3
        })
      );
    });

    it('should accept optional fields', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'template-id' },
          error: null,
        }),
      });

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
          description: 'A test template',
          thumbnail_url: 'https://example.com/thumb.jpg',
          timeline_data: { clips: [] },
          is_public: true,
          tags: ['cinematic', 'modern'],
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(201);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database insert fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      });

      const request = new NextRequest('http://localhost/api/templates', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Template',
          category: 'video',
          timeline_data: { clips: [] },
        }),
      });
      const response = await POST(request, { user: mockUser, supabase: mockSupabase });

      expect(response.status).toBe(500);
    });
  });
});
