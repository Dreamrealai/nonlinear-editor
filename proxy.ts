import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { validateEnv } from './lib/validateEnv';
import { getSecurityHeaders } from './lib/security/csp';

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

export async function proxy(request: NextRequest) {
  // Note: CSP is configured in next.config.ts with 'unsafe-inline' to support PostHog scripts
  // We don't use nonces here because when nonces are present, browsers ignore 'unsafe-inline'
  // and PostHog's dynamically injected scripts (pushca.min.js, callable-future.js, etc.)
  // don't have nonce attributes, causing them to be blocked.

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

    // Apply additional security headers (CSP is in next.config.ts)
    getSecurityHeaders().forEach(({ key, value }) => {
      response.headers.set(key, value);
    });

    return response;
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
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
    // Apply additional security headers (CSP is in next.config.ts)
    getSecurityHeaders().forEach(({ key, value }) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  // Redirect authenticated users away from signin
  if (request.nextUrl.pathname === '/signin' && user) {
    const redirectResponse = NextResponse.redirect(new URL('/', request.url));
    // Apply additional security headers (CSP is in next.config.ts)
    getSecurityHeaders().forEach(({ key, value }) => {
      redirectResponse.headers.set(key, value);
    });
    return redirectResponse;
  }

  // Apply additional security headers (CSP is in next.config.ts)
  getSecurityHeaders().forEach(({ key, value }) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  // Apply middleware to all routes for authentication and security headers
  // Exclude static files
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
