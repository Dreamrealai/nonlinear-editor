/**
 * Tests for POST /api/stripe/checkout - Stripe Checkout Session Creation
 */

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/stripe/checkout/route';
import {
  createMockSupabaseClient,
  createMockUser,
  createMockUserProfile,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
  mockQuerySuccess,
  mockQueryError,
  resetAllMocks,
} from '@/test-utils/mockSupabase';
import { createMockCheckoutSession, createMockStripeClient } from '@/test-utils/mockStripe';

// Mock Stripe
jest.mock('@/lib/stripe', () => ({
  createCheckoutSession: jest.fn(),
  getOrCreateStripeCustomer: jest.fn(),
}));

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
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

describe('POST /api/stripe/checkout', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;
  let mockRequest: NextRequest;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    const { createServerClient } = require('@supabase/ssr');
    createServerClient.mockReturnValue(mockSupabase);

    process.env.STRIPE_PREMIUM_PRICE_ID = 'price_test_premium';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';

    jest.clearAllMocks();
  });

  afterEach(() => {
    resetAllMocks(mockSupabase);
    delete process.env.STRIPE_PREMIUM_PRICE_ID;
    delete process.env.NEXT_PUBLIC_BASE_URL;
  });

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockUnauthenticatedUser(mockSupabase);
      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 when auth error occurs', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' },
      });
      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(401);
    });
  });

  describe('User Profile Validation', () => {
    it('should return 500 when user profile not found', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      mockQueryError(mockSupabase, 'Profile not found');

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to fetch user profile');
    });

    it('should return 400 when user already has active subscription', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        tier: 'premium',
        subscription_status: 'active',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe('You already have an active subscription');
    });

    it('should allow checkout for free tier users', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        tier: 'free',
        subscription_status: null,
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue(createMockCheckoutSession({ id: 'cs_test_123' }));

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });

    it('should allow checkout for users with canceled subscriptions', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        tier: 'free',
        subscription_status: 'canceled',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue(createMockCheckoutSession({ id: 'cs_test_123' }));

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(200);
    });
  });

  describe('Stripe Customer Creation', () => {
    it('should create new Stripe customer when not exists', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: null,
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      // Mock successful update
      mockSupabase.update.mockReturnThis();
      mockSupabase.eq.mockResolvedValue({ error: null });

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_new_123');
      createCheckoutSession.mockResolvedValue(
        createMockCheckoutSession({ customer: 'cus_new_123' })
      );

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        stripeCustomerId: null,
      });
      expect(mockSupabase.update).toHaveBeenCalledWith({
        stripe_customer_id: 'cus_new_123',
      });
    });

    it('should use existing Stripe customer when available', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_existing_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_existing_123');
      createCheckoutSession.mockResolvedValue(
        createMockCheckoutSession({ customer: 'cus_existing_123' })
      );

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(getOrCreateStripeCustomer).toHaveBeenCalledWith({
        userId: mockUser.id,
        email: mockUser.email,
        stripeCustomerId: 'cus_existing_123',
      });
      expect(mockSupabase.update).not.toHaveBeenCalled();
    });
  });

  describe('Checkout Session Creation', () => {
    it('should create checkout session with default price', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      const mockSession = createMockCheckoutSession();
      createCheckoutSession.mockResolvedValue(mockSession);

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith({
        customerId: 'cus_test_123',
        priceId: 'price_test_premium',
        userId: mockUser.id,
        successUrl: expect.stringContaining('/settings?session_id='),
        cancelUrl: expect.stringContaining('/settings'),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.sessionId).toBe(mockSession.id);
      expect(data.url).toBe(mockSession.url);
    });

    it('should create checkout session with custom price', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue(createMockCheckoutSession());

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({ priceId: 'price_custom_123' }),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          priceId: 'price_custom_123',
        })
      );
    });

    it('should return 500 when price ID not configured', async () => {
      delete process.env.STRIPE_PREMIUM_PRICE_ID;

      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Price ID not configured');
    });
  });

  describe('Error Handling', () => {
    it('should return 500 when Stripe API fails', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockRejectedValue(new Error('Stripe API error'));

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBe('Failed to create checkout session');
    });

    it('should handle malformed JSON body', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({ id: mockUser.id });
      mockQuerySuccess(mockSupabase, mockProfile);

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: 'invalid json',
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });

      expect(response.status).toBe(500);
    });
  });

  describe('Response Format', () => {
    it('should return sessionId and url', async () => {
      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      const mockSession = createMockCheckoutSession({
        id: 'cs_test_456',
        url: 'https://checkout.stripe.com/test456',
      });
      createCheckoutSession.mockResolvedValue(mockSession);

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(mockRequest, { params: Promise.resolve({}) });
      const data = await response.json();

      expect(data).toHaveProperty('sessionId', 'cs_test_456');
      expect(data).toHaveProperty('url', 'https://checkout.stripe.com/test456');
    });
  });

  describe('URL Configuration', () => {
    it('should use NEXT_PUBLIC_BASE_URL when available', async () => {
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue(createMockCheckoutSession());

      mockRequest = new NextRequest('http://localhost/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: 'https://example.com/settings?session_id={CHECKOUT_SESSION_ID}',
          cancelUrl: 'https://example.com/settings',
        })
      );
    });

    it('should fallback to request origin when BASE_URL not set', async () => {
      delete process.env.NEXT_PUBLIC_BASE_URL;

      const mockUser = mockAuthenticatedUser(mockSupabase);
      const mockProfile = createMockUserProfile({
        id: mockUser.id,
        stripe_customer_id: 'cus_test_123',
      });
      mockQuerySuccess(mockSupabase, mockProfile);

      const { createCheckoutSession, getOrCreateStripeCustomer } = require('@/lib/stripe');
      getOrCreateStripeCustomer.mockResolvedValue('cus_test_123');
      createCheckoutSession.mockResolvedValue(createMockCheckoutSession());

      mockRequest = new NextRequest('http://localhost:3000/api/stripe/checkout', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      await POST(mockRequest, { params: Promise.resolve({}) });

      expect(createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          successUrl: expect.stringContaining('http://localhost:3000/settings'),
          cancelUrl: expect.stringContaining('http://localhost:3000/settings'),
        })
      );
    });
  });
});
