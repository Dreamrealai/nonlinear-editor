/**
 * Tests for POST /api/stripe/webhook - Stripe Webhook Handler
 */

// Set env vars before any imports
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

import { NextRequest } from 'next/server';
import { createMockUserProfile, createMockSupabaseClient } from '@/test-utils/mockSupabase';
import {
  createMockCheckoutSession,
  createMockSubscription,
  createMockWebhookEvent,
} from '@/test-utils/mockStripe';

// Mock createServiceSupabaseClient and Supabase client
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = jest.requireActual('@/test-utils/mockSupabase');
  const mockClient = createMockSupabaseClient();

  return {
    createServiceSupabaseClient: jest.fn(() => mockClient),
    ensureHttpsProtocol: jest.fn((url) => url),
  };
});

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: jest.fn(),
    },
    subscriptions: {
      retrieve: jest.fn(),
    },
  },
}));

// Mock cache invalidation
jest.mock('@/lib/cacheInvalidation', () => ({
  invalidateOnStripeWebhook: jest.fn(),
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

// Import after all mocks
import { POST } from '@/app/api/stripe/webhook/route';

describe('POST /api/stripe/webhook', () => {
  let mockRequest: NextRequest;
  let mockConstructEvent: jest.Mock;
  let mockRetrieveSubscription: jest.Mock;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    // Ensure env vars are set before each test
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_secret';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

    // Get the mocked functions
    const { stripe } = require('@/lib/stripe');
    mockConstructEvent = stripe.webhooks.constructEvent as jest.Mock;
    mockRetrieveSubscription = stripe.subscriptions.retrieve as jest.Mock;

    // Get the mock supabase client from the mocked function
    const { createServiceSupabaseClient } = require('@/lib/supabase');
    mockSupabase = createServiceSupabaseClient();

    // Clear all mocks but keep the implementations
    jest.clearAllMocks();

    // Restore default chainable mock behavior
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.insert.mockReturnThis();
    mockSupabase.update.mockReturnThis();
    mockSupabase.delete.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockSupabase.neq.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.limit.mockReturnThis();
    mockSupabase.storage.from.mockReturnThis();
  });

  describe('Webhook Verification', () => {
    it('should return 400 when signature is missing', async () => {
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request');
    });

    it('should return 503 when webhook secret not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'test-signature',
        },
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(503);
      const data = await response.json();
      expect(data.error).toBe('Service temporarily unavailable');
    });

    it('should return 400 when signature verification fails', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Invalid signature');
      });

      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'invalid-signature',
        },
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request');
    });

    it('should verify webhook signature correctly', async () => {
      const mockEvent = createMockWebhookEvent(
        'checkout.session.completed',
        createMockCheckoutSession({ metadata: { userId: 'user-123' } })
      );
      mockConstructEvent.mockReturnValue(mockEvent);

      // Mock database responses
      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({ id: 'user-123' }),
        error: null,
      });
      mockRetrieveSubscription.mockResolvedValue(createMockSubscription());
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ id: 'user-123', tier: 'premium' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(mockConstructEvent).toHaveBeenCalledWith(body, 'valid-signature', 'whsec_test_secret');
      expect(response.status).toBe(200);
    });
  });

  describe('checkout.session.completed Event', () => {
    it('should upgrade user to premium on successful checkout', async () => {
      const userId = 'user-123';
      const session = createMockCheckoutSession({
        metadata: { userId },
        customer: 'cus_123',
        subscription: 'sub_123',
      });
      const mockEvent = createMockWebhookEvent('checkout.session.completed', session);
      mockConstructEvent.mockReturnValue(mockEvent);

      const subscription = createMockSubscription({
        id: 'sub_123',
        status: 'active',
      });
      mockRetrieveSubscription.mockResolvedValue(subscription);

      // Mock database queries
      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({ id: userId, tier: 'free' }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ id: userId, tier: 'premium' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'premium',
          stripe_customer_id: 'cus_123',
          stripe_subscription_id: 'sub_123',
          subscription_status: 'active',
        })
      );
    });

    it('should preserve admin tier on checkout', async () => {
      const userId = 'admin-user';
      const session = createMockCheckoutSession({
        metadata: { userId },
        customer: 'cus_123',
        subscription: 'sub_123',
      });
      const mockEvent = createMockWebhookEvent('checkout.session.completed', session);
      mockConstructEvent.mockReturnValue(mockEvent);

      const subscription = createMockSubscription();
      mockRetrieveSubscription.mockResolvedValue(subscription);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({ id: userId, tier: 'admin' }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ id: userId, tier: 'admin' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'admin', // Should remain admin
        })
      );
    });

    it('should return 500 when userId missing in metadata', async () => {
      const session = createMockCheckoutSession({
        metadata: {}, // No userId
      });
      const mockEvent = createMockWebhookEvent('checkout.session.completed', session);
      mockConstructEvent.mockReturnValue(mockEvent);

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });

    it('should return 500 when user profile not found', async () => {
      const session = createMockCheckoutSession({
        metadata: { userId: 'nonexistent-user' },
      });
      const mockEvent = createMockWebhookEvent('checkout.session.completed', session);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'User not found' },
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });

    it('should return 500 when database update fails', async () => {
      const userId = 'user-123';
      const session = createMockCheckoutSession({
        metadata: { userId },
      });
      const mockEvent = createMockWebhookEvent('checkout.session.completed', session);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockRetrieveSubscription.mockResolvedValue(createMockSubscription());
      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({ id: userId }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(500);
    });
  });

  describe('customer.subscription.updated Event', () => {
    it('should update subscription status', async () => {
      const subscription = createMockSubscription({
        customer: 'cus_123',
        status: 'active',
      });
      const mockEvent = createMockWebhookEvent('customer.subscription.updated', subscription);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({
          id: 'user-123',
          stripe_customer_id: 'cus_123',
          tier: 'free',
        }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ tier: 'premium' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_status: 'active',
          tier: 'premium',
        })
      );
    });

    it('should downgrade to free when subscription becomes inactive', async () => {
      const subscription = createMockSubscription({
        customer: 'cus_123',
        status: 'past_due',
      });
      const mockEvent = createMockWebhookEvent('customer.subscription.updated', subscription);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({
          id: 'user-123',
          stripe_customer_id: 'cus_123',
          tier: 'premium',
        }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ tier: 'free' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'free',
        })
      );
    });

    it('should preserve admin tier on subscription update', async () => {
      const subscription = createMockSubscription({
        customer: 'cus_123',
        status: 'active',
      });
      const mockEvent = createMockWebhookEvent('customer.subscription.updated', subscription);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({
          id: 'admin-user',
          stripe_customer_id: 'cus_123',
          tier: 'admin',
        }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ tier: 'admin' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'admin',
        })
      );
    });
  });

  describe('customer.subscription.deleted Event', () => {
    it('should downgrade user to free tier', async () => {
      const subscription = createMockSubscription({
        customer: 'cus_123',
      });
      const mockEvent = createMockWebhookEvent('customer.subscription.deleted', subscription);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({
          id: 'user-123',
          stripe_customer_id: 'cus_123',
          tier: 'premium',
        }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ tier: 'free' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'free',
          subscription_status: 'canceled',
          stripe_subscription_id: null,
          stripe_price_id: null,
        })
      );
    });

    it('should preserve admin tier on subscription deletion', async () => {
      const subscription = createMockSubscription({
        customer: 'cus_123',
      });
      const mockEvent = createMockWebhookEvent('customer.subscription.deleted', subscription);
      mockConstructEvent.mockReturnValue(mockEvent);

      mockSupabase.single.mockResolvedValue({
        data: createMockUserProfile({
          id: 'admin-user',
          stripe_customer_id: 'cus_123',
          tier: 'admin',
        }),
        error: null,
      });
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockReturnThis();
      mockSupabase.select.mockResolvedValue({
        data: [createMockUserProfile({ tier: 'admin' })],
        error: null,
      });

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          tier: 'admin',
        })
      );
    });
  });

  describe('Unhandled Events', () => {
    it('should log warning for unhandled event types', async () => {
      const mockEvent = createMockWebhookEvent('invoice.paid', {});
      mockConstructEvent.mockReturnValue(mockEvent);

      const body = JSON.stringify(mockEvent);
      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body,
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
    });
  });

  describe('Error Recovery', () => {
    it('should return 400 on signature verification error', async () => {
      mockConstructEvent.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      mockRequest = new NextRequest('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: {
          'stripe-signature': 'valid-signature',
        },
        body: JSON.stringify({ type: 'test' }),
      });

      const response = await POST(mockRequest);

      // Any error in constructEvent returns 400 for security reasons
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('Invalid request');
    });
  });
});
