/**
 * Tests for Stripe Integration
 *
 * @module __tests__/lib/stripe.test
 */

import {
  stripe,
  getOrCreateStripeCustomer,
  createCheckoutSession,
  createBillingPortalSession,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  createPremiumProduct,
} from '@/lib/stripe';
import Stripe from 'stripe';
import { serverLogger } from '@/lib/serverLogger';

// Mock Stripe SDK
jest.mock('stripe');
jest.mock('@/lib/serverLogger');

const MockStripe = Stripe as jest.MockedClass<typeof Stripe>;

describe('Stripe Configuration', () => {
  const originalEnv = process.env;

  beforeAll(() => {
    // Set required env var
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('should initialize Stripe with correct configuration', () => {
    expect(MockStripe).toHaveBeenCalledWith('sk_test_123', {
      apiVersion: '2025-09-30.clover',
      typescript: true,
    });
  });
});

describe('getOrCreateStripeCustomer', () => {
  let mockCustomers: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCustomers = {
      retrieve: jest.fn(),
      create: jest.fn(),
    };

    (stripe as any).customers = mockCustomers;
  });

  describe('Existing Customer', () => {
    it('should return existing customer ID if valid', async () => {
      const mockCustomer = {
        id: 'cus_123',
        email: 'test@example.com',
      };

      mockCustomers.retrieve.mockResolvedValue(mockCustomer);

      const result = await getOrCreateStripeCustomer({
        userId: 'user-123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_123',
      });

      expect(result).toBe('cus_123');
      expect(mockCustomers.retrieve).toHaveBeenCalledWith('cus_123');
      expect(mockCustomers.create).not.toHaveBeenCalled();
    });

    it('should create new customer if retrieve fails', async () => {
      mockCustomers.retrieve.mockRejectedValue(new Error('Customer not found'));
      mockCustomers.create.mockResolvedValue({ id: 'cus_456' });

      const result = await getOrCreateStripeCustomer({
        userId: 'user-123',
        email: 'test@example.com',
        stripeCustomerId: 'cus_invalid',
      });

      expect(result).toBe('cus_456');
      expect(mockCustomers.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        metadata: { userId: 'user-123' },
      });
      expect(serverLogger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'stripe.customer.retrieve_failed',
          customerId: 'cus_invalid',
        }),
        expect.any(String)
      );
    });
  });

  describe('New Customer', () => {
    it('should create new customer when no ID provided', async () => {
      const mockCustomer = {
        id: 'cus_new_123',
        email: 'newuser@example.com',
      };

      mockCustomers.create.mockResolvedValue(mockCustomer);

      const result = await getOrCreateStripeCustomer({
        userId: 'user-new',
        email: 'newuser@example.com',
      });

      expect(result).toBe('cus_new_123');
      expect(mockCustomers.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        metadata: { userId: 'user-new' },
      });
      expect(mockCustomers.retrieve).not.toHaveBeenCalled();
    });

    it('should create customer with null stripeCustomerId', async () => {
      mockCustomers.create.mockResolvedValue({ id: 'cus_789' });

      const result = await getOrCreateStripeCustomer({
        userId: 'user-123',
        email: 'test@example.com',
        stripeCustomerId: null,
      });

      expect(result).toBe('cus_789');
      expect(mockCustomers.create).toHaveBeenCalled();
      expect(mockCustomers.retrieve).not.toHaveBeenCalled();
    });

    it('should create customer with metadata', async () => {
      mockCustomers.create.mockResolvedValue({ id: 'cus_meta' });

      await getOrCreateStripeCustomer({
        userId: 'user-meta-123',
        email: 'meta@example.com',
      });

      expect(mockCustomers.create).toHaveBeenCalledWith({
        email: 'meta@example.com',
        metadata: {
          userId: 'user-meta-123',
        },
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate Stripe API errors', async () => {
      mockCustomers.create.mockRejectedValue(new Error('Stripe API error'));

      await expect(
        getOrCreateStripeCustomer({
          userId: 'user-123',
          email: 'test@example.com',
        })
      ).rejects.toThrow('Stripe API error');
    });
  });
});

