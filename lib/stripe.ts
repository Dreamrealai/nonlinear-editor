// =============================================================================
// Stripe Configuration and Utilities
// =============================================================================

import Stripe from 'stripe';
import { serverLogger } from '@/lib/serverLogger';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables');
}

// Initialize Stripe with the secret key
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
});

// Stripe Price IDs (you'll need to create these in your Stripe Dashboard)
// For now, we'll use environment variables or create them dynamically
export const STRIPE_PRICE_IDS = {
  PREMIUM_MONTHLY: process.env.STRIPE_PREMIUM_PRICE_ID || '', // Will be set after creating in Stripe
};

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function getOrCreateStripeCustomer(params: {
  userId: string;
  email: string;
  stripeCustomerId?: string | null;
}): Promise<string> {
  const { userId, email, stripeCustomerId } = params;

  // If customer already exists, return it
  if (stripeCustomerId) {
    try {
      await stripe.customers.retrieve(stripeCustomerId);
      return stripeCustomerId;
    } catch (error) {
      serverLogger.warn({
        event: 'stripe.customer.retrieve_failed',
        customerId: stripeCustomerId,
        userId,
        error,
      }, 'Failed to retrieve existing Stripe customer, creating new one');
      // Customer doesn't exist, create a new one
    }
  }

  // Create a new customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(params: {
  customerId: string;
  priceId: string;
  userId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const { customerId, priceId, userId, successUrl, cancelUrl } = params;

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  });

  return session;
}

/**
 * Create a billing portal session for customer to manage subscription
 */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  const { customerId, returnUrl } = params;

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Resume a subscription that was set to cancel
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

/**
 * Create a product and price for Premium subscription
 * This should be run once to set up your Stripe products
 */
export async function createPremiumProduct(): Promise<{
  productId: string;
  priceId: string;
}> {
  // Create product
  const product = await stripe.products.create({
    name: 'DreamReal Premium',
    description: 'Premium subscription with advanced features',
    metadata: {
      tier: 'premium',
    },
  });

  // Create price ($49/month)
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900, // $49.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
    metadata: {
      tier: 'premium',
    },
  });

  return {
    productId: product.id,
    priceId: price.id,
  };
}
