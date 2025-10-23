// =============================================================================
// Stripe Checkout API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createCheckoutSession, getOrCreateStripeCustomer } from '@/lib/stripe';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to fetch user profile' },
        { status: 500 }
      );
    }

    // Check if user already has an active subscription
    if (profile.tier === 'premium' && profile.subscription_status === 'active') {
      return NextResponse.json(
        { error: 'You already have an active subscription' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer({
      userId: user.id,
      email: user.email!,
      stripeCustomerId: profile.stripe_customer_id,
    });

    // Update user profile with customer ID if it was just created
    if (!profile.stripe_customer_id) {
      await supabase
        .from('user_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id);
    }

    // Get price ID from request or env
    const { priceId } = await request.json();
    const finalPriceId = priceId || process.env.STRIPE_PREMIUM_PRICE_ID;

    if (!finalPriceId) {
      return NextResponse.json(
        { error: 'Price ID not configured' },
        { status: 500 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession({
      customerId,
      priceId: finalPriceId,
      userId: user.id,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/settings`,
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
