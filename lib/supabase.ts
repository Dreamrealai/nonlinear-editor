/**
 * Supabase Client Factory
 *
 * Provides three types of Supabase clients for different contexts in Next.js 15.
 *
 * Client Types:
 * 1. Browser Client: For Client Components and browser JavaScript
 *    - Uses anon key (public, safe to expose)
 *    - Respects Row Level Security (RLS)
 *    - Manages auth state in browser
 *
 * 2. Server Client: For Server Components and API Routes
 *    - Uses anon key with SSR cookie handling
 *    - Respects RLS
 *    - Reads session from httpOnly cookies
 *
 * 3. Service Role Client: For admin operations and API routes
 *    - Uses service role key (NEVER expose to client)
 *    - Bypasses RLS (full database access)
 *    - Used for system operations like webhook handling
 *
 * Environment Variables:
 * - NEXT_PUBLIC_SUPABASE_URL: Supabase project URL (public)
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY: Anon key for client/server (public)
 * - SUPABASE_SERVICE_ROLE_KEY: Service role key for admin (secret)
 *
 * Configuration Checks:
 * - isSupabaseConfigured(): Check if anon key available
 * - isSupabaseServiceConfigured(): Check if service role available
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { CookieOptions } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Define Logger interface matching serverLogger structure
interface Logger {
  warn: (context: Record<string, unknown>, message: string) => void;
  error?: (context: Record<string, unknown>, message: string) => void;
  info?: (context: Record<string, unknown>, message: string) => void;
  debug?: (context: Record<string, unknown>, message: string) => void;
}

// Conditional import of serverLogger for server-only contexts
// Cannot use serverLogger in Edge Runtime or client components
let serverLogger: Logger;
if (
  typeof window === 'undefined' &&
  typeof (globalThis as unknown as { EdgeRuntime?: string }).EdgeRuntime === 'undefined'
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    serverLogger = require('./serverLogger').serverLogger;
  } catch {
    // Fallback to console if serverLogger is not available
    serverLogger = console as Logger;
  }
} else {
  // Use console in browser/edge contexts
  serverLogger = console as Logger;
}

const missingPublicConfigMessage =
  'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable Supabase-backed features.';

const missingServiceConfigMessage =
  'Missing Supabase service role env vars. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_SECRET to run privileged operations.';

/**
 * Module-level environment variable references
 * Captured at module load time but checked at runtime for availability
 * Trimmed to remove any trailing newlines or whitespace that may cause issues
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_SECRET
)?.trim();

/**
 * Checks if public Supabase configuration is available
 *
 * Used to avoid creating clients when env vars are missing (development mode,
 * pre-deployment validation, etc.)
 *
 * @returns true if URL and anon key are set
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

/**
 * Checks if service role configuration is available
 *
 * Service role key enables admin operations (bypasses RLS).
 * Required for webhooks, background tasks, system operations.
 *
 * @returns true if URL and service role key are set
 */
export function isSupabaseServiceConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_SECRET)
  );
}

/**
 * Creates Supabase client for browser/Client Components
 *
 * Usage: Client Components, useEffect hooks, browser event handlers
 *
 * Features:
 * - Automatic session management (auth state sync across tabs)
 * - Respects Row Level Security policies
 * - Stores session in localStorage
 * - Safe to use with anon key (public)
 *
 * Security:
 * - Never use this with service role key
 * - RLS policies protect data access
 * - User can only access their own data (if RLS configured correctly)
 *
 * @returns Browser Supabase client
 * @throws Error if env vars not configured
 *
 * @example
 * // In Client Component
 * 'use client';
 * import { createBrowserSupabaseClient } from '@/lib/supabase';
 *
 * export default function Component() {
 *   const supabase = createBrowserSupabaseClient();
 *   const { data } = await supabase.from('projects').select('*');
 * }
 */
export const createBrowserSupabaseClient = (): ReturnType<typeof createBrowserClient> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(missingPublicConfigMessage);
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

/**
 * Creates Supabase client for server-side rendering
 *
 * Usage: Server Components, Server Actions, API Routes
 *
 * Features:
 * - Reads session from httpOnly cookies (secure)
 * - Respects Row Level Security policies
 * - Works in Server Components without explicit auth
 * - Cookie-based session management
 *
 * Cookie Handling:
 * - get: Reads cookies from Next.js cookies() store
 * - set: Updates cookies (may fail in Server Components, gracefully handled)
 * - remove: Deletes cookies (may fail in Server Components, gracefully handled)
 *
 * Error Handling:
 * - Cookie mutations fail silently in read-only contexts (Server Components)
 * - Warnings logged for debugging
 * - Client should handle auth state changes in mutable contexts (Route Handlers)
 *
 * @returns Server Supabase client with cookie integration
 * @throws Error if env vars not configured
 *
 * @example
 * // In Server Component
 * import { createServerSupabaseClient } from '@/lib/supabase';
 *
 * export default async function Page() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data: user } = await supabase.auth.getUser();
 *   // ... render with user data
 * }
 *
 * @example
 * // In API Route
 * export async function GET() {
 *   const supabase = await createServerSupabaseClient();
 *   const { data } = await supabase.from('projects').select('*');
 *   return NextResponse.json(data);
 * }
 */
