/**
 * Mock Stripe utilities for testing
 */

import Stripe from 'stripe';

/**
 * Creates a mock Stripe checkout session
 */
export function createMockCheckoutSession(
  overrides?: Partial<Stripe.Checkout.Session>
): Stripe.Checkout.Session {
  return {
    id: 'cs_test_123',
    object: 'checkout.session',
    url: 'https://checkout.stripe.com/test',
    customer: 'cus_test_123',
    subscription: 'sub_test_123',
    amount_total: 999,
    currency: 'usd',
    mode: 'subscription',
    payment_status: 'paid',
    status: 'complete',
    metadata: {
      userId: 'test-user-id',
    },
    ...overrides,
  } as Stripe.Checkout.Session;
}

/**
 * Creates a mock Stripe subscription
 */
export function createMockSubscription(
  overrides?: Partial<Stripe.Subscription>
): Stripe.Subscription {
  return {
    id: 'sub_test_123',
    object: 'subscription',
    customer: 'cus_test_123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    items: {
      object: 'list',
      data: [
        {
          id: 'si_test_123',
          object: 'subscription_item',
          price: {
            id: 'price_test_123',
            object: 'price',
            active: true,
            currency: 'usd',
            product: 'prod_test_123',
            type: 'recurring',
            unit_amount: 999,
          } as Stripe.Price,
        } as Stripe.SubscriptionItem,
      ],
    } as Stripe.ApiList<Stripe.SubscriptionItem>,
    ...overrides,
  } as Stripe.Subscription;
}

/**
 * Creates a mock Stripe customer
 */
export function createMockCustomer(overrides?: Partial<Stripe.Customer>): Stripe.Customer {
  return {
    id: 'cus_test_123',
    object: 'customer',
    email: 'test@example.com',
    metadata: {},
    ...overrides,
  } as Stripe.Customer;
}

/**
 * Creates a mock Stripe webhook event
 */
export function createMockWebhookEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: 'evt_test_123',
    object: 'event',
    api_version: '2024-11-20.acacia',
    type,
    data: {
      object: data,
    },
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

/**
 * Mock Stripe client
 */
export function createMockStripeClient() {
  return {
    checkout: {
      sessions: {
        create: jest.fn(),
        retrieve: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
      cancel: jest.fn(),
    },
    customers: {
      create: jest.fn(),
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    billingPortal: {
      sessions: {
        create: jest.fn(),
      },
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
}
