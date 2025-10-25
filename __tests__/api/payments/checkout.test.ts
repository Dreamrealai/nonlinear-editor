/**
 * Integration Tests for POST /api/stripe/checkout
 *
 * This follows the new integration testing approach:
 * - Tests the ACTUAL route handler (not mocked)
 * - Uses real NextRequest/NextResponse
 * - Only mocks external services (Stripe, logger)
 * - Uses test utilities for authentication (no withAuth mocking)
 * - Uses real service layer execution
 */

import {
  createTestUser,
  createTestSupabaseClient,
  createAuthenticatedRequest,
  createUnauthenticatedRequest,
  createTestAuthHandler,
  getTestDatabase,
} from '@/test-utils/testWithAuth';

// Import the actual handler (unwrapped version for testing)
import { handleStripeCheckout } from '@/app/api/stripe/checkout/route';

// Mock external services only
jest.mock(
  '@/lib/stripe',
  (): Record<string, unknown> => ({
    createCheckoutSession: jest.fn(),
    getOrCreateStripeCustomer: jest.fn(),
  })
);

jest.mock(
  '@/lib/serverLogger',
  (): Record<string, unknown> => ({
    serverLogger: {
      info: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    },
  })
);

// Mock rate limiting - always allow requests to pass
jest.mock(
  '@/lib/rateLimit',
  (): Record<string, unknown> => ({
    checkRateLimit: jest.fn().mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      resetAt: Date.now() + 60000,
    }),
    RATE_LIMITS: {
      tier1_auth_payment: { limit: 5, windowMs: 60000 },
    },
  })
);

describe('POST /api/stripe/checkout - Integration Tests', () => {
  const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');

  beforeEach((): void => {
    jest.clearAllMocks();
    process.env.STRIPE_PREMIUM_PRICE_ID = 'price_test_premium';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
  });

  afterEach((): void => {
    delete process.env.STRIPE_PREMIUM_PRICE_ID;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      const request = createUnauthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('User Profile Validation', () => {
    it('should return 500 when user profile not found', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Remove user profile from test database
      const db = getTestDatabase();
      db.delete('user_profiles', user.id);

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      // The test database returns null when profile not found, which causes handler to throw
      // The error is caught and returns "Failed to create checkout session"
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toContain('Failed to');
    });

    it('should return 400 when user already has active subscription', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Update user profile to have active premium subscription
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'premium',
        subscription_status: 'active',
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('You already have an active subscription');
    });

    it('should allow checkout for free tier users', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile with free tier
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe('cs_test_123');
    });

    it('should allow checkout for users with canceled subscriptions', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile with canceled subscription
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: 'canceled',
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });
  });

  describe('Stripe Customer Creation', () => {
    it('should create new Stripe customer when not exists', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile without Stripe customer
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_new_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        customer: 'cus_new_123',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        stripeCustomerId: null,
      });

      // Verify customer ID was saved to profile
      const updatedProfile = db.get('user_profiles', user.id);
      expect(updatedProfile.stripe_customer_id).toBe('cus_new_123');
    });

    it('should use existing Stripe customer when available', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile with existing Stripe customer
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_existing_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_existing_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
        customer: 'cus_existing_123',
      });

      const initialProfile = db.get('user_profiles', user.id);

      const handler = createTestAuthHandler(handleStripeCheckout);
      await handler(request, { params: Promise.resolve({}) });

      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith({
        userId: user.id,
        email: user.email,
        stripeCustomerId: 'cus_existing_123',
      });

      // Verify customer ID wasn't changed
      const updatedProfile = db.get('user_profiles', user.id);
      expect(updatedProfile.stripe_customer_id).toBe(initialProfile.stripe_customer_id);
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with default price', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test456',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_test_123',
        priceId: 'price_test_premium',
        userId: user.id,
        successUrl: expect.stringContaining('/settings?session_id='),
        cancelUrl: expect.stringContaining('/settings'),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe('cs_test_456');
      expect(data.url).toBe('https://checkout.stripe.com/test456');
    });

    it('should create checkout session with custom price', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: { priceId: 'price_custom_123' },
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      await handler(request, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_custom_123',
        })
      );
    });

    it('should return 500 when price ID not configured', async () => {
      delete process.env.STRIPE_PREMIUM_PRICE_ID;

      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Price ID not configured');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when Stripe API fails', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockRejectedValue(new Error('Stripe API error'));

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create checkout session');
    });

    it('should handle malformed JSON body', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      // Override the request body with invalid JSON
      const badRequest = new (request.constructor as any)(request.url, {
        method: 'POST',
        body: 'invalid json',
      });
      (badRequest as any).__testUser = user;

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(badRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });

  describe('Response Format', () => {
    it('should return sessionId and url', async () => {
      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test456',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      const response = await handler(request, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('sessionId', 'cs_test_456');
      expect(data).toHaveProperty('url', 'https://checkout.stripe.com/test456');
    });
  });

  describe('URL Configuration', () => {
    it('should use NEXT_PUBLIC_BASE_URL when available', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      await handler(request, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: 'https://example.com/settings?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://example.com/settings',
        })
      );
    });

    it('should fallback to request origin when BASE_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const { request, user } = createAuthenticatedRequest({
        method: 'POST',
        url: '/api/stripe/checkout',
        body: {},
      });

      // Set up user profile
      const db = getTestDatabase();
      db.set('user_profiles', user.id, {
        id: user.id,
        email: user.email,
        tier: 'free',
        subscription_status: null,
        stripe_customer_id: 'cus_test_123',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue({
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/test',
      });

      const handler = createTestAuthHandler(handleStripeCheckout);
      await handler(request, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: expect.stringContaining('http://localhost:3000/settings'),
          cancelUrl: expect.stringContaining('http://localhost:3000/settings'),
        })
      );
    });
  });
});
