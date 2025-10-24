import { NextResponse } from 'next/server';
import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { serverLogger } from '@/lib/serverLogger';
import {
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
  errorResponse,
} from '@/lib/api/response';
import { validateUUID, validateInteger } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

const handleSignUrl: AuthenticatedHandler = async (request, { user, supabase }) => {
  const searchParams = request.nextUrl.searchParams;
  const assetId = searchParams.get('assetId');
  let storageUrl = searchParams.get('storageUrl');
  const ttlParam = searchParams.get('ttl') || '3600';

  try {
    // Validate and parse TTL
    const ttl = parseInt(ttlParam, 10);
    if (isNaN(ttl)) {
      return errorResponse('TTL must be a valid number', 400, 'ttl');
    }

    // Validate TTL range (1 second to 7 days)
    validateInteger(ttl, 'ttl', { min: 1, max: 604800 });

    // Validate assetId if provided
    if (assetId) {
      validateUUID(assetId, 'assetId');
    }

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

    // Validate storageUrl format (must start with supabase://)
    if (!storageUrl.startsWith('supabase://')) {
      return errorResponse('Invalid storage URL format. Must start with supabase://', 400, 'storageUrl');
    }

    // Validate storageUrl length
    if (storageUrl.length > 1000) {
      return errorResponse('Storage URL too long (max 1000 characters)', 400, 'storageUrl');
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

    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ttl);

    if (error) {
      serverLogger.error(
        {
          error,
          bucket,
          path: path.substring(0, 50) + '...',
          ttl,
          event: 'assets.sign.storage_error',
        },
        'Failed to sign URL'
      );
      return errorResponse(error.message, 500);
    }

    serverLogger.info(
      {
        bucket,
        ttl,
        event: 'assets.sign.success',
      },
      'Signed URL created successfully'
    );

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
  } catch (error) {
    serverLogger.error({ error, userId: user.id }, 'Error in sign URL handler');
    return errorResponse('Failed to generate signed URL', 500);
  }
};

const signOptions = {
  route: '/api/assets/sign',
  rateLimit: RATE_LIMITS.tier3_status_read,
};

export const GET = withAuth(handleSignUrl, signOptions);
