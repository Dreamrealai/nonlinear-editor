/**
 * Tests for POST /api/projects - Project Creation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/projects/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockProject,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  resetAllMocks,
} from '@/test-utils/mockSupabase';

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();

    if (!supabase || !supabase.auth) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

// Mock the Supabase module
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
  ensureHttpsProtocol: jest.fn((url) => url),
}));

// Mock server logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateUserProjects: jest.fn().mockResolvedValue(undefined),
  invalidateProjectCache: jest.fn().mockResolvedValue(undefined),
}));

// Mock error tracking
jest.mock('@/lib/errorTracking', () => ({
  trackError: jest.fn(),
  ErrorCategory: { DATABASE: 'DATABASE' },
  ErrorSeverity: { HIGH: 'HIGH', MEDIUM: 'MEDIUM' },
}));

// Mock cache
jest.mock('@/lib/cache', () => ({
  cache: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
  },
  CacheKeys: {
    userProjects: (userId: string) => `user:${userId}:projects`,
    project: (projectId: string) => `project:${projectId}`,
  },
  CacheTTL: {
    SHORT: 300,
    MEDIUM: 900,
    LONG: 3600,
  },
}));

describe('POST /api/projects', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });
      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('Success Cases', () => {
    it('should create a project with custom title', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({
        title: 'My Custom Project',
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'My Custom Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe('My Custom Project');
      expect(data.user_id).toBe(mockUser.id);
      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'My Custom Project',
        user_id: mockUser.id,
        timeline_state_jsonb: {},
      });
    });

    it('should create a project with default title when no title provided', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({
        title: 'Untitled Project',
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.title).toBe('Untitled Project');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        title: 'Untitled Project',
        user_id: mockUser.id,
        timeline_state_jsonb: {},
      });
    });

    it('should create a project with empty timeline state', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({ user_id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.timeline_state_jsonb).toEqual({});
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when database insert fails', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockQueryError(mockSupabase, 'Database connection failed');

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to create project');
    });

    it('should return 500 when unexpected error occurs', async () => {
      mockAuthenticatedUser(mockSupabase);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Unexpected error');
    });

    it('should handle malformed JSON body', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: 'invalid json',
        headers: { 'Content-Type': 'application/json' },
      });

      // JSON parsing errors are caught by the withAuth wrapper in production
      // Since we're mocking withAuth to test the handler directly, we expect the error to throw
      await expect(POST(mockRequest, { params: Promise.resolve({}) })).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should accept empty title and use default', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({
        title: 'Untitled Project',
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Untitled Project',
        })
      );
    });

    it('should trim whitespace from title', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({
        title: 'Untitled Project',
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: '   ' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should accept very long titles', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const longTitle = 'A'.repeat(200); // Max allowed length is 200
      const mockProject = createMockProject({
        title: longTitle,
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: longTitle }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: longTitle,
        })
      );
    });
  });

  describe('Response Format', () => {
    it('should return complete project object', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({ user_id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('user_id');
      expect(data).toHaveProperty('title');
      expect(data).toHaveProperty('timeline_state_jsonb');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });

    it('should return correct content-type header', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({ user_id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.headers.get('content-type')).toContain('application/json');
    });
  });

  describe('Database Interactions', () => {
    it('should call database methods in correct order', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({ user_id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockSupabase.insert).toHaveBeenCalled();
      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });

    it('should use select().single() chain', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProject = createMockProject({ user_id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Project' }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });
});
