// =============================================================================
// Admin API: Change User Tier
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { UserTier } from '@/lib/types/subscription';

export async function POST(request: NextRequest) {
  try {
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
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get request body
    const { userId, tier } = await request.json() as { userId: string; tier: UserTier };

    if (!userId || !tier) {
      return NextResponse.json(
        { error: 'userId and tier are required' },
        { status: 400 }
      );
    }

    if (!['free', 'premium', 'admin'].includes(tier)) {
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

    // Update user tier
    const { error: updateError } = await supabaseAdmin
      .from('user_profiles')
      .update({ tier })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating user tier:', updateError);
      return NextResponse.json(
        { error: 'Failed to update user tier' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `User tier changed to ${tier}`,
    });
  } catch (error) {
    console.error('Error changing user tier:', error);
    return NextResponse.json(
      { error: 'Failed to change user tier' },
      { status: 500 }
    );
  }
}
