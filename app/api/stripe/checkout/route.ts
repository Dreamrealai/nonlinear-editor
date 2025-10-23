// =============================================================================
// Stripe Checkout API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';
import { serverLogger } from '@/lib/serverLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'stripe.checkout.request_started',
    }, 'Checkout session request received');

    // Get user from Supabase session
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {}, // Not needed for this request
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn({
        event: 'stripe.checkout.unauthorized',
        error: authError?.message,
      }, 'Unauthorized checkout attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    serverLogger.debug({
      event: 'stripe.checkout.user_authenticated',
      userId: user.id,
      email: user.email,
    }, 'User authenticated for checkout');

    // Get or create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      serverLogger.error({
        event: 'stripe.checkout.profile_error',
        userId: user.id,
        error: profileError.message,
        code: profileError.code,
      }, 'Failed to fetch user profile');
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    serverLogger.debug({
      event: 'stripe.checkout.profile_fetched',
      userId: user.id,
      tier: profile.tier,
      subscriptionStatus: profile.subscription_status,
      hasStripeCustomer: !!profile.stripe_customer_id,
    }, 'User profile retrieved');

    // Check if user already has an active subscription
    if (profile.tier === 'premium' && profile.subscription_status === 'active') {
      serverLogger.warn({
        event: 'stripe.checkout.already_subscribed',
        userId: user.id,
        tier: profile.tier,
        subscriptionStatus: profile.subscription_status,
      }, 'User already has active subscription');
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    serverLogger.debug({
      event: 'stripe.checkout.customer_lookup',
      userId: user.id,
      existingCustomerId: profile.stripe_customer_id,
    }, 'Getting or creating Stripe customer');

    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email!,
      stripeCustomerId: profile.stripe_customer_id,
    });

    serverLogger.debug({
      event: 'stripe.checkout.customer_ready',
      userId: user.id,
      customerId,
      wasCreated: !profile.stripe_customer_id,
    }, 'Stripe customer ready');

    // Update user profile with customer ID if it was just created
    if (!profile.stripe_customer_id) {
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);

      if (updateError) {
        serverLogger.error({
          event: 'stripe.checkout.customer_update_error',
          userId: user.id,
          customerId,
          error: updateError.message,
        }, 'Failed to update profile with customer ID');
      } else {
        serverLogger.debug({
          event: 'stripe.checkout.customer_saved',
          userId: user.id,
          customerId,
        }, 'Customer ID saved to profile');
      }
    }

    // Get price ID from request or env
    const { priceId } = await request.json();
    const finalPriceId = priceId || process.env.STRIPE_PREMIUM_PRICE_ID;

    serverLogger.debug({
      event: 'stripe.checkout.price_selected',
      userId: user.id,
      priceId: finalPriceId,
      customPriceProvided: !!priceId,
    }, 'Price ID selected for checkout');

    if (!finalPriceId) {
      serverLogger.error({
        event: 'stripe.checkout.config_error',
        userId: user.id,
        error: 'Price ID not configured',
      }, 'Price ID not configured');
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // Create checkout session
    serverLogger.debug({
      event: 'stripe.checkout.session_creating',
      userId: user.id,
      customerId,
      priceId: finalPriceId,
    }, 'Creating Stripe checkout session');

    const session = await createCheckoutSession({
      customerId,
      priceId: finalPriceId,
      userId: user.id,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/settings`,
    });

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'stripe.checkout.session_created',
      userId: user.id,
      customerId,
      sessionId: session.id,
      priceId: finalPriceId,
      duration,
    }, `Checkout session created successfully in ${duration}ms`);

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'stripe.checkout.error',
      error,
      duration,
    }, 'Error creating checkout session');
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
