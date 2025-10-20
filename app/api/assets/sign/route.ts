import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const storageUrl = searchParams.get('storageUrl');
    const ttl = parseInt(searchParams.get('ttl') || '3600', 10);

    if (!storageUrl) {
      return NextResponse.json({ error: 'storageUrl required' }, { status: 400 });
    }

    // Parse supabase://bucket/path format
    const normalized = storageUrl.replace(/^supabase:\/\//, '');
    const [bucket, ...pathParts] = normalized.split('/');
    const path = pathParts.join('/');

    if (!bucket || !path) {
      return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttl);

    if (error) {
      console.error('Failed to sign URL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Sign URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
