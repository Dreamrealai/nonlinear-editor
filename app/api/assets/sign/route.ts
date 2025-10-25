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

// Log route initialization at module load time
serverLogger.info(
  {
    event: 'route.init',
    route: '/api/assets/sign',
    timestamp: new Date().toISOString(),
  },
  'Asset sign route module loaded'
);

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

  serverLogger.info(
    {
      event: 'assets.sign.request_received',
      userId: user.id,
      assetId: assetId || 'none',
      hasStorageUrl: !!storageUrl,
      ttl: ttlParam,
      url: request.url,
    },
    'Processing signed URL request'
  );

  try {
    // Validate and parse TTL
    const ttl = parseInt(ttlParam, 10);
    if (isNaN(ttl)) {
      serverLogger.warn(
        {
          event: 'assets.sign.invalid_ttl',
          ttlParam,
          userId: user.id,
        },
        'Invalid TTL parameter'
      );
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
      serverLogger.debug(
        {
          event: 'assets.sign.fetching_asset',
          assetId,
          userId: user.id,
        },
        'Fetching asset from database'
      );

      const { data: asset, error: assetError } = await dbClient
        .from('assets')
        .select('storage_url, user_id')
        .eq('id', assetId)
        .maybeSingle();

      if (assetError || !asset) {
        serverLogger.warn(
          {
            event: 'assets.sign.asset_not_found',
            assetId,
            userId: user.id,
            error: assetError?.message,
          },
          'Asset not found in database'
        );
        return notFoundResponse('Asset');
      }

      if (asset.user_id !== user.id) {
        serverLogger.warn(
          {
            event: 'assets.sign.unauthorized_asset',
            assetId,
            userId: user.id,
            assetOwnerId: asset.user_id,
          },
          'User does not own asset'
        );
        return forbiddenResponse('Asset does not belong to user');
      }

      storageUrl = asset.storage_url;
      serverLogger.debug(
        {
          event: 'assets.sign.asset_fetched',
          assetId,
          hasStorageUrl: !!storageUrl,
        },
        'Asset fetched successfully'
      );
    }

    if (!storageUrl) {
      serverLogger.warn(
        {
          event: 'assets.sign.missing_storage_url',
          userId: user.id,
          assetId: assetId || 'none',
        },
        'No storage URL provided'
      );
      return badRequestResponse('storageUrl or assetId required');
    }

    if (storageUrl.length > 2048) {
      serverLogger.warn(
        {
          event: 'assets.sign.storage_url_too_long',
          userId: user.id,
          urlLength: storageUrl.length,
        },
        'Storage URL exceeds maximum length'
      );
      return errorResponse('Storage URL too long (max 2048 characters)', 400, 'storageUrl');
    }

    serverLogger.debug(
      {
        event: 'assets.sign.normalizing_url',
        urlPrefix: storageUrl.substring(0, 50),
        urlLength: storageUrl.length,
      },
      'Normalizing storage URL'
    );

    const location = normalizeStorageUrl(storageUrl);

    if (!location) {
      serverLogger.warn(
        {
          event: 'assets.sign.invalid_storage_url',
          userId: user.id,
          urlPrefix: storageUrl.substring(0, 100),
        },
        'Failed to parse storage URL'
      );
      return badRequestResponse('Invalid storage URL');
    }

    const { bucket, path, segments } = location;
    serverLogger.debug(
      {
        event: 'assets.sign.url_normalized',
        bucket,
        pathPrefix: path.substring(0, 50),
        segmentCount: segments.length,
      },
      'Storage URL normalized successfully'
    );

    if (!assetId) {
      const userFolder = safeArrayFirst(segments);
      if (!userFolder || userFolder !== user.id) {
        return forbiddenResponse('Asset does not belong to user');
      }
    }

    const storageClient: SupabaseClient<Database> = (serviceClient ||
      supabase) as SupabaseClient<Database>;

    serverLogger.debug(
      {
        event: 'assets.sign.creating_signed_url',
        bucket,
        pathPrefix: path.substring(0, 50),
        ttl,
        usingServiceClient: !!serviceClient,
      },
      'Creating signed URL with Supabase Storage'
    );

    const { data, error } = await storageClient.storage.from(bucket).createSignedUrl(path, ttl);

    if (error) {
      serverLogger.error(
        {
          error,
          errorMessage: error.message,
          bucket,
          path: path.substring(0, 50) + '...',
          ttl,
          assetId: assetId || 'none',
          userId: user.id,
          event: 'assets.sign.storage_error',
        },
        'Failed to sign URL with Supabase Storage'
      );

      // Fallback: Return the storage URL directly if it's already public
      // This allows the client to handle the error gracefully
      if (storageUrl.startsWith('http://') || storageUrl.startsWith('https://')) {
        serverLogger.warn(
          {
            event: 'assets.sign.fallback_to_original_url',
            assetId: assetId || 'none',
            userId: user.id,
          },
          'Returning original storage URL as fallback'
        );

        // Return the original URL with a warning flag
        const response = successResponse({
          signedUrl: storageUrl,
          expiresIn: ttl,
          fallback: true,
          warning: 'URL signing failed, returning original URL',
        });

        response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        response.headers.set('Pragma', 'no-cache');
        response.headers.set('Expires', '0');
        response.headers.set('Vary', 'Cookie, Authorization');

        return response;
      }

      return errorResponse(error.message, 500);
    }

    serverLogger.info(
      {
        bucket,
        ttl,
        assetId: assetId || 'none',
        userId: user.id,
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
    serverLogger.error(
      {
        error,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        userId: user.id,
        assetId: assetId || 'none',
        hasStorageUrl: !!storageUrl,
        event: 'assets.sign.unhandled_error',
      },
      'Unhandled error in sign URL handler'
    );
    return errorResponse('Failed to generate signed URL', 500);
  }
};

const signOptions = {
  route: '/api/assets/sign',
  rateLimit: RATE_LIMITS.tier3_status_read,
};

export const GET = withAuth(handleSignUrl, signOptions);

// Log route export confirmation
serverLogger.info(
  {
    event: 'route.exported',
    route: '/api/assets/sign',
    method: 'GET',
    hasHandler: !!GET,
    timestamp: new Date().toISOString(),
  },
  'GET handler exported for /api/assets/sign'
);
