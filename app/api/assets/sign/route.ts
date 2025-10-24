import { NextRequest, NextResponse } from 'next/server';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import { unauthorizedResponse, notFoundResponse, forbiddenResponse, badRequestResponse, errorResponse, withErrorHandling } from '@/lib/api/response';

export const GET = withErrorHandling(async (request: NextRequest) => {
  // SECURITY: Verify user authentication
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return unauthorizedResponse();
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
      return notFoundResponse('Asset');
    }

    // SECURITY: Verify user owns this asset
    if (asset.user_id !== user.id) {
      return forbiddenResponse('Asset does not belong to user');
    }

    storageUrl = asset.storage_url;
  }

  if (!storageUrl) {
    return badRequestResponse('storageUrl or assetId required');
  }

  // Parse supabase://bucket/path format
  const normalized = storageUrl.replace(/^supabase:\/\//, '');
  const [bucket, ...pathParts] = normalized.split('/');
  const path = pathParts.join('/');

  if (!bucket || !path) {
    return badRequestResponse('Invalid storage URL');
  }

  // SECURITY: Verify user owns this asset (folder structure: bucket/userId/...)
  // Skip this check if we already verified via assetId lookup
  if (!assetId) {
    const userFolder = safeArrayFirst(pathParts);
    if (!userFolder || userFolder !== user.id) {
      return forbiddenResponse('Asset does not belong to user');
    }
  }

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, ttl);

  if (error) {
    serverLogger.error({
      error,
      bucket,
      path: path.substring(0, 50) + '...',
      ttl,
      event: 'assets.sign.storage_error'
    }, 'Failed to sign URL');
    return errorResponse(error.message, 500);
  }

  serverLogger.info({
    bucket,
    ttl,
    event: 'assets.sign.success'
  }, 'Signed URL created successfully');

  // Add cache headers to prevent browser caching of signed URLs
  // Signed URLs are time-limited and should not be cached by the browser
  const response = NextResponse.json({ signedUrl: data.signedUrl, expiresIn: ttl });

  // Set cache control headers
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');

  // Add Vary header for proper caching by CDN/proxies
  response.headers.set('Vary', 'Cookie, Authorization');

  return response;
});
