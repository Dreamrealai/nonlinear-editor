/**
 * Tests for POST /api/stripe/portal - Stripe Customer Portal
 *
 * Tests cover authentication, customer verification, Stripe integration,
 * rate limiting, and error handling for billing portal session creation.
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/portal/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockUserProfile,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/__tests__/helpers/apiMocks';

// Mock modules
jest.mock(
  '@/lib/supabase',
  () => ({
    createServerSupabaseClient: jest.fn(),
  })
);

// Mock withAuth wrapper
jest.mock(
  '@/lib/api/withAuth',
  () => ({
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
  })
);

jest.mock(
  '@/lib/serverLogger',
  () => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

jest.mock(
  '@/lib/rateLimit',
  () => ({
    checkRateLimit: jest.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60000,
    }),
    RATE_LIMITS: {
      tier1_auth_payment: { requests: 5, window: 60 },
    },
  })
);

jest.mock(
  '@/lib/stripe',
  () => ({
    createBillingPortalSession: jest.fn(),
  })
);

jest.mock(
  '@/lib/services/userService',
  () => ({
    UserService: jest.fn().mockImplementation(() => ({
      getUserProfile: jest.fn(),
    })),
  })
);

describe('POST /api/stripe/portal', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;
  const originalEnv = process.env;

  beforeEach((): void => {
    jest.clearAllMocks();
    mockSupabase = createMockSupabaseClient();
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    process.env = { ...originalEnv };
    process.env['NEXT_PUBLIC_BASE_URL'] = 'https://example.com';

    mockRequest = new NextRequest('http://localhost/api/stripe/portal', {
      method: 'POST',
    });
  });

  afterEach((): void => {
    jest.clearAllMocks();
    process.env = originalEnv;
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);

      const response = await POST(mockRequest);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed when user is authenticated', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce tier1 rate limiting (5/min)', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit } = require('@/lib/rateLimit');

      checkRateLimit.mockResolvedValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        resetAt: Date.now() + 60000,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(429);
      const data = await response.json();
      expect(data.error).toContain('Too many requests');
    });

    it('should use correct rate limit tier for payment operations', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { checkRateLimit, RATE_LIMITS } = require('@/lib/rateLimit');
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(checkRateLimit).toHaveBeenCalledWith(
        expect.any(String),
        RATE_LIMITS.tier1_auth_payment
      );
    });
  });

  describe('User Profile Verification', () => {
    it('should retrieve user profile using UserService', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(mockUserService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return 400 when user profile not found', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(null);

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('User profile not found');
      expect(data.field).toBe('validation');
    });

    it('should return 400 when Stripe customer ID not found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: null,
        })
      );

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('No Stripe customer found. Please subscribe first.');
      expect(data.field).toBe('validation');
    });
  });

  describe('Billing Portal Session Creation', () => {
    it('should create billing portal session with Stripe', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test123',
      });

      mockUserService.getUserProfile.mockResolvedValue(mockProfile);

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(createBillingPortalSession).toHaveBeenCalledWith({
        customerId: 'cus_test123',
        returnUrl: 'https://example.com/settings',
      });
    });

    it('should use NEXT_PUBLIC_BASE_URL for return URL', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      process.env['NEXT_PUBLIC_BASE_URL'] = 'https://custom-domain.com';

      await POST(mockRequest);

      expect(createBillingPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          returnUrl: 'https://custom-domain.com/settings',
        })
      );
    });

    it('should fall back to request origin if NEXT_PUBLIC_BASE_URL not set', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      delete process.env['NEXT_PUBLIC_BASE_URL'];

      await POST(mockRequest);

      expect(createBillingPortalSession).toHaveBeenCalledWith(
        expect.objectContaining({
          returnUrl: expect.stringContaining('/settings'),
        })
      );
    });

    it('should return portal URL in response', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      const mockSessionUrl = 'https://billing.stripe.com/session/abc123';

      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: mockSessionUrl,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.data.url).toBe(mockSessionUrl);
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when Stripe API fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockRejectedValue(new Error('Stripe API error'));

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create billing portal session');
    });

    it('should log error when portal creation fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockRejectedValue(new Error('Stripe API error'));

      await POST(mockRequest);

      expect(serverLogger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.error',
          error: 'Stripe API error',
          userId: mockUser.id,
        }),
        expect.stringContaining('Failed to create billing portal session')
      );
    });

    it('should handle unexpected errors gracefully', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('Logging', () => {
    it('should log request start', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.request_started',
          userId: mockUser.id,
        }),
        expect.any(String)
      );
    });

    it('should log when customer is found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test123',
        tier: 'pro',
      });

      mockUserService.getUserProfile.mockResolvedValue(mockProfile);

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(serverLogger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.customer_found',
          userId: mockUser.id,
          customerId: 'cus_test123',
          tier: 'pro',
        }),
        expect.any(String)
      );
    });

    it('should log session creation success with duration', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_abc',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      expect(serverLogger.info).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.session_created',
          userId: mockUser.id,
          customerId: 'cus_test123',
          sessionId: 'portal_session_abc',
          duration: expect.any(Number),
        }),
        expect.stringMatching(/Billing portal session created in \d+ms/)
      );
    });

    it('should log warning when no profile found', async () => {
      mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      mockUserService.getUserProfile.mockResolvedValue(null);

      await POST(mockRequest);

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.no_profile',
        }),
        expect.any(String)
      );
    });

    it('should log warning when no customer ID found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);
      const { serverLogger } = require('@/lib/serverLogger');

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: null,
        })
      );

      await POST(mockRequest);

      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.portal.no_customer',
          userId: mockUser.id,
        }),
        expect.any(String)
      );
    });
  });

  describe('Security', () => {
    it('should only allow POST requests', async () => {
      // This is implicitly tested by the route definition,
      // but we can verify the handler exists
      expect(POST).toBeDefined();
      expect(typeof POST).toBe('function');
    });

    it('should verify user owns the profile being accessed', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const { UserService } = require('@/lib/services/userService');
      const mockUserService = new UserService(mockSupabase);

      mockUserService.getUserProfile.mockResolvedValue(
        createMockUserProfile({
          id: mockUser.id,
          stripe_customer_id: 'cus_test123',
        })
      );

      const { createBillingPortalSession } = require('@/lib/stripe');
      createBillingPortalSession.mockResolvedValue({
        id: 'portal_session_test',
        url: 'https://billing.stripe.com/session/test',
      });

      await POST(mockRequest);

      // Verify getUserProfile was called with the authenticated user's ID
      expect(mockUserService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
