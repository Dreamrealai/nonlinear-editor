import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateEnv } from './lib/validateEnv';
import {
  generateNonce,
  buildCSPHeader,
  getSecurityHeaders,
  CSP_NONCE_HEADER,
} from './lib/security/csp';

// Validate environment variables on startup (development only)
// This runs once when the middleware module is first loaded
if (process.env.NODE_ENV === 'development') {
  try {
    validateEnv({ throwOnError: false, mode: 'development' });
  } catch (error) {
    // Note: Cannot use serverLogger in middleware (Edge Runtime incompatible)
    console.error('Environment validation failed:', error);
  }
}

export async function middleware(request: NextRequest) {
  // Generate CSP nonce for this request
  const nonce = generateNonce();
  const isDevelopment = process.env.NODE_ENV === 'development';

  // Build CSP header with nonce
  const cspHeader = buildCSPHeader({ nonce, isDevelopment });

  // Check if Supabase is configured - if not, allow all requests through
  // This enables development without Supabase and build-time checks
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Note: Cannot use serverLogger in middleware (Edge Runtime incompatible)
    console.warn('Supabase not configured - skipping auth middleware');
    const response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Apply security headers even when Supabase is not configured
    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set(CSP_NONCE_HEADER, nonce);
    getSecurityHeaders().forEach(({ key, value }) => {
      response.headers.set(key, value);
    });

    return response;
  }

  // Create request headers with CSP nonce
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(CSP_NONCE_HEADER, nonce);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options) {
        request.cookies.set({
          name,
          value,
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value,
          ...options,
        });
      },
      remove(name: string, options) {
        request.cookies.set({
          name,
          value: '',
          ...options,
        });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({
          name,
          value: '',
          ...options,
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /editor routes
  if (request.nextUrl.pathname.startsWith('/editor') && !user) {
    const redirectResponse = NextResponse.redirect(new URL('/signin', request.url));
    // Apply security headers to redirect
    redirectResponse.headers.set('Content-Security-Policy', cspHeader);
    redirectResponse.headers.set(CSP_NONCE_HEADER, nonce);
    getSecurityHeaders().forEach(({ key, value }) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  // Redirect authenticated users away from signin
  if (request.nextUrl.pathname === '/signin' && user) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    // Apply security headers to redirect
    redirectResponse.headers.set('Content-Security-Policy', cspHeader);
    redirectResponse.headers.set(CSP_NONCE_HEADER, nonce);
    getSecurityHeaders().forEach(({ key, value }) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  // Apply security headers to response
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set(CSP_NONCE_HEADER, nonce);
  getSecurityHeaders().forEach(({ key, value }) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  // Apply middleware to all routes for CSP nonce generation
  // Exclude static files, API routes handled separately
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, favicon.svg (favicons)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