describe('createCheckoutSession', () => {
  let mockCheckout: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockCheckout = {
      sessions: {
        create: jest.fn(),
      },
    };

    (stripe as any).checkout = mockCheckout;
  });

  describe('Session Creation', () => {
    it('should create checkout session with correct parameters', async () => {
      const mockSession = {
        id: 'cs_test_123',
        url: 'https://checkout.stripe.com/pay/cs_test_123',
      };

      mockCheckout.sessions.create.mockResolvedValue(mockSession);

      const result = await createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_premium',
        userId: 'user-123',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });

      expect(result).toEqual(mockSession);
      expect(mockCheckout.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        line_items: [
          {
            price: 'price_premium',
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://app.com/success',
        cancel_url: 'https://app.com/cancel',
        metadata: {
          userId: 'user-123',
        },
        subscription_data: {
          metadata: {
            userId: 'user-123',
          },
        },
      });
    });

    it('should include user metadata in session and subscription', async () => {
      mockCheckout.sessions.create.mockResolvedValue({ id: 'cs_123' });

      await createCheckoutSession({
        customerId: 'cus_123',
        priceId: 'price_123',
        userId: 'user-special',
        successUrl: 'https://app.com/success',
        cancelUrl: 'https://app.com/cancel',
      });

      expect(mockCheckout.sessions.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { userId: 'user-special' },
          subscription_data: {
            metadata: { userId: 'user-special' },
          },
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate Stripe API errors', async () => {
      mockCheckout.sessions.create.mockRejectedValue(
        new Error('Invalid price ID')
      );

      await expect(
        createCheckoutSession({
          customerId: 'cus_123',
          priceId: 'invalid_price',
          userId: 'user-123',
          successUrl: 'https://app.com/success',
          cancelUrl: 'https://app.com/cancel',
        })
      ).rejects.toThrow('Invalid price ID');
    });
  });
});

describe('createBillingPortalSession', () => {
  let mockBillingPortal: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBillingPortal = {
      sessions: {
        create: jest.fn(),
      },
    };

    (stripe as any).billingPortal = mockBillingPortal;
  });

  describe('Portal Session Creation', () => {
    it('should create billing portal session', async () => {
      const mockSession = {
        id: 'bps_123',
        url: 'https://billing.stripe.com/session/bps_123',
      };

      mockBillingPortal.sessions.create.mockResolvedValue(mockSession);

      const result = await createBillingPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://app.com/billing',
      });

      expect(result).toEqual(mockSession);
      expect(mockBillingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.com/billing',
      });
    });

    it('should handle custom return URL', async () => {
      mockBillingPortal.sessions.create.mockResolvedValue({ id: 'bps_456' });

      await createBillingPortalSession({
        customerId: 'cus_123',
        returnUrl: 'https://app.com/custom-return',
      });

      expect(mockBillingPortal.sessions.create).toHaveBeenCalledWith({
        customer: 'cus_123',
        return_url: 'https://app.com/custom-return',
      });
    });
  });

  describe('Error Handling', () => {
    it('should propagate Stripe API errors', async () => {
      mockBillingPortal.sessions.create.mockRejectedValue(
        new Error('Customer not found')
      );

      await expect(
        createBillingPortalSession({
          customerId: 'cus_invalid',
          returnUrl: 'https://app.com/billing',
        })
      ).rejects.toThrow('Customer not found');
    });
  });
});

describe('cancelSubscriptionAtPeriodEnd', () => {
  let mockSubscriptions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubscriptions = {
      update: jest.fn(),
    };

    (stripe as any).subscriptions = mockSubscriptions;
  });

  describe('Subscription Cancellation', () => {
    it('should cancel subscription at period end', async () => {
      const mockSubscription = {
        id: 'sub_123',
        cancel_at_period_end: true,
      };

      mockSubscriptions.update.mockResolvedValue(mockSubscription);

      const result = await cancelSubscriptionAtPeriodEnd('sub_123');

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: true,
      });
    });

    it('should return updated subscription object', async () => {
      const mockSubscription = {
        id: 'sub_456',
        cancel_at_period_end: true,
        current_period_end: 1234567890,
      };

      mockSubscriptions.update.mockResolvedValue(mockSubscription);

      const result = await cancelSubscriptionAtPeriodEnd('sub_456');

      expect(result.cancel_at_period_end).toBe(true);
      expect(result.current_period_end).toBe(1234567890);
    });
  });

  describe('Error Handling', () => {
    it('should propagate Stripe API errors', async () => {
      mockSubscriptions.update.mockRejectedValue(
        new Error('Subscription not found')
      );

      await expect(
        cancelSubscriptionAtPeriodEnd('sub_invalid')
      ).rejects.toThrow('Subscription not found');
    });
  });
});

