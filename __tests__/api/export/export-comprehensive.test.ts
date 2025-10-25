/**
 * Comprehensive Tests for Export API Routes:
 * - POST /api/export - Create export job
 * - GET /api/export - Get export job status
 *
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  resetAllMocks,
  type MockSupabaseChain,
} from '@/__tests__/helpers/apiMocks';

/**
 * Mock withAuth
 */
jest.mock(
  '@/lib/api/withAuth',
  () => ({
    withAuth: (handler: any) => async (req: any) => {
      const { createServerSupabaseClient } = require('@/lib/supabase');
      const supabase = await createServerSupabaseClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
      }

      return handler(req, { user, supabase });
    },
  })
);

jest.mock(
  '@/lib/supabase',
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
      warn: jest.fn(),
      debug: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    RATE_LIMITS: {
      tier2_resource_creation: { requests: 10, window: 60 },
      tier3_status_read: { requests: 60, window: 60 },
    },
  })
);

jest.mock(
  '@/lib/api/project-verification',
  () => ({
    verifyProjectOwnership: jest.fn().mockResolvedValue({
      hasAccess: true,
      status: 200,
    }),
  })
);

// Import route handlers AFTER all mocks are set up
import { POST, GET } from '@/app/api/export/route';

const validUserId = '550e8400-e29b-41d4-a716-446655440000';
const validProjectId = '123e4567-e89b-12d3-a456-426614174000';
const validJobId = '789e0123-e89b-12d3-a456-426614174000';

const validExportRequest = {
  projectId: validProjectId,
  timeline: {
    clips: [
      {
        id: 'clip-1',
        assetId: 'asset-1',
        start: 0,
        end: 1000,
        timelinePosition: 0,
        trackIndex: 0,
      },
    ],
  },
  outputSpec: {
    width: 1920,
    height: 1080,
    fps: 30,
    vBitrateK: 5000,
    aBitrateK: 128,
    format: 'mp4' as const,
  },
};

describe('POST /api/export', () => {
  let mockSupabase: MockSupabaseChain;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Set VIDEO_EXPORT_ENABLED to true for tests
    process.env['VIDEO_EXPORT_ENABLED'] = 'true';
  });

  afterEach((): void => {
    if (mockSupabase) {
      resetAllMocks(mockSupabase);
    }
    delete process.env['VIDEO_EXPORT_ENABLED'];
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Feature Availability', () => {
    it('should return 503 when VIDEO_EXPORT_ENABLED is false', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
      process.env['VIDEO_EXPORT_ENABLED'] = 'false';

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toContain('not currently available');
    });

    it('should return 503 when VIDEO_EXPORT_ENABLED is not set', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
      delete process.env['VIDEO_EXPORT_ENABLED'];

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(503);
    });
  });

  describe('Request Validation', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock successful job creation
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: { id: validJobId, status: 'pending' },
          error: null,
        });
        return mockSupabase;
      });
    });

    it('should return 400 for invalid JSON body', async () => {
      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: 'invalid json',
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('Invalid JSON');
    });

    it('should return 400 when missing projectId', async () => {
      // Arrange
      const invalidRequest = { ...validExportRequest };
      delete (invalidRequest as any).projectId;

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('required');
    });

    it('should return 400 when missing timeline', async () => {
      // Arrange
      const invalidRequest = { ...validExportRequest };
      delete (invalidRequest as any).timeline;

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when missing outputSpec', async () => {
      // Arrange
      const invalidRequest = { ...validExportRequest };
      delete (invalidRequest as any).outputSpec;

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when timeline has no clips array', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        timeline: {},
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('clips array');
    });

    it('should return 400 for invalid projectId format', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        projectId: 'invalid-uuid',
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid format', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        outputSpec: {
          ...validExportRequest.outputSpec,
          format: 'invalid',
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('format');
    });

    it('should return 400 for width exceeding maximum', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        outputSpec: {
          ...validExportRequest.outputSpec,
          width: 10000,
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.field).toBe('width');
    });

    it('should return 400 for negative fps', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        outputSpec: {
          ...validExportRequest.outputSpec,
          fps: -1,
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should return 400 when clip end <= start', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        timeline: {
          clips: [
            {
              id: 'clip-1',
              assetId: 'asset-1',
              start: 1000,
              end: 1000, // Equal to start
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('greater than start');
    });

    it('should return 400 for invalid clip assetId', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        timeline: {
          clips: [
            {
              id: validProjectId,
              assetId: 'invalid-uuid',
              start: 0,
              end: 1000,
              timelinePosition: 0,
              trackIndex: 0,
            },
          ],
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate optional priority field', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        priority: 20, // Max is 10
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate optional volume field', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        timeline: {
          clips: [
            {
              ...validExportRequest.timeline.clips[0],
              volume: 5, // Max is 2
            },
          ],
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });

    it('should validate transition type', async () => {
      // Arrange
      const invalidRequest = {
        ...validExportRequest,
        timeline: {
          clips: [
            {
              ...validExportRequest.timeline.clips[0],
              transitionToNext: {
                type: 'invalid-transition',
                duration: 500,
              },
            },
          ],
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(invalidRequest),
        })
      );

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock successful job creation
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: { id: validJobId, status: 'pending' },
          error: null,
        });
        return mockSupabase;
      });
    });

    it('should return 403 when user does not own project', async () => {
      // Arrange
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValueOnce({
        hasAccess: false,
        status: 403,
        error: 'Project access denied',
      });

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(403);
    });

    it('should return 404 when project not found', async () => {
      // Arrange
      const { verifyProjectOwnership } = require('@/lib/api/project-verification');
      verifyProjectOwnership.mockResolvedValueOnce({
        hasAccess: false,
        status: 404,
        error: 'Project not found',
      });

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(404);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      // Mock successful job creation
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: { id: validJobId, status: 'pending' },
          error: null,
        });
        return mockSupabase;
      });
    });

    it('should create export job successfully', async () => {
      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(202); // Accepted
      const data = await response.json();
      expect(data.jobId).toBe(validJobId);
      expect(data.status).toBe('queued');
      expect(data.message).toContain('queued');
    });

    it('should include estimated time in response', async () => {
      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      const data = await response.json();
      expect(data.estimatedTime).toBeDefined();
      expect(data.estimatedTime).toBeGreaterThan(0);
    });

    it('should accept valid optional priority', async () => {
      // Arrange
      const requestWithPriority = {
        ...validExportRequest,
        priority: 5,
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(requestWithPriority),
        })
      );

      // Assert
      expect(response.status).toBe(202);
    });

    it('should accept valid transitions', async () => {
      // Arrange
      const requestWithTransition = {
        ...validExportRequest,
        timeline: {
          clips: [
            {
              ...validExportRequest.timeline.clips[0],
              transitionToNext: {
                type: 'crossfade' as const,
                duration: 500,
              },
            },
          ],
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(requestWithTransition),
        })
      );

      // Assert
      expect(response.status).toBe(202);
    });

    it('should accept webm format', async () => {
      // Arrange
      const requestWithWebm = {
        ...validExportRequest,
        outputSpec: {
          ...validExportRequest.outputSpec,
          format: 'webm' as const,
        },
      };

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(requestWithWebm),
        })
      );

      // Assert
      expect(response.status).toBe(202);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return 500 when job creation fails', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.insert.mockReturnValue(mockSupabase);
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        });
        return mockSupabase;
      });

      // Act
      const response = await POST(
        new NextRequest('http://localhost/api/export', {
          method: 'POST',
          body: JSON.stringify(validExportRequest),
        })
      );

      // Assert
      expect(response.status).toBe(500);
    });
  });
});

