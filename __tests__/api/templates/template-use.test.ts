/**
 * Comprehensive Tests for POST /api/templates/[templateId]/use
 *
 * Tests the template usage tracking endpoint that increments the usage count
 * when a template is used in a project.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/templates/[templateId]/use/route';
import {
  createTestUser,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createTestAuthHandler,
  getTestDatabase,
} from '@/test-utils/testWithAuth';

// Mock external dependencies
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 10,
    remaining: 9,
    resetAt: Date.now() + 60000,
  }),
  RATE_LIMITS: {
    tier2_resource_creation: { limit: 10, windowMs: 60000 },
  },
}));

describe('POST /api/templates/[templateId]/use', () => {
  const mockUser = createTestUser();
  const otherUser = createTestUser({ id: '999e9999-e99b-99d9-a999-999999999999' });
  const validTemplateId = 'template-123e4567-e89b-12d3-a456-426614174000';
  const publicTemplateId = 'template-public-123e4567-e89b-12d3-a456-426614174000';
  const privateTemplateId = 'template-private-123e4567-e89b-12d3-a456-426614174000';

  beforeEach(() => {
    jest.clearAllMocks();

    const db = getTestDatabase();

    // Setup user profiles
    db.set('user_profiles', mockUser.id, {
      id: mockUser.id,
      email: mockUser.email,
      tier: 'premium',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    db.set('user_profiles', otherUser.id, {
      id: otherUser.id,
      email: otherUser.email,
      tier: 'free',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    // Setup public template
    db.set('project_templates', publicTemplateId, {
      id: publicTemplateId,
      user_id: otherUser.id,
      name: 'Public Template',
      is_public: true,
      usage_count: 5,
      created_at: new Date().toISOString(),
    });

    // Setup private template owned by mockUser
    db.set('project_templates', privateTemplateId, {
      id: privateTemplateId,
      user_id: mockUser.id,
      name: 'Private Template',
      is_public: false,
      usage_count: 2,
      created_at: new Date().toISOString(),
    });

    // Setup default template
    db.set('project_templates', validTemplateId, {
      id: validTemplateId,
      user_id: mockUser.id,
      name: 'Test Template',
      is_public: true,
      usage_count: 10,
      created_at: new Date().toISOString(),
    });

    // Mock increment_template_usage_count RPC function
    db.setRpcImplementation('increment_template_usage_count', (params) => {
      const template = db.get('project_templates', params.template_id);
      if (template) {
        template.usage_count = (template.usage_count || 0) + 1;
        db.set('project_templates', params.template_id, template);
        return { data: null, error: null };
      }
      return { data: null, error: { message: 'Template not found' } };
    });
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = createUnauthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Input Validation', () => {
    it('should validate templateId is required', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/undefined/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: undefined as any }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('templateId');
    });

    it('should validate templateId is valid UUID', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/invalid-uuid/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: 'invalid-uuid' }),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain('templateId');
      expect(data.field).toBe('templateId');
    });
  });

  describe('Template Existence', () => {
    it('should return 404 when template does not exist', async () => {
      const nonExistentId = '000e0000-e00b-00d0-a000-000000000000';

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${nonExistentId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: nonExistentId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Template not found');
    });
  });

  describe('Access Control', () => {
    it('should allow access to public templates by any user', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${publicTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: publicTemplateId }),
      });

      expect(response.status).toBe(200);
    });

    it('should allow owner to access private template', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${privateTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: privateTemplateId }),
      });

      expect(response.status).toBe(200);
    });

    it('should deny access to private template by non-owner', async () => {
      // Create private template owned by otherUser
      const otherPrivateTemplate = 'template-other-private-123e4567-e89b-12d3-a456';
      const db = getTestDatabase();
      db.set('project_templates', otherPrivateTemplate, {
        id: otherPrivateTemplate,
        user_id: otherUser.id,
        name: 'Other Private Template',
        is_public: false,
        usage_count: 0,
        created_at: new Date().toISOString(),
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${otherPrivateTemplate}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: otherPrivateTemplate }),
      });

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.error).toBe('Access denied');
    });
  });

  describe('Usage Count Increment', () => {
    it('should increment usage count for public template', async () => {
      const db = getTestDatabase();
      const initialCount = db.get('project_templates', publicTemplateId).usage_count;

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${publicTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: publicTemplateId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.message).toBe('Template usage incremented');
      expect(data.usage_count).toBe(initialCount + 1);

      // Verify database was updated
      const template = db.get('project_templates', publicTemplateId);
      expect(template.usage_count).toBe(initialCount + 1);
    });

    it('should increment usage count for private template by owner', async () => {
      const db = getTestDatabase();
      const initialCount = db.get('project_templates', privateTemplateId).usage_count;

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${privateTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: privateTemplateId }),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.usage_count).toBe(initialCount + 1);
    });

    it('should handle multiple increments correctly', async () => {
      const db = getTestDatabase();
      const initialCount = db.get('project_templates', validTemplateId).usage_count;

      // First increment
      const { request: request1 } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });
      await POST(request1, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      // Second increment
      const { request: request2 } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });
      await POST(request2, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      // Third increment
      const { request: request3 } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });
      const response3 = await POST(request3, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      const data = await response3.json();
      expect(data.usage_count).toBe(initialCount + 3);
    });

    it('should handle zero initial usage count', async () => {
      const zeroCountTemplate = 'template-zero-count-123e4567-e89b-12d3-a456';
      const db = getTestDatabase();
      db.set('project_templates', zeroCountTemplate, {
        id: zeroCountTemplate,
        user_id: mockUser.id,
        name: 'Zero Count Template',
        is_public: true,
        usage_count: 0,
        created_at: new Date().toISOString(),
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${zeroCountTemplate}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: zeroCountTemplate }),
      });

      const data = await response.json();
      expect(data.usage_count).toBe(1);
    });

    it('should handle null initial usage count', async () => {
      const nullCountTemplate = 'template-null-count-123e4567-e89b-12d3-a456';
      const db = getTestDatabase();
      db.set('project_templates', nullCountTemplate, {
        id: nullCountTemplate,
        user_id: mockUser.id,
        name: 'Null Count Template',
        is_public: true,
        usage_count: null,
        created_at: new Date().toISOString(),
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${nullCountTemplate}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: nullCountTemplate }),
      });

      const data = await response.json();
      expect(data.usage_count).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when RPC function fails', async () => {
      const db = getTestDatabase();
      // Override RPC to return error
      db.setRpcImplementation('increment_template_usage_count', () => ({
        data: null,
        error: { message: 'Database error' },
      }));

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to increment template usage');
    });

    it('should handle database fetch errors', async () => {
      const db = getTestDatabase();
      // Simulate database error by removing template temporarily
      const template = db.get('project_templates', validTemplateId);
      db.delete('project_templates', validTemplateId);

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe('Template not found');

      // Restore template
      db.set('project_templates', validTemplateId, template);
    });

    it('should handle unexpected errors gracefully', async () => {
      const db = getTestDatabase();
      // Cause an error by making RPC throw
      db.setRpcImplementation('increment_template_usage_count', () => {
        throw new Error('Unexpected database error');
      });

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Response Format', () => {
    it('should return correct response format on success', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      const data = await response.json();

      expect(data).toHaveProperty('message', 'Template usage incremented');
      expect(data).toHaveProperty('usage_count');
      expect(typeof data.usage_count).toBe('number');
      expect(data.usage_count).toBeGreaterThan(0);
    });

    it('should include success flag on success', async () => {
      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      const response = await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe('Logging', () => {
    it('should log template usage increment', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      const db = getTestDatabase();
      const initialCount = db.get('project_templates', validTemplateId).usage_count;

      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: user.id,
          templateId: validTemplateId,
          previousCount: initialCount,
        }),
        'Template usage incremented'
      );
    });

    it('should log errors when RPC fails', async () => {
      const { serverLogger } = require('@/lib/serverLogger');
      const db = getTestDatabase();
      db.setRpcImplementation('increment_template_usage_count', () => ({
        data: null,
        error: { message: 'Database error' },
      }));

      const { request } = createAuthenticatedRequest({
        method: 'POST',
        url: `/api/templates/${validTemplateId}/use`,
        body: {},
      });

      await POST(request, {
        params: Promise.resolve({ templateId: validTemplateId }),
      });

      expect(serverLogger.error).toHaveBeenCalled();
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent increments correctly', async () => {
      const db = getTestDatabase();
      const initialCount = db.get('project_templates', validTemplateId).usage_count;

      // Create 5 concurrent requests
      const requests = Array.from({ length: 5 }, () => {
        const { request } = createAuthenticatedRequest({
          method: 'POST',
          url: `/api/templates/${validTemplateId}/use`,
          body: {},
        });
        return POST(request, {
          params: Promise.resolve({ templateId: validTemplateId }),
        });
      });

      const responses = await Promise.all(requests);

      // All should succeed
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });

      // Final count should be initial + 5
      const finalTemplate = db.get('project_templates', validTemplateId);
      expect(finalTemplate.usage_count).toBe(initialCount + 5);
    });
  });
});
