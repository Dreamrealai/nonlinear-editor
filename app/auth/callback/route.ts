import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get('code');
    const next = requestUrl.searchParams.get('next') || '/';

    if (code) {
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        // Successful email confirmation
        serverLogger.info(
          {
            event: 'auth.callback.success',
            next,
          },
          'Authentication callback successful'
        );
        return NextResponse.redirect(new URL(`${next}?confirmed=true`, requestUrl.origin));
      }

      // Log authentication error
      serverLogger.warn(
        {
          event: 'auth.callback.exchange_failed',
          error: error.message,
          code: error.name,
        },
        'Failed to exchange code for session'
      );
    } else {
      serverLogger.warn(
        {
          event: 'auth.callback.no_code',
        },
        'Auth callback received without code parameter'
      );
    }

    // If there's an error or no code, redirect to sign in
    return NextResponse.redirect(new URL('/signin?error=auth_failed', requestUrl.origin));
  } catch (error) {
    // Log unexpected errors
    serverLogger.error(
      {
        event: 'auth.callback.error',
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Unexpected error in auth callback'
    );

    // Redirect to sign in with error
    const requestUrl = new URL(request.url);
    return NextResponse.redirect(new URL('/signin?error=auth_failed', requestUrl.origin));
  }
}
