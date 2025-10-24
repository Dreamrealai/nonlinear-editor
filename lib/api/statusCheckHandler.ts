/**
 * Status Check Handler Utilities
 *
 * Provides reusable utilities for handling status check operations in API routes.
 * Reduces code duplication across status-checking endpoints by centralizing:
 * - Authentication verification
 * - Request parameter validation
 * - Response formatting
 * - Error handling
 *
 * Usage:
 * ```typescript
 * import { createStatusCheckHandler, StatusCheckOptions } from '@/lib/api/statusCheckHandler';
 *
 * export const GET = createStatusCheckHandler(async (request, context) => {
 *   const { requestId, projectId } = context.params;
 *   const { user, supabase } = context;
 *
 *   // Your status check logic here
 *   return {
 *     done: true,
 *     result: { ... }
 *   };
 * }, {
 *   requiredParams: ['requestId', 'projectId'],
 *   route: '/api/video/status'
 * });
 * ```
 */

import { NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase';
import { serverLogger } from '@/lib/serverLogger';
import {
  unauthorizedResponse,
  validationError,
  withErrorHandling,
  successResponse,
} from './response';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Context provided to status check handlers
 */
export interface StatusCheckContext {
  /** Authenticated user */
  user: User;
  /** Supabase client with user session */
  supabase: SupabaseClient;
  /** Validated query parameters */
  params: Record<string, string>;
}

/**
 * Configuration for status check handler
 */
export interface StatusCheckOptions {
  /** Route path for logging */
  route: string;
  /** Required query parameter names */
  requiredParams: string[];
  /** Optional parameters (won't throw validation error if missing) */
  optionalParams?: string[];
}

/**
 * Result from status check handler
 */
export interface StatusCheckResult {
  /** Whether the operation is complete */
  done: boolean;
  /** Operation status (for in-progress operations) */
  status?: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Error message if failed */
  error?: string;
  /** Result data when complete */
  [key: string]: unknown;
}

/**
 * Status check handler function type
 */
export type StatusCheckHandler = (
  request: NextRequest,
  context: StatusCheckContext
) => Promise<StatusCheckResult>;

/**
 * Creates a standardized status check API route handler
 *
 * Handles common concerns:
 * - User authentication verification
 * - Query parameter validation
 * - Error handling and logging
 * - Response formatting
 *
 * @param handler - Function containing status check logic
 * @param options - Configuration for required parameters and route
 * @returns Next.js API route handler
 *
 * @example
 * export const GET = createStatusCheckHandler(async (request, { user, supabase, params }) => {
 *   const { requestId } = params;
 *
 *   // Check status with external service
 *   const status = await checkExternalService(requestId);
 *
 *   if (status.completed) {
 *     return {
 *       done: true,
 *       result: status.data
 *     };
 *   }
 *
 *   return {
 *     done: false,
 *     status: status.state,
 *     progress: status.percentage
 *   };
 * }, {
 *   route: '/api/video/status',
 *   requiredParams: ['requestId', 'projectId']
 * });
 */
export function createStatusCheckHandler(
  handler: StatusCheckHandler,
  options: StatusCheckOptions
): (request: NextRequest) => Promise<Response> {
  return withErrorHandling(async (request: NextRequest) => {
    const { route, requiredParams, optionalParams = [] } = options;

    serverLogger.info(
      {
        event: 'status_check.request_started',
        route,
      },
      `Status check request received for ${route}`
    );

    // Create Supabase client and verify authentication
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      serverLogger.warn(
        {
          event: 'status_check.unauthorized',
          route,
          error: authError?.message,
        },
        `Unauthorized status check attempt on ${route}`
      );
      return unauthorizedResponse();
    }

    // Extract and validate query parameters
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};

    // Validate required parameters
    for (const paramName of requiredParams) {
      const paramValue = searchParams.get(paramName);
      if (!paramValue) {
        serverLogger.warn(
          {
            event: 'status_check.validation_error',
            route,
            missingParam: paramName,
            userId: user.id,
          },
          `Missing required parameter: ${paramName}`
        );
        return validationError(`${paramName} is required`, paramName);
      }
      params[paramName] = paramValue;
    }

    // Extract optional parameters
    for (const paramName of optionalParams) {
      const paramValue = searchParams.get(paramName);
      if (paramValue) {
        params[paramName] = paramValue;
      }
    }

    serverLogger.debug(
      {
        event: 'status_check.processing',
        route,
        userId: user.id,
        params,
      },
      'Processing status check request'
    );

    // Execute the status check handler
    const result = await handler(request, {
      user,
      supabase,
      params,
    });

    // Log completion
    if (result.done) {
      if (result.error) {
        serverLogger.error(
          {
            event: 'status_check.completed_with_error',
            route,
            userId: user.id,
            error: result.error,
          },
          `Status check completed with error: ${result.error}`
        );
      } else {
        serverLogger.info(
          {
            event: 'status_check.completed_successfully',
            route,
            userId: user.id,
          },
          'Status check completed successfully'
        );
      }
    } else {
      serverLogger.debug(
        {
          event: 'status_check.in_progress',
          route,
          userId: user.id,
          status: result.status,
          progress: result.progress,
        },
        'Status check - operation still in progress'
      );
    }

    return successResponse(result);
  });
}

