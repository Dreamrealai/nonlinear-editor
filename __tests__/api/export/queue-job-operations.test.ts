/**
 * Tests for Export Queue Job Operations:
 * - POST /api/export/queue/[jobId]/pause
 * - POST /api/export/queue/[jobId]/resume
 * - PATCH /api/export/queue/[jobId]/priority
 */

import { NextRequest } from 'next/server';
import { POST as pauseJob } from '@/app/api/export/queue/[jobId]/pause/route';
import { POST as resumeJob } from '@/app/api/export/queue/[jobId]/resume/route';
import { PATCH as updatePriority } from '@/app/api/export/queue/[jobId]/priority/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
} from '@/__tests__/helpers/apiMocks';

// Mock withAuth wrapper
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

jest.mock('@/lib/rateLimit', () => ({
  RATE_LIMITS: { tier2_resource_creation: { requests: 10, window: 60 } },
}));

describe('POST /api/export/queue/[jobId]/pause', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validJobId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid jobId UUID', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await pauseJob(
        new NextRequest('http://localhost/api/export/queue/invalid-uuid/pause', { method: 'POST' }),
        { params: Promise.resolve({ jobId: 'invalid-uuid' }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('jobId');
    });
  });

  describe('Job Authorization', () => {
    it('should return 404 when job not found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(404);
    });

    it('should return 404 when job belongs to another user', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({ data: null, error: null });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(404);
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', mockUser.id);
    });
  });

  describe('Business Logic', () => {
    it('should return 400 when trying to pause non-processing job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
        },
        error: null,
      });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot pause job');
      expect(data.error).toContain('completed');
    });

    it('should pause processing job successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
          project_id: 'test-project',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('paused successfully');
      expect(data.jobId).toBe(validJobId);
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'pending' });
    });

    it('should return 500 when update fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'processing',
          job_type: 'video-export',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: { message: 'Update failed' } });

      const response = await pauseJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/pause`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(500);
    });
  });
});

describe('POST /api/export/queue/[jobId]/resume', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validJobId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Business Logic', () => {
    it('should return 400 when trying to resume non-pending job', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'completed',
          job_type: 'video-export',
        },
        error: null,
      });

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Cannot resume job');
    });

    it('should resume pending job successfully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
          project_id: 'test-project',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await resumeJob(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/resume`, { method: 'POST' }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('resumed successfully');
      expect(mockSupabase.update).toHaveBeenCalledWith({ status: 'processing' });
    });
  });
});

describe('PATCH /api/export/queue/[jobId]/priority', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  const validJobId = '123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    resetAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 50 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(401);
    });
  });

  describe('Input Validation', () => {
    it('should return 400 for invalid JSON', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: 'invalid json{',
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 when priority is missing', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({}),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('priority');
    });

    it('should return 400 for priority less than 0', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: -1 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for priority greater than 100', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 101 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
    });

    it('should return 400 for non-integer priority', async () => {
      mockAuthenticatedUser(mockSupabase);

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 50.5 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    it('should update priority to 0', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 0 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ priority: 0 });
    });

    it('should update priority to 100', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 100 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith({ priority: 100 });
    });

    it('should update priority to mid-value', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockSupabase.single.mockResolvedValue({
        data: {
          id: validJobId,
          user_id: mockUser.id,
          status: 'pending',
          job_type: 'video-export',
        },
        error: null,
      });
      mockSupabase.eq.mockResolvedValue({ error: null });

      const response = await updatePriority(
        new NextRequest(`http://localhost/api/export/queue/${validJobId}/priority`, {
          method: 'PATCH',
          body: JSON.stringify({ priority: 50 }),
        }),
        { params: Promise.resolve({ jobId: validJobId }) }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toContain('updated successfully');
    });
  });
});
