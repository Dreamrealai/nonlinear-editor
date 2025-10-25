// =============================================================================
// Stripe Webhook API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createServiceSupabaseClient } from '@/lib/supabase';
import Stripe from 'stripe';
import { serverLogger } from '@/lib/serverLogger';
import { invalidateOnStripeWebhook } from '@/lib/cacheInvalidation';
import { errorResponse, serviceUnavailableResponse, successResponse } from '@/lib/api/response';

// Disable body parser to handle raw body for webhook signature verification
export const runtime = 'nodejs';

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  serverLogger.info(
    {
      event: 'stripe.checkout.started',
      sessionId: session.id,
      userId,
      customerId,
      subscriptionId,
      amount: session.amount_total,
      currency: session.currency,
    },
    'Processing checkout.session.completed webhook'
  );

  // CRITICAL: Validate userId exists
  if (!userId) {
    serverLogger.error(
      {
        event: 'stripe.checkout.error',
        sessionId: session.id,
        customerId,
        error: 'Missing userId in session metadata',
      },
      'No userId in checkout session metadata'
    );
    throw new Error('Missing userId in checkout session metadata');
  }

  try {
    const supabaseAdmin = createServiceSupabaseClient();

    // CRITICAL: Verify user profile exists before updating
    type UserProfile = {
      id: string;
      tier: 'free' | 'premium' | 'admin';
    };
    const { data: existingProfile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tier')
      .eq('id', userId)
      .single<UserProfile>();

    if (fetchError || !existingProfile) {
      serverLogger.error(
        {
          event: 'stripe.checkout.user_not_found',
          userId,
          sessionId: session.id,
          error: fetchError?.message,
        },
        'User profile not found for userId in checkout metadata'
      );
      throw new Error(`User profile not found for userId: ${userId}`);
    }

    // Get subscription details
    serverLogger.debug(
      {
        event: 'stripe.subscription.retrieve',
        subscriptionId,
        userId,
      },
      'Retrieving subscription details from Stripe'
    );

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    // Extract subscription data with proper typing
    interface SubscriptionData {
      current_period_start: number;
      current_period_end: number;
      status: string;
      cancel_at_period_end: boolean;
      items: {
        data: Array<{
          price: string | { id: string };
        }>;
      };
    }
    const subscriptionData = subscription as unknown as SubscriptionData;

    // Safely get the first item's price
    const firstItem = subscriptionData.items.data?.[0];
    if (!firstItem) {
      serverLogger.error(
        {
          event: 'stripe.subscription.no_items',
          subscriptionId,
        },
        'No subscription items found'
      );
      return;
    }

    const priceId = typeof firstItem.price === 'string' ? firstItem.price : firstItem.price.id;

    serverLogger.debug(
      {
        event: 'stripe.subscription.data',
        subscriptionId,
        priceId,
        status: subscriptionData.status,
        periodStart: subscriptionData.current_period_start,
        periodEnd: subscriptionData.current_period_end,
        userId,
        currentTier: existingProfile.tier,
      },
      'Retrieved subscription data'
    );

    // CRITICAL: Preserve admin tier - don't downgrade admin to premium
    const currentTier = existingProfile.tier;
    const newTier = currentTier === 'admin' ? 'admin' : 'premium';

    // Update user profile
    const updateData = {
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      subscription_status: subscriptionData.status,
      subscription_current_period_start: new Date(
        subscriptionData.current_period_start * 1000
      ).toISOString(),
      subscription_current_period_end: new Date(
        subscriptionData.current_period_end * 1000
      ).toISOString(),
      subscription_cancel_at_period_end: subscriptionData.cancel_at_period_end,
      tier: newTier,
    };
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData as never)
      .eq('id', userId)
      .select();

    // CRITICAL: Check for database errors and throw to trigger Stripe retry
    if (error) {
      serverLogger.error(
        {
          event: 'stripe.checkout.db_error',
          userId,
          customerId,
          subscriptionId,
          error: error.message,
          code: error.code,
        },
        'Failed to update user profile after checkout'
      );
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      serverLogger.error(
        {
          event: 'stripe.checkout.db_error',
          userId,
          customerId,
          subscriptionId,
          error: 'No rows updated',
        },
        'Database update returned no rows'
      );
      throw new Error('Database update failed: No rows updated');
    }

    serverLogger.info(
      {
        event: 'stripe.checkout.completed',
        userId,
        customerId,
        subscriptionId,
        priceId,
        oldTier: currentTier,
        newTier,
        status: subscriptionData.status,
        amount: session.amount_total,
        currency: session.currency,
      },
      `Checkout completed successfully - tier: ${currentTier} -> ${newTier}`
    );

    // Invalidate user cache after successful checkout
    await invalidateOnStripeWebhook(userId, 'checkout.session.completed');
  } catch (error) {
    serverLogger.error(
      {
        event: 'stripe.checkout.error',
        userId,
        customerId,
        subscriptionId,
        error,
      },
      'Error processing checkout session completion'
    );
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  serverLogger.info(
    {
      event: 'stripe.subscription.update_started',
      subscriptionId: subscription.id,
      customerId,
      status: subscription.status,
    },
    'Processing customer.subscription.updated webhook'
  );

  try {
    const supabaseAdmin = createServiceSupabaseClient();

    // Find user by customer ID
    type UserProfile = {
      id: string;
      tier: 'free' | 'premium' | 'admin';
    };
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tier')
      .eq('stripe_customer_id', customerId)
      .single<UserProfile>();

    if (fetchError || !profile) {
      serverLogger.error(
        {
          event: 'stripe.subscription.user_not_found',
          customerId,
          subscriptionId: subscription.id,
          error: fetchError?.message,
        },
        'No user found for customer ID'
      );
      return;
    }

    // Extract subscription data with proper typing
    interface SubscriptionUpdateData {
      id: string;
      current_period_start: number;
      current_period_end: number;
      status: string;
      cancel_at_period_end: boolean;
      items: {
        data: Array<{
          price: string | { id: string };
        }>;
      };
    }
    const subscriptionData = subscription as unknown as SubscriptionUpdateData;

    // CRITICAL: Preserve admin tier - determine tier based on subscription status
    const oldTier = profile.tier;
    let tier: 'free' | 'premium' | 'admin' = 'free';

    // Don't downgrade admin users
    if (oldTier === 'admin') {
      tier = 'admin';
    } else if (subscriptionData.status === 'active' || subscriptionData.status === 'trialing') {
      tier = 'premium';
    }

    // Safely get the first item's price
    const firstItem = subscriptionData.items.data?.[0];
    if (!firstItem) {
      serverLogger.error(
        {
          event: 'stripe.subscription_update.no_items',
          subscriptionId: subscriptionData.id,
        },
        'No subscription items found in update'
      );
      return;
    }

    const priceId = typeof firstItem.price === 'string' ? firstItem.price : firstItem.price.id;

    serverLogger.debug(
      {
        event: 'stripe.subscription.tier_change',
        userId: profile.id,
        oldTier,
        newTier: tier,
        status: subscriptionData.status,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      },
      'Subscription tier transition'
    );

    // Update user profile
    const updateData = {
      stripe_subscription_id: subscriptionData.id,
      stripe_price_id: priceId,
      subscription_status: subscriptionData.status,
      subscription_current_period_start: new Date(
        subscriptionData.current_period_start * 1000
      ).toISOString(),
      subscription_current_period_end: new Date(
        subscriptionData.current_period_end * 1000
      ).toISOString(),
      subscription_cancel_at_period_end: subscriptionData.cancel_at_period_end,
      tier,
    };
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData as never)
      .eq('id', profile.id)
      .select();

    // CRITICAL: Check for database errors and throw to trigger Stripe retry
    if (error) {
      serverLogger.error(
        {
          event: 'stripe.subscription.db_error',
          userId: profile.id,
          customerId,
          subscriptionId: subscription.id,
          error: error.message,
          code: error.code,
        },
        'Failed to update user profile after subscription update'
      );
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      serverLogger.error(
        {
          event: 'stripe.subscription.db_error',
          userId: profile.id,
          customerId,
          subscriptionId: subscription.id,
          error: 'No rows updated',
        },
        'Database update returned no rows'
      );
      throw new Error('Database update failed: No rows updated');
    }

    serverLogger.info(
      {
        event: 'stripe.subscription.updated',
        userId: profile.id,
        customerId,
        subscriptionId: subscriptionData.id,
        status: subscriptionData.status,
        tier,
        oldTier,
        priceId,
        cancelAtPeriodEnd: subscriptionData.cancel_at_period_end,
      },
      `Subscription updated successfully - status: ${subscriptionData.status}, tier: ${oldTier} -> ${tier}`
    );
  } catch (error) {
    serverLogger.error(
      {
        event: 'stripe.subscription.update_error',
        customerId,
        subscriptionId: subscription.id,
        error,
      },
      'Error processing subscription update'
    );
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const customerId = subscription.customer as string;

  serverLogger.info(
    {
      event: 'stripe.subscription.delete_started',
      subscriptionId: subscription.id,
      customerId,
    },
    'Processing customer.subscription.deleted webhook'
  );

  try {
    const supabaseAdmin = createServiceSupabaseClient();

    // Find user by customer ID
    type UserProfileWithSubscription = {
      id: string;
      tier: 'free' | 'premium' | 'admin';
      stripe_subscription_id: string | null;
    };
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tier, stripe_subscription_id')
      .eq('stripe_customer_id', customerId)
      .single<UserProfileWithSubscription>();

    if (fetchError || !profile) {
      serverLogger.error(
        {
          event: 'stripe.subscription.user_not_found',
          customerId,
          subscriptionId: subscription.id,
          error: fetchError?.message,
        },
        'No user found for customer ID'
      );
      return;
    }

    const oldTier = profile.tier;

    // CRITICAL: Preserve admin tier - don't downgrade admin users on subscription cancel
    const newTier = oldTier === 'admin' ? 'admin' : 'free';

    // Downgrade user to free tier (unless admin)
    const updateData = {
      tier: newTier,
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_cancel_at_period_end: false,
    };
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .update(updateData as never)
      .eq('id', profile.id)
      .select();

    // CRITICAL: Check for database errors and throw to trigger Stripe retry
    if (error) {
      serverLogger.error(
        {
          event: 'stripe.subscription.delete_db_error',
          userId: profile.id,
          customerId,
          subscriptionId: subscription.id,
          error: error.message,
          code: error.code,
        },
        'Failed to downgrade user after subscription deletion'
      );
      throw new Error(`Database update failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      serverLogger.error(
        {
          event: 'stripe.subscription.delete_db_error',
          userId: profile.id,
          customerId,
          subscriptionId: subscription.id,
          error: 'No rows updated',
        },
        'Database update returned no rows'
      );
      throw new Error('Database update failed: No rows updated');
    }

    serverLogger.info(
      {
        event: 'stripe.subscription.deleted',
        userId: profile.id,
        customerId,
        subscriptionId: subscription.id,
        oldTier,
        newTier,
      },
      `Subscription deleted - tier: ${oldTier} -> ${newTier}`
    );
  } catch (error) {
    serverLogger.error(
      {
        event: 'stripe.subscription.delete_error',
        customerId,
        subscriptionId: subscription.id,
        error,
      },
      'Error processing subscription deletion'
    );
    throw error;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    serverLogger.debug(
      {
        event: 'stripe.webhook.received',
        hasSignature: !!signature,
        bodyLength: body.length,
      },
      'Stripe webhook request received'
    );

    if (!signature) {
      serverLogger.warn(
        {
          event: 'stripe.webhook.missing_signature',
        },
        'Webhook request missing stripe-signature header'
      );
      return errorResponse('Invalid request', 400);
    }

    if (!process.env['STRIPE_WEBHOOK_SECRET']) {
      serverLogger.error(
        {
          event: 'stripe.webhook.config_error',
          error: 'STRIPE_WEBHOOK_SECRET not configured',
        },
        'CRITICAL: STRIPE_WEBHOOK_SECRET is not set - webhooks will fail'
      );
      // Don't reveal configuration state to potential attackers
      return serviceUnavailableResponse('Service temporarily unavailable');
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, process.env['STRIPE_WEBHOOK_SECRET']);

      serverLogger.debug(
        {
          event: 'stripe.webhook.verified',
          eventType: event.type,
          eventId: event.id,
        },
        'Webhook signature verified successfully'
      );
    } catch (error) {
      serverLogger.error(
        {
          event: 'stripe.webhook.verification_failed',
          error,
        },
        'Webhook signature verification failed'
      );
      // Don't reveal why verification failed
      return errorResponse('Invalid request', 400);
    }

    // Handle the event
    serverLogger.info(
      {
        event: 'stripe.webhook.processing',
        eventType: event.type,
        eventId: event.id,
        created: event.created,
      },
      `Processing Stripe webhook: ${event.type}`
    );

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.created':
        // Usually handled by checkout.session.completed
        serverLogger.info(
          {
            event: 'stripe.subscription.created',
            subscriptionId: (event.data.object as Stripe.Subscription).id,
            customerId: (event.data.object as Stripe.Subscription).customer,
          },
          'Subscription created (handled by checkout.session.completed)'
        );
        break;

      default:
        serverLogger.warn(
          {
            event: 'stripe.webhook.unhandled',
            eventType: event.type,
            eventId: event.id,
          },
          `Unhandled webhook event type: ${event.type}`
        );
    }

    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'stripe.webhook.completed',
        eventType: event.type,
        eventId: event.id,
        duration,
      },
      `Webhook processed successfully in ${duration}ms`
    );

    return successResponse({ received: true });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    serverLogger.error(
      {
        event: 'stripe.webhook.error',
        error,
        errorMessage,
        errorStack,
        duration,
      },
      'Error processing webhook'
    );
    // Return 500 to trigger Stripe automatic retry
    // Don't reveal internal error details
    // In test environment, include error details for debugging
    if (process.env.NODE_ENV === 'test') {
      return NextResponse.json(
        { error: 'Internal server error', details: errorMessage },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
