/**
 * Quick test to verify withAuth mock fix
 */

import { NextRequest } from 'next/server';

// Mock withAuth with the NEW pattern
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: NextRequest, context: any) => {
    const authContext = {
      user: { id: 'test-user-id', email: 'test@example.com' },
      supabase: {} as any,
    };

    // Check if this is a dynamic route (has params)
    if (context?.params !== undefined) {
      // 3-param signature: handler(request, authContext, routeContext)
      const routeContext = { params: context.params };
      return handler(req, authContext, routeContext);
    } else {
      // 2-param signature: handler(request, authContext)
      return handler(req, authContext);
    }
  },
}));

import { withAuth } from '@/lib/api/withAuth';

describe('withAuth Mock Fix Test', () => {
  it('should handle 2-param handler (no route params)', async () => {
    const handler = jest.fn(async (req: any, authContext: any) => {
      return new Response(JSON.stringify({ user: authContext.user.id }), { status: 200 });
    });

    const wrappedHandler = withAuth(handler, { route: '/api/test' });
    const request = new NextRequest('http://localhost/api/test');
    const context = { params: Promise.resolve({}) };

    const response = await wrappedHandler(request, context);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toBe('test-user-id');
  });

  it('should handle 3-param handler (with route params)', async () => {
    const handler = jest.fn(async (req: any, authContext: any, routeContext: any) => {
      const params = await routeContext.params;
      return new Response(JSON.stringify({ projectId: params.projectId }), { status: 200 });
    });

    const wrappedHandler = withAuth(handler, { route: '/api/projects/[projectId]' });
    const request = new NextRequest('http://localhost/api/projects/123');
    const context = { params: Promise.resolve({ projectId: '123' }) };

    const response = await wrappedHandler(request, context);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.projectId).toBe('123');
  });
});
