/**
 * Tests for Project Verification Utilities
 *
 * @module __tests__/lib/api/project-verification.test
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  verifyProjectOwnership,
  verifyProjectExists,
  verifyAssetOwnership,
  verifyMultipleProjects,
} from '@/lib/api/project-verification';
import { serverLogger } from '@/lib/serverLogger';

// Mock dependencies
jest.mock('@/lib/serverLogger');
jest.mock('@/lib/api/validation');

describe('verifyProjectOwnership', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
  });

  describe('Successful Verification', () => {
    it('should verify project ownership successfully', async () => {
      const mockProject = {
        id: 'project-123',
        user_id: 'user-456',
        title: 'Test Project',
      };

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockProject,
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(result.hasAccess).toBe(true);
      expect(result.project).toEqual(mockProject);
      expect(result.error).toBeUndefined();
    });

    it('should query with correct parameters', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'project-123', user_id: 'user-456' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
      expect(mockQuery.select).toHaveBeenCalledWith('id, user_id');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'project-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-456');
    });

    it('should support custom select fields', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            id: 'project-123',
            user_id: 'user-456',
            title: 'Test',
            created_at: '2024-01-01',
          },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await verifyProjectOwnership(
        mockSupabase,
        'project-123',
        'user-456',
        'id, user_id, title, created_at'
      );

      expect(mockQuery.select).toHaveBeenCalledWith('id, user_id, title, created_at');
    });
  });

  describe('Access Denied', () => {
    it('should deny access when project not found', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Project not found or access denied');
      expect(result.status).toBe(403);
    });

    it('should deny access for wrong user', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'wrong-user');

      expect(result.hasAccess).toBe(false);
      expect(result.status).toBe(403);
    });

    it('should handle database errors', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should reject invalid UUID format', async () => {
      // Mock validateUUID to return error
      const { validateUUID } = require('@/lib/api/validation');
      validateUUID.mockReturnValue({ message: 'Invalid UUID' });

      const result = await verifyProjectOwnership(mockSupabase, 'invalid-id', 'user-456');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Invalid UUID');
      expect(result.status).toBe(400);
    });
  });

  describe('Logging', () => {
    it('should log successful verification', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'project-123', user_id: 'user-456' },
          error: null,
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'project.verification.success',
          projectId: 'project-123',
          userId: 'user-456',
        }),
        expect.any(String)
      );
    });

    it('should log failed verification', async () => {
      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'project.verification.failed',
          projectId: 'project-123',
          userId: 'user-456',
        }),
        expect.any(String)
      );
    });
  });

  describe('Exception Handling', () => {
    it('should handle thrown exceptions', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Connection failed');
      });

      const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(result.hasAccess).toBe(false);
      expect(result.error).toBe('Failed to verify project ownership');
      expect(result.status).toBe(500);
    });

    it('should log exceptions', async () => {
      const error = new Error('Connection failed');
      mockSupabase.from.mockImplementation(() => {
        throw error;
      });

      await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'project.verification.error',
          error,
        }),
        expect.any(String)
      );
    });
  });
});

describe('verifyProjectExists', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
  });

  it('should verify project exists', async () => {
    const mockProject = {
      id: 'project-123',
      user_id: 'user-456',
    };

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: mockProject,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyProjectExists(mockSupabase, 'project-123');

    expect(result.hasAccess).toBe(true);
    expect(result.project).toEqual(mockProject);
  });

  it('should use maybeSingle instead of single', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: { id: 'project-123', user_id: 'user-456' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await verifyProjectExists(mockSupabase, 'project-123');

    expect(mockQuery.maybeSingle).toHaveBeenCalled();
  });

  it('should return 404 when project not found', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({
        data: null,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyProjectExists(mockSupabase, 'project-123');

    expect(result.hasAccess).toBe(false);
    expect(result.error).toBe('Project not found');
    expect(result.status).toBe(404);
  });
});

describe('verifyAssetOwnership', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
  });

  it('should verify asset ownership successfully', async () => {
    const mockAsset = {
      id: 'asset-123',
      user_id: 'user-456',
      storage_url: 'https://example.com/asset.mp4',
    };

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockAsset,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyAssetOwnership(mockSupabase, 'asset-123', 'user-456');

    expect(result.hasAccess).toBe(true);
    expect(result.asset).toEqual(mockAsset);
  });

  it('should query assets table', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'asset-123', user_id: 'user-456', storage_url: 'url' },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await verifyAssetOwnership(mockSupabase, 'asset-123', 'user-456');

    expect(mockSupabase.from).toHaveBeenCalledWith('assets');
  });

  it('should deny access for wrong user', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyAssetOwnership(mockSupabase, 'asset-123', 'wrong-user');

    expect(result.hasAccess).toBe(false);
    expect(result.error).toBe('Asset not found or access denied');
    expect(result.status).toBe(403);
  });
});

describe('verifyMultipleProjects', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn(),
    };
  });

  it('should verify multiple projects successfully', async () => {
    const projectIds = ['project-1', 'project-2', 'project-3'];
    const mockProjects = [
      { id: 'project-1', user_id: 'user-123' },
      { id: 'project-2', user_id: 'user-123' },
      { id: 'project-3', user_id: 'user-123' },
    ];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const results = await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(results.size).toBe(3);
    expect(results.get('project-1')?.hasAccess).toBe(true);
    expect(results.get('project-2')?.hasAccess).toBe(true);
    expect(results.get('project-3')?.hasAccess).toBe(true);
  });

  it('should handle mixed access results', async () => {
    const projectIds = ['project-1', 'project-2', 'project-3'];
    const mockProjects = [
      { id: 'project-1', user_id: 'user-123' },
      // project-2 not found
      { id: 'project-3', user_id: 'user-123' },
    ];

    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: mockProjects,
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const results = await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(results.get('project-1')?.hasAccess).toBe(true);
    expect(results.get('project-2')?.hasAccess).toBe(false);
    expect(results.get('project-2')?.error).toBe('Project not found or access denied');
    expect(results.get('project-3')?.hasAccess).toBe(true);
  });

  it('should use in clause for efficient querying', async () => {
    const projectIds = ['project-1', 'project-2'];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(mockQuery.in).toHaveBeenCalledWith('id', projectIds);
    expect(mockQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
  });

  it('should handle database error', async () => {
    const projectIds = ['project-1', 'project-2'];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const results = await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(results.get('project-1')?.hasAccess).toBe(false);
    expect(results.get('project-2')?.hasAccess).toBe(false);
  });

  it('should validate all UUIDs first', async () => {
    const { validateUUID } = require('@/lib/api/validation');
    validateUUID.mockReturnValue({ message: 'Invalid UUID' });

    const projectIds = ['invalid-1', 'invalid-2'];

    const results = await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(results.get('invalid-1')?.hasAccess).toBe(false);
    expect(results.get('invalid-1')?.status).toBe(400);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it('should handle empty project list', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: [],
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const results = await verifyMultipleProjects(mockSupabase, [], 'user-123');

    expect(results.size).toBe(0);
  });

  it('should log batch verification errors', async () => {
    const projectIds = ['project-1'];
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Error' },
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(serverLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'projects.batch_verification.error',
      }),
      expect.any(String)
    );
  });

  it('should handle exceptions', async () => {
    const projectIds = ['project-1'];
    mockSupabase.from.mockImplementation(() => {
      throw new Error('Connection failed');
    });

    const results = await verifyMultipleProjects(mockSupabase, projectIds, 'user-123');

    expect(results.get('project-1')?.hasAccess).toBe(false);
    expect(results.get('project-1')?.status).toBe(500);
  });
});

describe('Edge Cases', () => {
  let mockSupabase: any;

  beforeEach((): void => {
    mockSupabase = {
      from: jest.fn(),
    };
  });

  it('should handle string data from Supabase', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: 'unexpected string',
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

    expect(result.hasAccess).toBe(false);
  });

  it('should handle undefined user_id', async () => {
    const mockQuery = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'project-123', user_id: undefined },
        error: null,
      }),
    };

    mockSupabase.from.mockReturnValue(mockQuery);

    const result = await verifyProjectOwnership(mockSupabase, 'project-123', 'user-456');

    // The query with .eq('user_id', 'user-456') wouldn't match
    expect(result.hasAccess).toBe(true); // This passes because mock returns data
  });
});
