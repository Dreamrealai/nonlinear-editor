/**
 * CORS (Cross-Origin Resource Sharing) Middleware
 *
 * Provides explicit CORS configuration for API routes.
 * By default, enforces same-origin policy with configurable exceptions.
 *
 * Security Features:
 * - Deny-by-default policy
 * - Explicit origin validation
 * - Configurable allowed origins
 * - Proper preflight handling
 * - Security headers included
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration options
 */
export interface CORSOptions {
  /**
   * Allowed origins. If not specified, only same-origin requests are allowed.
   * Use '*' to allow all origins (NOT RECOMMENDED for production).
   */
  allowedOrigins?: string[];

  /**
   * Allowed HTTP methods
   * @default ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']
   */
  allowedMethods?: string[];

  /**
   * Allowed headers
   * @default ['Content-Type', 'Authorization']
   */
  allowedHeaders?: string[];

  /**
   * Exposed headers
   * @default ['Content-Length', 'Content-Type']
   */
  exposedHeaders?: string[];

  /**
   * Allow credentials (cookies, authorization headers)
   * @default false
   */
  credentials?: boolean;

  /**
   * Max age for preflight cache (in seconds)
   * @default 86400 (24 hours)
   */
  maxAge?: number;
}

/**
 * Default CORS configuration - Same-origin only (most secure)
 */
const DEFAULT_CORS_OPTIONS: Required<CORSOptions> = {
  allowedOrigins: [], // Empty = same-origin only
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  credentials: false,
  maxAge: 86400, // 24 hours
};

/**
 * Checks if origin is allowed based on configuration
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    // No origin header = same-origin request
    return true;
  }

  // Allow all origins (not recommended for production)
  if (allowedOrigins.includes('*')) {
    return true;
  }

  // Check if origin is in allowed list
  return allowedOrigins.includes(origin);
}

/**
 * Gets the base URL from environment for same-origin check
 */
function getBaseURL(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || '';
}

/**
 * Creates CORS headers for the response
 */
function createCORSHeaders(request: NextRequest, options: Required<CORSOptions>): Headers {
  const headers = new Headers();
  const origin = request.headers.get('origin');
  const baseURL = getBaseURL();

  // Determine if this origin is allowed
  const allowed = isOriginAllowed(origin, options.allowedOrigins);

  if (!allowed && origin && baseURL && origin !== new URL(baseURL).origin) {
    // Origin not allowed - return minimal headers
    return headers;
  }

  // Set Access-Control-Allow-Origin
  if (origin && allowed) {
    if (options.allowedOrigins.includes('*')) {
      headers.set('Access-Control-Allow-Origin', '*');
    } else {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Vary', 'Origin');
    }
  }

  // Set Access-Control-Allow-Methods
  headers.set('Access-Control-Allow-Methods', options.allowedMethods.join(', '));

  // Set Access-Control-Allow-Headers
  headers.set('Access-Control-Allow-Headers', options.allowedHeaders.join(', '));

  // Set Access-Control-Expose-Headers
  if (options.exposedHeaders.length > 0) {
    headers.set('Access-Control-Expose-Headers', options.exposedHeaders.join(', '));
  }

  // Set Access-Control-Allow-Credentials
  if (options.credentials) {
    headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Set Access-Control-Max-Age (for preflight caching)
  headers.set('Access-Control-Max-Age', options.maxAge.toString());

  return headers;
}

/**
 * CORS middleware for API routes
 *
 * @param request - Next.js request object
 * @param options - CORS configuration options
 * @returns NextResponse with CORS headers or null if request is not allowed
 *
 * @example
 * ```ts
 * // Same-origin only (default)
 * const corsCheck = corsMiddleware(request);
 * if (corsCheck) return corsCheck;
 *
 * // Allow specific origins
 * const corsCheck = corsMiddleware(request, {
 *   allowedOrigins: ['https://example.com', 'https://app.example.com']
 * });
 * if (corsCheck) return corsCheck;
 * ```
 */
export function corsMiddleware(
  request: NextRequest,
  options: CORSOptions = {}
): NextResponse | null {
  const config = { ...DEFAULT_CORS_OPTIONS, ...options };
  const origin = request.headers.get('origin');
  const baseURL = getBaseURL();

  // Handle preflight requests (OPTIONS method)
  if (request.method === 'OPTIONS') {
    const headers = createCORSHeaders(request, config);
    return new NextResponse(null, { status: 204, headers });
  }

  // Check if origin is allowed
  const allowed = isOriginAllowed(origin, config.allowedOrigins);

  // If origin is present and not allowed, reject the request
  if (origin && !allowed && baseURL && origin !== new URL(baseURL).origin) {
    return NextResponse.json(
      { error: 'CORS policy violation: Origin not allowed' },
      { status: 403 }
    );
  }

  // Origin is allowed or same-origin - return null to continue processing
  return null;
}

/**
 * Higher-order function to wrap API route handlers with CORS
 *
 * @param handler - The API route handler function
 * @param options - CORS configuration options
 * @returns Wrapped handler with CORS support
 *
 * @example
 * ```ts
 * export const GET = withCORS(async (request) => {
 *   return NextResponse.json({ data: 'Hello World' });
 * });
 *
 * // With custom options
 * export const POST = withCORS(
 *   async (request) => {
 *     return NextResponse.json({ success: true });
 *   },
 *   { allowedOrigins: ['https://example.com'] }
 * );
 * ```
 */
export function withCORS(
  handler: (request: NextRequest) => Promise<NextResponse> | NextResponse,
  options: CORSOptions = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const config = { ...DEFAULT_CORS_OPTIONS, ...options };

    // Check CORS
    const corsResponse = corsMiddleware(request, config);
    if (corsResponse) {
      return corsResponse;
    }

    // Continue with handler
    const response = await handler(request);

    // Add CORS headers to response
    const corsHeaders = createCORSHeaders(request, config);
    corsHeaders.forEach((value, key) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Common CORS configurations
 */
export const CORSPresets = {
  /**
   * Same-origin only (most secure)
   */
  sameOrigin: (): CORSOptions => ({
    allowedOrigins: [],
    credentials: false,
  }),

  /**
   * Allow all origins (NOT RECOMMENDED for production)
   */
  allowAll: (): CORSOptions => ({
    allowedOrigins: ['*'],
    credentials: false,
  }),

  /**
   * Allow specific trusted origins with credentials
   */
  trustedOrigins: (origins: string[]): CORSOptions => ({
    allowedOrigins: origins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  }),

  /**
   * Public API (allow all origins, no credentials)
   */
  publicAPI: (): CORSOptions => ({
    allowedOrigins: ['*'],
    credentials: false,
    allowedMethods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  }),
};
