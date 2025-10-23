// =============================================================================
// Admin API: Change User Tier
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { UserTier } from '@/lib/types/subscription';
import { serverLogger } from '@/lib/serverLogger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    serverLogger.info({
      event: 'admin.change_tier.request_started',
    }, 'Admin tier change request received');

    // Get admin user from Supabase session
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
        event: 'admin.change_tier.unauthorized',
        error: authError?.message,
      }, 'Unauthorized tier change attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    const { data: adminProfile, error: adminError } = await supabase
      .from('user_profiles')
      .select('tier')
      .eq('id', user.id)
      .single();

    if (adminError || adminProfile?.tier !== 'admin') {
      serverLogger.warn({
        event: 'admin.change_tier.forbidden',
        userId: user.id,
        userTier: adminProfile?.tier,
        error: adminError?.message,
      }, 'Non-admin attempted tier change');
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    serverLogger.debug({
      event: 'admin.change_tier.admin_verified',
      adminId: user.id,
    }, 'Admin privileges verified');

    // Get request body
    const { userId, tier } = await request.json() as { userId: string; tier: UserTier };

    if (!userId || !tier) {
      serverLogger.warn({
        event: 'admin.change_tier.invalid_request',
        adminId: user.id,
        hasUserId: !!userId,
        hasTier: !!tier,
      }, 'Missing required fields in tier change request');
      return NextResponse.json(
        { error: 'userId and tier are required' },
        { status: 400 }
      );
    }

    if (!['free', 'premium', 'admin'].includes(tier)) {
      serverLogger.warn({
        event: 'admin.change_tier.invalid_tier',
        adminId: user.id,
        targetUserId: userId,
        invalidTier: tier,
      }, 'Invalid tier value provided');
      return NextResponse.json(
        { error: 'Invalid tier. Must be free, premium, or admin' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const { createClient } = await import('@supabase/supabase-js');
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

    // Get target user's current tier
    const { data: targetProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('tier')
      .eq('id', userId)
      .single();

    const oldTier = targetProfile?.tier || 'unknown';

    serverLogger.debug({
      event: 'admin.change_tier.updating',
      adminId: user.id,
      targetUserId: userId,
      oldTier,
      newTier: tier,
    }, `Changing user tier from ${oldTier} to ${tier}`);

    // Update user tier
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ tier })
      .eq('id', userId);

    if (updateError) {
      serverLogger.error({
        event: 'admin.change_tier.update_error',
        adminId: user.id,
        targetUserId: userId,
        tier,
        error: updateError.message,
        code: updateError.code,
      }, 'Failed to update user tier');
      return NextResponse.json(
        { error: 'Failed to update user tier' },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    serverLogger.info({
      event: 'admin.change_tier.success',
      adminId: user.id,
      targetUserId: userId,
      oldTier,
      newTier: tier,
      duration,
    }, `Admin ${user.id} changed user ${userId} tier from ${oldTier} to ${tier}`);

    return NextResponse.json({
      success: true,
      message: `User tier changed to ${tier}`,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    serverLogger.error({
      event: 'admin.change_tier.error',
      error,
      duration,
    }, 'Error changing user tier');
    return NextResponse.json(
      { error: 'Failed to change user tier' },
      { status: 500 }
    );
  }
}
