import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify user authentication
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const assetId = searchParams.get('assetId');
    let storageUrl = searchParams.get('storageUrl');
    const ttl = parseInt(searchParams.get('ttl') || '3600', 10);

    // If assetId is provided, look up the storage URL from the database
    if (assetId) {
      const { data: asset, error: assetError } = await supabase
        .from('assets')
        .select('storage_url, user_id')
        .eq('id', assetId)
        .maybeSingle();

      if (assetError || !asset) {
        return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
      }

      // SECURITY: Verify user owns this asset
      if (asset.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden - asset does not belong to user' }, { status: 403 });
      }

      storageUrl = asset.storage_url;
    }

    if (!storageUrl) {
      return NextResponse.json({ error: 'storageUrl or assetId required' }, { status: 400 });
    }

    // Parse supabase://bucket/path format
    const normalized = storageUrl.replace(/^supabase:\/\//, '');
    const [bucket, ...pathParts] = normalized.split('/');
    const path = pathParts.join('/');

    if (!bucket || !path) {
      return NextResponse.json({ error: 'Invalid storage URL' }, { status: 400 });
    }

    // SECURITY: Verify user owns this asset (folder structure: bucket/userId/...)
    // Skip this check if we already verified via assetId lookup
    if (!assetId) {
      const userFolder = pathParts[0];
      if (userFolder !== user.id) {
        return NextResponse.json({ error: 'Forbidden - asset does not belong to user' }, { status: 403 });
      }
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, ttl);

    if (error) {
      console.error('Failed to sign URL:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signedUrl: data.signedUrl, expiresIn: ttl });
  } catch (error) {
    console.error('Sign URL error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
