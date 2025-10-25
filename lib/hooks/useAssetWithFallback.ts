/**
 * useAssetWithFallback Hook
 *
 * Handles asset loading with graceful fallbacks for signing failures.
 * Provides retry logic, fallback URLs, and comprehensive error handling.
 *
 * @module lib/hooks/useAssetWithFallback
 */
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { signedUrlCache } from '../signedUrlCache';
import { retryWithBackoff, ASSET_RETRY_OPTIONS } from '../utils/retryUtils';
import { browserLogger } from '../browserLogger';
import { createBrowserSupabaseClient } from '../supabase';
import type { AssetRow } from '@/types/assets';

/**
 * Asset loading state
 */
export type AssetLoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Error types for asset loading
 */
export type AssetErrorType =
  | 'not_found' // Asset deleted or doesn't exist
  | 'forbidden' // Permission denied
  | 'signing_failed' // Failed to sign URL
  | 'network_error' // Network/connection issue
  | 'unknown'; // Other errors

/**
 * Asset error information
 */
export interface AssetError {
  type: AssetErrorType;
  message: string;
  canRetry: boolean;
  originalError?: unknown;
}

/**
 * Asset URL with metadata
 */
export interface AssetUrlResult {
  /** Signed or fallback URL for the asset */
  url: string | null;
  /** Current loading state */
  state: AssetLoadingState;
  /** Error information if loading failed */
  error: AssetError | null;
  /** Whether this is a fallback URL (vs signed URL) */
  isFallback: boolean;
  /** Retry the asset loading */
  retry: () => void;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Options for useAssetWithFallback
 */
export interface UseAssetWithFallbackOptions {
  /** TTL for signed URLs in seconds (default: 3600) */
  ttl?: number;
  /** Enable automatic retries (default: true) */
  enableRetry?: boolean;
  /** Enable fallback to public URLs (default: true) */
  enableFallback?: boolean;
  /** Callback when URL is loaded successfully */
  onSuccess?: (url: string, isFallback: boolean) => void;
  /** Callback when loading fails */
  onError?: (error: AssetError) => void;
  /** Enable debug logging */
  enableLogging?: boolean;
}

/**
 * Generate a fallback public URL for an asset
 * This attempts to construct a public URL directly from the storage path
 */
function generateFallbackUrl(asset: AssetRow): string | null {
  try {
    const supabase = createBrowserSupabaseClient();

    // Extract storage path from storage_url
    // Format: supabase://bucket/path/to/file
    const storageUrl = asset.storage_url;
    if (!storageUrl || !storageUrl.startsWith('supabase://')) {
      return null;
    }

    const pathParts = storageUrl.replace('supabase://', '').split('/');
    if (pathParts.length < 2) {
      return null;
    }

    const [bucket, ...pathSegments] = pathParts;
    const path = pathSegments.join('/');

    // Get public URL from Supabase
    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    browserLogger.warn(
      {
        event: 'asset.fallback_url_generation_failed',
        error,
        assetId: asset.id,
      },
      'Failed to generate fallback URL'
    );
    return null;
  }
}

/**
 * Classify error type for better error handling
 */
function classifyError(error: unknown): AssetError {
  if (error && typeof error === 'object') {
    // Check for HTTP status codes
    if ('status' in error) {
      const status = (error as { status: number }).status;

      if (status === 404) {
        return {
          type: 'not_found',
          message: 'Asset not found. It may have been deleted.',
          canRetry: false,
          originalError: error,
        };
      }

      if (status === 403) {
        return {
          type: 'forbidden',
          message: 'Access denied to this asset.',
          canRetry: false,
          originalError: error,
        };
      }

      if (status >= 500) {
        return {
          type: 'signing_failed',
          message: 'Server error while loading asset. Please try again.',
          canRetry: true,
          originalError: error,
        };
      }
    }

    // Check for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        type: 'network_error',
        message: 'Network error. Please check your connection.',
        canRetry: true,
        originalError: error,
      };
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: error instanceof Error ? error.message : 'Failed to load asset',
    canRetry: true,
    originalError: error,
  };
}

/**
 * Hook to load asset URLs with graceful fallback handling
 *
 * Attempts to:
 * 1. Get signed URL from cache or API
 * 2. Retry on transient failures
 * 3. Fall back to public URL if signing fails
 * 4. Provide detailed error information
 *
 * @param asset - Asset to load URL for (null if not loaded yet)
 * @param options - Configuration options
 * @returns Asset URL result with state and controls
 *
 * @example
 * ```typescript
 * function AssetPreview({ asset }: { asset: AssetRow | null }) {
 *   const { url, state, error, isFallback, retry } = useAssetWithFallback(asset, {
 *     onError: (error) => console.error('Asset failed to load:', error.message)
 *   });
 *
 *   if (state === 'loading') return <Spinner />;
 *   if (state === 'error') return <ErrorUI error={error} onRetry={retry} />;
 *   if (!url) return <Placeholder />;
 *
 *   return <img src={url} alt="Asset" />;
 * }
 * ```
 */
