// =============================================================================
// Stripe Customer Portal API Route
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createBillingPortalSession } from '@/lib/stripe';
import { serverLogger } from '@/lib/serverLogger';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rateLimit';
import { getCachedUserProfile } from '@/lib/cachedData';
import { withErrorHandling } from '@/lib/api/response';

export const POST = withErrorHandling(async (request: NextRequest) => {
  // TIER 1 RATE LIMITING: Payment portal operations (5/min)
  const supabaseForRateLimit = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const {
    data: { user: rateLimitUser },
  } = await supabaseForRateLimit.auth.getUser();
  const rateLimitIdentifier = rateLimitUser?.id
    ? `stripe-portal:${rateLimitUser.id}`
    : `stripe-portal:${request.headers.get('x-forwarded-for') || 'unknown'}`;

  const rateLimitResult = await checkRateLimit(rateLimitIdentifier, RATE_LIMITS.tier1_auth_payment);

  if (!rateLimitResult.success) {
    serverLogger.warn(
      {
        event: 'stripe.portal.rate_limited',
        identifier: rateLimitIdentifier,
        limit: rateLimitResult.limit,
      },
      'Stripe portal rate limit exceeded'
    );

    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetAt: rateLimitResult.resetAt,
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
        },
      }
    );
  }
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'stripe.portal.request_started',
    },
    'Billing portal session request received'
  );

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

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    serverLogger.warn(
      {
        event: 'stripe.portal.unauthorized',
        error: authError?.message,
      },
      'Unauthorized billing portal attempt'
    );
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  serverLogger.debug(
    {
      event: 'stripe.portal.user_authenticated',
      userId: user.id,
    },
    'User authenticated for billing portal'
  );

  // Get user profile with Stripe customer ID (CACHED)
  const profile = await getCachedUserProfile(supabase, user.id);

  if (!profile) {
    serverLogger.warn(
      {
        event: 'stripe.portal.no_profile',
        userId: user.id,
      },
      'No user profile found'
    );
    return NextResponse.json({ error: 'User profile not found' }, { status: 400 });
  }

  // Check for stripe_customer_id
  // Note: Need to fetch full profile if stripe_customer_id is needed
  const { data: fullProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (profileError || !fullProfile?.stripe_customer_id) {
    serverLogger.warn(
      {
        event: 'stripe.portal.no_customer',
        userId: user.id,
        hasCustomerId: !!fullProfile?.stripe_customer_id,
        error: profileError?.message,
      },
      'No Stripe customer found for user'
    );
    return NextResponse.json(
      { error: 'No Stripe customer found. Please subscribe first.' },
      { status: 400 }
    );
  }

  serverLogger.debug(
    {
      event: 'stripe.portal.customer_found',
      userId: user.id,
      customerId: fullProfile.stripe_customer_id,
      tier: profile.tier,
    },
    'Stripe customer found'
  );

  // Create billing portal session
  serverLogger.debug(
    {
      event: 'stripe.portal.session_creating',
      userId: user.id,
      customerId: fullProfile.stripe_customer_id,
    },
    'Creating billing portal session'
  );

  const session = await createBillingPortalSession({
    customerId: fullProfile.stripe_customer_id,
    returnUrl: `${process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin}/settings`,
  });

  const duration = Date.now() - startTime;
  serverLogger.info(
    {
      event: 'stripe.portal.session_created',
      userId: user.id,
      customerId: fullProfile.stripe_customer_id,
      sessionId: session.id,
      duration,
    },
    `Billing portal session created in ${duration}ms`
  );

  return NextResponse.json({
    url: session.url,
  });
});
