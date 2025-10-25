// =============================================================================
// Stripe Customer Portal API Route
// =============================================================================

import { NextRequest } from 'next/server';
import { createBillingPortalSession } from '@/lib/stripe';
import { serverLogger } from '@/lib/serverLogger';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { errorResponse, successResponse, validationError } from '@/lib/api/response';

async function handlePortalPost(request: NextRequest, context: AuthContext): Promise<Response> {
  const { user, supabase } = context;
  const startTime = Date.now();

  serverLogger.info(
    {
      event: 'stripe.portal.request_started',
      userId: user.id,
    },
    'Billing portal session request received'
  );

  // Get user profile with Stripe customer ID using service layer
  const { UserService } = await import('@/lib/services/userService');
  const userService = new UserService(supabase);

  const profile = await userService.getUserProfile(user.id);

  if (!profile) {
    serverLogger.warn(
      {
        event: 'stripe.portal.no_profile',
        userId: user.id,
      },
      'No user profile found'
    );
    return validationError('User profile not found');
  }

  if (!profile.stripe_customer_id) {
    serverLogger.warn(
      {
        event: 'stripe.portal.no_customer',
        userId: user.id,
      },
      'No Stripe customer found for user'
    );
    return validationError('No Stripe customer found. Please subscribe first.');
  }

  serverLogger.debug(
    {
      event: 'stripe.portal.customer_found',
      userId: user.id,
      customerId: profile.stripe_customer_id,
      tier: profile.tier,
    },
    'Stripe customer found'
  );

  // Create billing portal session
  serverLogger.debug(
    {
      event: 'stripe.portal.session_creating',
      userId: user.id,
      customerId: profile.stripe_customer_id,
    },
    'Creating billing portal session'
  );

  try {
    const session = await createBillingPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${process.env['NEXT_PUBLIC_BASE_URL'] || request.nextUrl.origin}/settings`,
    });

    const duration = Date.now() - startTime;
    serverLogger.info(
      {
        event: 'stripe.portal.session_created',
        userId: user.id,
        customerId: profile.stripe_customer_id,
        sessionId: session.id,
        duration,
      },
      `Billing portal session created in ${duration}ms`
    );

    return successResponse({
      url: session.url,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error(
      {
        event: 'stripe.portal.error',
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: user.id,
        duration,
      },
      'Failed to create billing portal session'
    );

    return errorResponse('Failed to create billing portal session', 500);
  }
}

// Export with authentication middleware and TIER 1 rate limiting
// TIER 1: Payment portal operations (5/min) - critical to prevent abuse
export const POST = withAuth(handlePortalPost, {
  route: '/api/stripe/portal',
  rateLimit: RATE_LIMITS.tier1_auth_payment,
});
