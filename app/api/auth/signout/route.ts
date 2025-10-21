import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// SECURITY: Use POST method to prevent CSRF attacks
export async function POST(request: NextRequest) {
  // Verify origin header to prevent CSRF
  const origin = request.headers.get('origin');
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'http://localhost:3000',
    'http://localhost:3001',
  ].filter(Boolean);

  if (origin && !allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  // Handle case where Supabase is not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