export const createServerSupabaseClient = async (): Promise<
  ReturnType<typeof createServerClient>
> => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(missingPublicConfigMessage);
  }

  // Dynamic import avoids bundling next/headers in client bundle
  // Next.js will tree-shake this in client code
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      // Read cookie value from Next.js cookie store
      get(name: string): string | undefined {
        return cookieStore.get(name)?.value;
      },

      // Set cookie (may fail in Server Components - read-only context)
      set(name: string, value: string, options: CookieOptions): void {
        try {
          cookieStore.set({ name, value, ...options });
        } catch (error) {
          // Server Components can't mutate cookies, but Route Handlers can
          // Log warning for debugging but don't crash
          serverLogger.warn(
            { error, cookieName: name },
            'Failed to set cookie in server component context'
          );
        }
      },

      // Remove cookie (may fail in Server Components - read-only context)
      remove(name: string, options: CookieOptions): void {
        try {
          cookieStore.delete({ name, ...options });
        } catch (error) {
          // Log warning but continue (same rationale as set)
          serverLogger.warn(
            { error, cookieName: name },
            'Failed to remove cookie in server component context'
          );
        }
      },
    },
  });
};

/**
 * Creates Supabase client with service role (admin privileges)
 *
 * Usage: Webhooks, background tasks, system operations, admin APIs
 *
 * ⚠️ SECURITY WARNING ⚠️
 * - NEVER use in Client Components or expose to browser
 * - Bypasses ALL Row Level Security policies
 * - Has full database access (read/write/delete any data)
 * - Use ONLY in secure server contexts
 *
 * Features:
 * - Full database access (no RLS)
 * - Can read/write any user's data
 * - Can validate any auth token via auth.getUser(token)
 * - No session management (stateless)
 *
 * Common Use Cases:
 * - Webhook handlers (external API callbacks)
 * - Background task processing (Edge Functions)
 * - User lookup by token (auth.getUser)
 * - System data mutations (bypassing user permissions)
 *
 * Configuration:
 * - No session persistence (stateless operations)
 * - No token refresh (short-lived operations)
 * - No URL session detection (server-only)
 *
 * @returns Service role Supabase client (admin privileges)
 * @throws Error if service role key not configured
 *
 * @example
 * // In Webhook Handler
 * export async function POST(req: NextRequest) {
 *   const supabase = createServiceSupabaseClient();
 *   // Bypass RLS to update task from external webhook
 *   await supabase.from('tasks').update({ status: 'done' }).eq('id', taskId);
 * }
 *
 * @example
 * // In Edge Function
 * const supabase = createClient(url, serviceRoleKey);
 * // Process background task with full database access
 * await supabase.from('renders').insert({ ... });
 */
export const createServiceSupabaseClient = (): SupabaseClient<Database> => {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(missingServiceConfigMessage);
  }

  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false, // No token refresh (stateless operations)
      detectSessionInUrl: false, // No URL-based session detection (server-only)
      persistSession: false, // No session persistence (each operation is independent)
    },
    global: {
      headers: {
        'x-application-name': 'genai-video-production',
      },
    },
  });
};

/**
 * Ensures a URL has the https:// protocol
 *
 * In some cases, Supabase's getPublicUrl() may return URLs without the protocol.
 * This utility ensures all URLs have the correct https:// prefix.
 *
 * @param url - URL to normalize (may or may not include protocol)
 * @returns URL with https:// protocol
 *
 * @example
 * ensureHttpsProtocol('wrximmuaibfjmjrfriej.supabase.co/storage/...')
 * // Returns: 'https://wrximmuaibfjmjrfriej.supabase.co/storage/...'
 *
 * ensureHttpsProtocol('https://wrximmuaibfjmjrfriej.supabase.co/storage/...')
 * // Returns: 'https://wrximmuaibfjmjrfriej.supabase.co/storage/...'
 */
export const ensureHttpsProtocol = (url: string): string => {
  if (!url) return url;

  // If URL already has a protocol, return as-is
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }

  // Add https:// protocol
  return `https://${url}`;
};