/**
 * Helper to create FAL API fetch options with timeout
 *
 * @param falKey - FAL API key
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @returns Fetch options with authorization and timeout
 */
export function createFalFetchOptions(
  falKey: string,
  timeoutMs = 60000
): {
  headers: { Authorization: string };
  signal: AbortSignal;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout((): void => controller.abort(), timeoutMs);

  return {
    headers: {
      Authorization: `Key ${falKey}`,
    },
    signal: controller.signal,
    cleanup: (): void => clearTimeout(timeout),
  };
}

/**
 * Helper to handle FAL API fetch with timeout
 *
 * @param url - URL to fetch
 * @param falKey - FAL API key
 * @param options - Additional fetch options
 * @returns Fetch response
 * @throws Error with timeout message if timeout occurs
 */
export async function fetchWithFalTimeout(
  url: string,
  falKey: string,
  options: { timeoutMs?: number; method?: string } = {}
): Promise<Response> {
  const { timeoutMs = 60000, method = 'GET' } = options;
  const fetchOptions = createFalFetchOptions(falKey, timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: fetchOptions.headers,
      signal: fetchOptions.signal,
    });

    fetchOptions.cleanup();
    return response;
  } catch (error) {
    fetchOptions.cleanup();
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

/**
 * Helper to download file from URL with timeout
 *
 * @param url - URL to download from
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @returns ArrayBuffer of downloaded file
 * @throws Error if download fails or times out
 */
export async function downloadWithTimeout(url: string, timeoutMs = 60000): Promise<ArrayBuffer> {
  const controller = new AbortController();
  const timeout = setTimeout((): void => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Download timeout after ${timeoutMs / 1000}s`);
    }
    throw error;
  }
}

/**
 * Helper to upload buffer to Supabase Storage
 *
 * @param supabase - Supabase client
 * @param bucket - Storage bucket name
 * @param path - Storage path
 * @param buffer - Buffer to upload
 * @param contentType - MIME type
 * @throws Error if upload fails
 */
export async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  path: string,
  buffer: ArrayBuffer | Buffer,
  contentType: string
): Promise<void> {
  const { error: uploadError } = await supabase.storage.from(bucket).upload(path, buffer, {
    contentType,
    upsert: false,
  });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }
}

/**
 * Helper to create asset with automatic cleanup on failure
 *
 * @param supabase - Supabase client
 * @param assetData - Asset data to insert
 * @param storagePath - Storage path to clean up if insert fails
 * @returns Created asset
 * @throws Error if asset creation fails
 */
export async function createAssetWithCleanup<T = Record<string, unknown>>(
  supabase: SupabaseClient,
  assetData: Record<string, unknown>,
  storagePath: string
): Promise<T> {
  const { data: asset, error: assetError } = await supabase
    .from('assets')
    .insert(assetData)
    .select()
    .single();

  if (assetError) {
    // Clean up uploaded file if database insert fails
    const { error: cleanupError } = await supabase.storage.from('assets').remove([storagePath]);

    if (cleanupError) {
      serverLogger.error(
        {
          cleanupError,
          assetError,
          storagePath,
          event: 'status_check.cleanup_failed',
        },
        'Failed to clean up storage after asset creation failure'
      );
      throw new Error(
        `Asset creation failed: ${assetError.message}. Additionally, failed to clean up storage: ${cleanupError.message}`
      );
    }

    throw new Error(`Asset creation failed: ${assetError.message}`);
  }

  // TypeScript cannot infer the type from the database query,
  // so we need to cast it. This is safe because we know the structure
  // matches what we inserted, but the caller should provide the type.
  return asset as T;
}