describe('GET /api/export', () => {
  let mockSupabase: MockSupabaseChain;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach((): void => {
    if (mockSupabase) {
      resetAllMocks(mockSupabase);
    }
  });

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      // Arrange
      mockUnauthenticatedUser(mockSupabase);

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return 400 when jobId is missing', async () => {
      // Act
      const response = await GET(new NextRequest('http://localhost/api/export'));

      // Assert
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('jobId');
    });

    it('should return 400 for invalid jobId format', async () => {
      // Act
      const response = await GET(new NextRequest('http://localhost/api/export?jobId=invalid-uuid'));

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('Success Cases', () => {
    beforeEach(() => {
      mockAuthenticatedUser(mockSupabase, { id: validUserId });
    });

    it('should return job status for pending job', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            status: 'pending',
            progress_percentage: 0,
          },
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.jobId).toBe(validJobId);
      expect(data.status).toBe('queued');
      expect(data.message).toContain('queued');
    });

    it('should return job status for processing job', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            status: 'processing',
            progress_percentage: 50,
          },
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('processing');
      expect(data.message).toContain('in progress');
      expect(data.message).toContain('50%');
    });

    it('should return job status for completed job', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            status: 'completed',
            progress_percentage: 100,
          },
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
      expect(data.message).toContain('completed successfully');
    });

    it('should return job status for failed job with error message', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            status: 'failed',
            error_message: 'Encoding failed',
          },
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('failed');
      expect(data.message).toContain('failed');
      expect(data.message).toContain('Encoding failed');
    });

    it('should map cancelled status to failed', async () => {
      // Arrange
      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: {
            id: validJobId,
            status: 'cancelled',
          },
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('failed');
    });
  });

  describe('Authorization', () => {
    it('should return 404 when job belongs to different user', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: { message: 'Not found' },
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(404);
    });

    it('should return 404 when job does not exist', async () => {
      // Arrange
      mockAuthenticatedUser(mockSupabase, { id: validUserId });

      mockSupabase.from.mockImplementation(() => {
        mockSupabase.select.mockReturnValue(mockSupabase);
        mockSupabase.eq.mockReturnValue(mockSupabase);
        mockSupabase.single.mockResolvedValue({
          data: null,
          error: null,
        });
        return mockSupabase;
      });

      // Act
      const response = await GET(
        new NextRequest(`http://localhost/api/export?jobId=${validJobId}`)
      );

      // Assert
      expect(response.status).toBe(404);
    });
  });
});
