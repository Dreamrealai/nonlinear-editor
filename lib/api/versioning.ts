/**
 * API Versioning Utilities
 *
 * Provides utilities for API versioning, including version negotiation,
 * routing, and deprecation warnings.
 *
 * @module lib/api/versioning
 */

import { NextRequest, NextResponse } from 'next/server';
import { serverLogger } from '@/lib/serverLogger';

/**
 * API version configuration
 */
export interface VersionConfig {
  /** Version number (e.g., '1', '2') */
  version: string;
  /** Is this version stable? */
  stable: boolean;
  /** Is this version deprecated? */
  deprecated: boolean;
  /** Deprecation message if deprecated */
  deprecationMessage?: string;
  /** Sunset date (when this version will be removed) */
  sunsetDate?: string;
}

/**
 * Available API versions
 */
export const API_VERSIONS: Record<string, VersionConfig> = {
  v1: {
    version: '1',
    stable: true,
    deprecated: false,
  },
};

/**
 * Default API version
 */
export const DEFAULT_API_VERSION = 'v1';

/**
 * Supported version header names
 */
export const VERSION_HEADERS = {
  REQUEST: 'X-API-Version',
  RESPONSE: 'X-API-Version',
  DEPRECATION: 'X-API-Deprecation-Warning',
  SUNSET: 'Sunset',
} as const;

/**
 * Extracts API version from request
 * Supports both header-based and path-based versioning
 *
 * @param request - Next.js request object
 * @returns Version string (e.g., 'v1')
 *
 * @example
 * const version = getAPIVersion(request);
 * // Returns 'v1' from /api/v1/projects or X-API-Version header
 */
export function getAPIVersion(request: NextRequest): string {
  // 1. Check header first (preferred method)
  const headerVersion = request.headers.get(VERSION_HEADERS.REQUEST);
  if (headerVersion) {
    const normalized = headerVersion.toLowerCase().startsWith('v')
      ? headerVersion.toLowerCase()
      : `v${headerVersion}`;
    if (API_VERSIONS[normalized]) {
      return normalized;
    }
  }

  // 2. Check URL path
  const pathname = request.nextUrl.pathname;
  const pathMatch = pathname.match(/^\/api\/(v\d+)\//);
  if (pathMatch) {
    const pathVersion = pathMatch[1];
    if (pathVersion && API_VERSIONS[pathVersion]) {
      return pathVersion;
    }
  }

  // 3. Return default version
  return DEFAULT_API_VERSION;
}

/**
 * Validates API version and returns version config
 *
 * @param version - Version string to validate
 * @returns Version config if valid, undefined if invalid
 *
 * @example
 * const config = validateAPIVersion('v1');
 * if (!config) {
 *   return errorResponse('Unsupported API version', 400);
 * }
 */
export function validateAPIVersion(version: string): VersionConfig | undefined {
  return API_VERSIONS[version.toLowerCase()];
}

/**
 * Adds version headers to response
 *
 * @param response - Next.js response object
 * @param version - API version used
 * @returns Modified response with version headers
 *
 * @example
 * const response = NextResponse.json(data);
 * return addVersionHeaders(response, 'v1');
 */
export function addVersionHeaders(response: NextResponse, version: string): NextResponse {
  const config = validateAPIVersion(version);

  if (!config) {
    return response;
  }

  // Add version header
  response.headers.set(VERSION_HEADERS.RESPONSE, version);

  // Add deprecation warning if deprecated
  if (config.deprecated && config.deprecationMessage) {
    response.headers.set(VERSION_HEADERS.DEPRECATION, config.deprecationMessage);
  }

  // Add sunset date if available
  if (config.sunsetDate) {
    response.headers.set(VERSION_HEADERS.SUNSET, config.sunsetDate);
  }

  return response;
}

/**
 * Higher-order function to wrap API route handlers with versioning
 *
 * @param handler - The API route handler function
 * @param options - Versioning options
 * @returns Wrapped handler with version support
 *
 * @example
 * export const GET = withVersioning(async (request, version) => {
 *   // Your versioned route logic
 *   return NextResponse.json({ data: 'Hello World' });
 * });
 *
 * // With specific version requirement
 * export const POST = withVersioning(
 *   async (request, version) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { requiredVersion: 'v1' }
 * );
 */
export function withVersioning(
  handler: (request: NextRequest, version: string) => Promise<NextResponse> | NextResponse,
  options: {
    requiredVersion?: string;
    allowDeprecated?: boolean;
  } = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    const version = getAPIVersion(request);
    const config = validateAPIVersion(version);

    // Check if version is valid
    if (!config) {
      serverLogger.warn(
        {
          event: 'api.invalid_version',
          requestedVersion: version,
          pathname: request.nextUrl.pathname,
        },
        `Invalid API version requested: ${version}`
      );

      return NextResponse.json(
        {
          error: 'Unsupported API version',
          requestedVersion: version,
          supportedVersions: Object.keys(API_VERSIONS),
        },
        { status: 400 }
      );
    }

    // Check if specific version is required
    if (options.requiredVersion && version !== options.requiredVersion) {
      return NextResponse.json(
        {
          error: 'Version mismatch',
          requestedVersion: version,
          requiredVersion: options.requiredVersion,
        },
        { status: 400 }
      );
    }

    // Check if version is deprecated
    if (config.deprecated && !options.allowDeprecated) {
      serverLogger.warn(
        {
          event: 'api.deprecated_version',
          version,
          pathname: request.nextUrl.pathname,
          deprecationMessage: config.deprecationMessage,
        },
        `Deprecated API version used: ${version}`
      );

      // Continue but add deprecation headers (don't block)
    }

    // Call handler
    const response = await handler(request, version);

    // Add version headers
    return addVersionHeaders(response, version);
  };
}

/**
 * Creates a version-aware error response
 *
 * @param message - Error message
 * @param status - HTTP status code
 * @param version - API version
 * @returns NextResponse with error and version headers
 */
export function versionedErrorResponse(
  message: string,
  status: number,
  version: string
): NextResponse {
  const response = NextResponse.json({ error: message }, { status });
  return addVersionHeaders(response, version);
}

/**
 * Creates a version-aware success response
 *
 * @param data - Response data
 * @param version - API version
 * @param status - HTTP status code
 * @returns NextResponse with data and version headers
 */
export function versionedSuccessResponse<T = unknown>(
  data: T,
  version: string,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(data, { status });
  return addVersionHeaders(response, version);
}

/**
 * Deprecates an API version
 *
 * @param version - Version to deprecate
 * @param message - Deprecation message
 * @param sunsetDate - When this version will be removed (ISO 8601 date string)
 *
 * @example
 * deprecateVersion('v1', 'Use v2 instead', '2026-01-01T00:00:00Z');
 */
export function deprecateVersion(version: string, message: string, sunsetDate?: string): void {
  const config = API_VERSIONS[version];
  if (config) {
    config.deprecated = true;
    config.deprecationMessage = message;
    if (sunsetDate) {
      config.sunsetDate = sunsetDate;
    }

    serverLogger.info(
      {
        event: 'api.version_deprecated',
        version,
        message,
        sunsetDate,
      },
      `API version ${version} marked as deprecated`
    );
  }
}