describe('resumeSubscription', () => {
  let mockSubscriptions: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSubscriptions = {
      update: jest.fn(),
    };

    (stripe as any).subscriptions = mockSubscriptions;
  });

  describe('Subscription Resumption', () => {
    it('should resume subscription', async () => {
      const mockSubscription = {
        id: 'sub_123',
        cancel_at_period_end: false,
      };

      mockSubscriptions.update.mockResolvedValue(mockSubscription);

      const result = await resumeSubscription('sub_123');

      expect(result).toEqual(mockSubscription);
      expect(mockSubscriptions.update).toHaveBeenCalledWith('sub_123', {
        cancel_at_period_end: false,
      });
    });

    it('should clear cancel_at_period_end flag', async () => {
      const mockSubscription = {
        id: 'sub_789',
        cancel_at_period_end: false,
      };

      mockSubscriptions.update.mockResolvedValue(mockSubscription);

      const result = await resumeSubscription('sub_789');

      expect(result.cancel_at_period_end).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should propagate Stripe API errors', async () => {
      mockSubscriptions.update.mockRejectedValue(
        new Error('Subscription already cancelled')
      );

      await expect(
        resumeSubscription('sub_cancelled')
      ).rejects.toThrow('Subscription already cancelled');
    });
  });
});

describe('createPremiumProduct', () => {
  let mockProducts: any;
  let mockPrices: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockProducts = {
      create: jest.fn(),
    };

    mockPrices = {
      create: jest.fn(),
    };

    (stripe as any).products = mockProducts;
    (stripe as any).prices = mockPrices;
  });

  describe('Product Creation', () => {
    it('should create product and price', async () => {
      const mockProduct = {
        id: 'prod_premium_123',
        name: 'DreamReal Premium',
      };

      const mockPrice = {
        id: 'price_premium_123',
        product: 'prod_premium_123',
        unit_amount: 4900,
      };

      mockProducts.create.mockResolvedValue(mockProduct);
      mockPrices.create.mockResolvedValue(mockPrice);

      const result = await createPremiumProduct();

      expect(result).toEqual({
        productId: 'prod_premium_123',
        priceId: 'price_premium_123',
      });
    });

    it('should create product with correct metadata', async () => {
      mockProducts.create.mockResolvedValue({ id: 'prod_123' });
      mockPrices.create.mockResolvedValue({ id: 'price_123' });

      await createPremiumProduct();

      expect(mockProducts.create).toHaveBeenCalledWith({
        name: 'DreamReal Premium',
        description: 'Premium subscription with advanced features',
        metadata: {
          tier: 'premium',
        },
      });
    });

    it('should create price with correct configuration', async () => {
      const mockProduct = { id: 'prod_abc' };
      mockProducts.create.mockResolvedValue(mockProduct);
      mockPrices.create.mockResolvedValue({ id: 'price_abc' });

      await createPremiumProduct();

      expect(mockPrices.create).toHaveBeenCalledWith({
        product: 'prod_abc',
        unit_amount: 4900, // $49.00 in cents
        currency: 'usd',
        recurring: {
          interval: 'month',
        },
        metadata: {
          tier: 'premium',
        },
      });
    });

    it('should return both product and price IDs', async () => {
      mockProducts.create.mockResolvedValue({ id: 'prod_test' });
      mockPrices.create.mockResolvedValue({ id: 'price_test' });

      const result = await createPremiumProduct();

      expect(result.productId).toBe('prod_test');
      expect(result.priceId).toBe('price_test');
    });
  });

  describe('Error Handling', () => {
    it('should handle product creation failure', async () => {
      mockProducts.create.mockRejectedValue(new Error('Product creation failed'));

      await expect(createPremiumProduct()).rejects.toThrow('Product creation failed');
      expect(mockPrices.create).not.toHaveBeenCalled();
    });

    it('should handle price creation failure', async () => {
      mockProducts.create.mockResolvedValue({ id: 'prod_123' });
      mockPrices.create.mockRejectedValue(new Error('Price creation failed'));

      await expect(createPremiumProduct()).rejects.toThrow('Price creation failed');
    });
  });
});