export function useAssetWithFallback(
  asset: AssetRow | null,
  options: UseAssetWithFallbackOptions = {}
): AssetUrlResult {
  const {
    ttl = 3600,
    enableRetry = true,
    enableFallback = true,
    onSuccess,
    onError,
    enableLogging = process.env.NODE_ENV === 'development',
  } = options;

  const [state, setState] = useState<AssetLoadingState>('idle');
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<AssetError | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  // Track retry counter to force re-fetching
  const [retryCount, setRetryCount] = useState(0);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadAssetUrl = useCallback(async () => {
    if (!asset) {
      setState('idle');
      setUrl(null);
      setError(null);
      setIsFallback(false);
      return;
    }

    // Reset state for new load
    setState('loading');
    setError(null);
    setUrl(null);
    setIsFallback(false);

    try {
      if (enableLogging) {
        browserLogger.debug(
          {
            event: 'asset.load_start',
            assetId: asset.id,
            enableRetry,
            enableFallback,
          },
          'Starting asset URL load'
        );
      }

      // Attempt to get signed URL with retry
      const loadSignedUrl = async (): Promise<string> => {
        const signedUrl = await signedUrlCache.get(asset.id, undefined, ttl);

        if (!signedUrl) {
          throw new Error('Asset not found');
        }

        return signedUrl;
      };

      let loadedUrl: string;
      let usedFallback = false;

      try {
        // Try signed URL with retry if enabled
        if (enableRetry) {
          loadedUrl = await retryWithBackoff(loadSignedUrl, ASSET_RETRY_OPTIONS);
        } else {
          loadedUrl = await loadSignedUrl();
        }
      } catch (signError) {
        // Classify the error
        const classifiedError = classifyError(signError);

        // If error is not retryable or fallback is disabled, throw
        if (!enableFallback || !classifiedError.canRetry) {
          throw signError;
        }

        if (enableLogging) {
          browserLogger.warn(
            {
              event: 'asset.signed_url_failed',
              assetId: asset.id,
              error: signError,
              errorType: classifiedError.type,
            },
            'Signed URL failed, attempting fallback'
          );
        }

        // Try fallback URL
        const fallbackUrl = generateFallbackUrl(asset);

        if (!fallbackUrl) {
          throw signError; // No fallback available
        }

        loadedUrl = fallbackUrl;
        usedFallback = true;

        if (enableLogging) {
          browserLogger.info(
            {
              event: 'asset.fallback_url_used',
              assetId: asset.id,
            },
            'Using fallback URL'
          );
        }
      }

      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      setState('success');
      setUrl(loadedUrl);
      setIsFallback(usedFallback);

      if (onSuccess) {
        onSuccess(loadedUrl, usedFallback);
      }

      if (enableLogging) {
        browserLogger.debug(
          {
            event: 'asset.load_success',
            assetId: asset.id,
            isFallback: usedFallback,
          },
          'Asset URL loaded successfully'
        );
      }
    } catch (loadError) {
      // Only update state if component is still mounted
      if (!isMountedRef.current) return;

      const classifiedError = classifyError(loadError);

      setState('error');
      setError(classifiedError);

      if (onError) {
        onError(classifiedError);
      }

      browserLogger.error(
        {
          event: 'asset.load_failed',
          assetId: asset?.id,
          error: loadError,
          errorType: classifiedError.type,
        },
        `Asset load failed: ${classifiedError.message}`
      );
    }
  }, [asset, ttl, enableRetry, enableFallback, onSuccess, onError, enableLogging, retryCount]);

  // Load URL when asset changes or retry is triggered
  useEffect(() => {
    void loadAssetUrl();
  }, [loadAssetUrl]);

  const retry = useCallback(() => {
    if (enableLogging) {
      browserLogger.debug(
        {
          event: 'asset.manual_retry',
          assetId: asset?.id,
        },
        'Manual retry triggered'
      );
    }
    setRetryCount((prev) => prev + 1);
  }, [asset?.id, enableLogging]);

  const clearError = useCallback(() => {
    setError(null);
    if (state === 'error') {
      setState('idle');
    }
  }, [state]);

  return {
    url,
    state,
    error,
    isFallback,
    retry,
    clearError,
  };
}
