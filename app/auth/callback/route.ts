import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Successful email confirmation
      return NextResponse.redirect(new URL(`${next}?confirmed=true`, requestUrl.origin));
    }
  }

  // If there's an error or no code, redirect to sign in
  return NextResponse.redirect(new URL('/signin?error=auth_failed', requestUrl.origin));
}
