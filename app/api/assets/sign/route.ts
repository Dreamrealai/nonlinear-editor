import { safeArrayFirst } from '@/lib/utils/arrayUtils';
import { serverLogger } from '@/lib/serverLogger';
import {
  notFoundResponse,
  forbiddenResponse,
  badRequestResponse,
  errorResponse,
  successResponse,
} from '@/lib/api/response';
import { validateUUID, validateInteger } from '@/lib/validation';
import { withAuth } from '@/lib/api/withAuth';
import type { AuthenticatedHandler } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { createServiceSupabaseClient, isSupabaseServiceConfigured } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type StorageLocation = {
  bucket: string;
  path: string;
  segments: string[];
};

function normalizeStorageUrl(rawUrl: string): StorageLocation | null {
  const trimmed = rawUrl.trim();

  if (trimmed.startsWith('supabase://')) {
    const normalized = trimmed.replace(/^supabase:\/\//, '');
    const parts = normalized.split('/').filter(Boolean);
    if (parts.length < 2) {
      return null;
    }
    const [bucket, ...rest] = parts as [string, ...string[]];
    return {
      bucket,
      path: rest.join('/'),
      segments: rest,
    };
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const decodedSegments = url.pathname
        .split('/')
        .map((segment) => decodeURIComponent(segment))
        .filter((segment): segment is string => segment.length > 0);

      const objectIndex = decodedSegments.indexOf('object');
      if (objectIndex === -1 || decodedSegments.length <= objectIndex + 2) {
        return null;
      }

      const bucket = decodedSegments[objectIndex + 2];
      const rest = decodedSegments.slice(objectIndex + 3);

      if (!bucket || rest.length === 0) {
        return null;
      }

      return {
        bucket,
        path: rest.join('/'),
        segments: rest,
      };
    } catch (error) {
      serverLogger.warn({ error, rawUrl }, 'Failed to parse HTTPS storage URL');
      return null;
    }
  }

  return null;
}

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

    let serviceClient: SupabaseClient<Database> | null = null;
    if (isSupabaseServiceConfigured()) {
      try {
        serviceClient = createServiceSupabaseClient();
      } catch (error) {
        serverLogger.warn(
          { error, event: 'assets.sign.service_client_init_failed' },
          'Failed to initialize Supabase service client, falling back to user client'
        );
      }
    }

    const dbClient: SupabaseClient<Database> = (serviceClient ||
      supabase) as SupabaseClient<Database>;

    if (assetId) {
      const { data: asset, error: assetError } = await dbClient
        .from('assets')
        .select('storage_url, user_id')
        .eq('id', assetId)
        .maybeSingle();

      if (assetError || !asset) {
        return notFoundResponse('Asset');
      }

      if (asset.user_id !== user.id) {
        return forbiddenResponse('Asset does not belong to user');
      }

      storageUrl = asset.storage_url;
    }

    if (!storageUrl) {
      return badRequestResponse('storageUrl or assetId required');
    }

    if (storageUrl.length > 2048) {
      return errorResponse('Storage URL too long (max 2048 characters)', 400, 'storageUrl');
    }

    const location = normalizeStorageUrl(storageUrl);

    if (!location) {
      return badRequestResponse('Invalid storage URL');
    }

    const { bucket, path, segments } = location;

    if (!assetId) {
      const userFolder = safeArrayFirst(segments);
      if (!userFolder || userFolder !== user.id) {
        return forbiddenResponse('Asset does not belong to user');
      }
    }

    const storageClient: SupabaseClient<Database> = (serviceClient ||
      supabase) as SupabaseClient<Database>;
    const { data, error } = await storageClient.storage.from(bucket).createSignedUrl(path, ttl);

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
    const response = successResponse({ signedUrl: data.signedUrl, expiresIn: ttl });

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
