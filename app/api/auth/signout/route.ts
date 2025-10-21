import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET() {
  // Handle case where Supabase is not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }

  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL('/signin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
}
