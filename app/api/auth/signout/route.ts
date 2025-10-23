import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';
import { withErrorHandling } from '@/lib/api/response';

// SECURITY: Use POST method to prevent CSRF attacks
export const POST = withErrorHandling(async (request: NextRequest) => {
  const startTime = Date.now();

  serverLogger.info({
    event: 'auth.signout.request_started',
  }, 'Sign out request received');

  // Verify origin header to prevent CSRF
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    serverLogger.warn({
      event: 'auth.signout.csrf_blocked',
      origin,
      allowedOrigins,
    }, 'CSRF protection: Invalid origin for sign out');
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // Handle case where Supabase is not configured
  if (!isSupabaseConfigured()) {
    serverLogger.error({
      event: 'auth.signout.config_error',
    }, 'Supabase not configured for sign out');
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();

  // Get user info before signing out for logging
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const { error } = await supabase.auth.signOut();

  if (error) {
    serverLogger.error({
      event: 'auth.signout.error',
      userId,
      error: error.message,
    }, 'Failed to sign out user');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const duration = Date.now() - startTime;
  serverLogger.info({
    event: 'auth.signout.success',
    userId,
    duration,
  }, `User signed out successfully in ${duration}ms`);

  return NextResponse.json({ success: true });
});

