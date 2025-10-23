// =============================================================================
// Stripe Webhook API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Disable body parser to handle raw body for webhook signature verification
export const runtime = 'nodejs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;

  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ['items.data.price'],
  });

  // Extract values before type narrowing
  const subscriptionData = subscription as unknown as {
    current_period_start: number;
    current_period_end: number;
    status: string;
    cancel_at_period_end: boolean;
    items: {
      data: Array<{
        price: string | { id: string };
      }>;
    };
  };

  const priceId = typeof subscriptionData.items.data[0].price === 'string'
    ? subscriptionData.items.data[0].price
    : subscriptionData.items.data[0].price.id;

  // Update user profile
  await supabaseAdmin
    .from('user_profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      subscription_status: subscriptionData.status,
      subscription_current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      subscription_cancel_at_period_end: subscriptionData.cancel_at_period_end,
      tier: 'premium',
    })
    .eq('id', userId);

  console.log(`✅ Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Extract subscription data
  const subscriptionData = subscription as unknown as {
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
  };

  // Determine tier based on subscription status
  let tier: 'free' | 'premium' | 'admin' = 'free';
  if (subscriptionData.status === 'active' || subscriptionData.status === 'trialing') {
    tier = 'premium';
  }

  const priceId = typeof subscriptionData.items.data[0].price === 'string'
    ? subscriptionData.items.data[0].price
    : subscriptionData.items.data[0].price.id;

  // Update user profile
  await supabaseAdmin
    .from('user_profiles')
    .update({
      stripe_subscription_id: subscriptionData.id,
      stripe_price_id: priceId,
      subscription_status: subscriptionData.status,
      subscription_current_period_start: new Date(subscriptionData.current_period_start * 1000).toISOString(),
      subscription_current_period_end: new Date(subscriptionData.current_period_end * 1000).toISOString(),
      subscription_cancel_at_period_end: subscriptionData.cancel_at_period_end,
      tier,
    })
    .eq('id', profile.id);

  console.log(`✅ Subscription updated for user ${profile.id}, status: ${subscriptionData.status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const customerId = subscription.customer as string;

  // Find user by customer ID
  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No user found for customer:', customerId);
    return;
  }

  // Downgrade user to free tier
  await supabaseAdmin
    .from('user_profiles')
    .update({
      tier: 'free',
      subscription_status: 'canceled',
      stripe_subscription_id: null,
      stripe_price_id: null,
      subscription_cancel_at_period_end: false,
    })
    .eq('id', profile.id);

  console.log(`✅ Subscription deleted for user ${profile.id}`);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error('STRIPE_WEBHOOK_SECRET is not set');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (error) {
      console.error('⚠️  Webhook signature verification failed:', error);
      return NextResponse.json(
        { error: 'Webhook signature verification failed' },
        { status: 400 }
      );
    }

    // Handle the event
    console.log(`🔔 Stripe webhook event: ${event.type}`);

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
        console.log('Subscription created:', event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
