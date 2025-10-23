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
} from '@/__tests__/utils/mockSupabase';

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

// Mock response utilities
jest.mock('@/lib/api/response', () => {
  const jsonResponse = (payload: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });

  return {
    unauthorizedResponse: jest.fn(() =>
      jsonResponse({ error: 'Unauthorized' }, { status: 401 })
    ),
    errorResponse: jest.fn((message: string, status: number) =>
      jsonResponse({ error: message }, { status })
    ),
    withErrorHandling: jest.fn((handler: unknown) => handler),
    successResponse: jest.fn((data) => jsonResponse(data)),
  };
});

describe('POST /api/projects', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
    jest.clearAllMocks();
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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Database connection failed');
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

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });

    it('should handle malformed JSON body', async () => {
      mockAuthenticatedUser(mockSupabase);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
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

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });

    it('should accept very long titles', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const longTitle = 'A'.repeat(500);
      const mockProject = createMockProject({
        title: longTitle,
        user_id: mockUser.id,
      });
      mockQuerySuccess(mockSupabase, mockProject);

      mockRequest = new NextRequest('http://localhost/api/projects', {
        method: 'POST',
        body: JSON.stringify({ title: longTitle }),
      });

      const response = await POST(mockRequest);

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

      const response = await POST(mockRequest);
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

      const response = await POST(mockRequest);

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

      await POST(mockRequest);

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

      await POST(mockRequest);

      expect(mockSupabase.select).toHaveBeenCalled();
      expect(mockSupabase.single).toHaveBeenCalled();
    });
  });
});
