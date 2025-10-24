/**
 * Content Security Policy (CSP) Utilities
 *
 * Implements nonce-based CSP for Next.js 13+ to allow inline scripts
 * while maintaining security.
 */

/**
 * Generate a cryptographically secure nonce for CSP
 * Uses Web Crypto API which is available in both Node.js and Edge Runtime
 * @returns Base64-encoded nonce string
 */
export function generateNonce(): string {
  // Use Web Crypto API (available in Edge Runtime)
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Buffer.from(array).toString('base64');
}

/**
 * CSP directive builder options
 */
export interface CSPOptions {
  nonce?: string;
  isDevelopment?: boolean;
}

/**
 * Build Content-Security-Policy header value
 *
 * Uses nonce-based approach for scripts to allow Next.js inline scripts
 * while maintaining strict security.
 *
 * Third-party scripts currently allowed:
 * - Vercel Analytics (va.vercel-scripts.com) - Performance monitoring
 * - Web Vitals (imported via npm, no external script needed)
 * - Google Fonts (fonts.googleapis.com, fonts.gstatic.com)
 *
 * @param options - CSP configuration options
 * @returns CSP header value string
 */
export function buildCSPHeader(options: CSPOptions = {}): string {
  const { nonce, isDevelopment = false } = options;

  // Script source with nonce
  const scriptSrc = [
    "'self'",
    // wasm-unsafe-eval required for Next.js SWC (Rust/WASM compiler)
    // This is MUCH safer than unsafe-eval (only allows WebAssembly, not eval())
    "'wasm-unsafe-eval'",
    // Add nonce for inline scripts (Next.js hydration, config, etc.)
    nonce ? `'nonce-${nonce}'` : null,
    // Vercel Analytics (when deployed on Vercel)
    // Allows both script loading and performance data collection
    'https://va.vercel-scripts.com',
    // Development: allow eval for hot reloading
    isDevelopment ? "'unsafe-eval'" : null,
  ]
    .filter(Boolean)
    .join(' ');

  const directives = [
    "default-src 'self'",
    // Script sources with nonce support
    `script-src ${scriptSrc}`,
    // Style sources - keep unsafe-inline for Tailwind CSS-in-JS
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    // Image sources - Supabase storage, data URIs, blob for canvas/video
    "img-src 'self' data: blob: https://*.supabase.co",
    // Media sources - Supabase storage for video/audio assets
    "media-src 'self' blob: https://*.supabase.co",
    // API connections - Supabase, Fal.ai, Google Gemini, Vercel Analytics
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://queue.fal.run https://fal.run https://generativelanguage.googleapis.com https://va.vercel-scripts.com",
    // Font sources - Google Fonts CDN
    "font-src 'self' data: https://fonts.gstatic.com",
    // Prevent object/embed/applet tags
    "object-src 'none'",
    // Restrict base tag
    "base-uri 'self'",
    // Only allow form submissions to same origin
    "form-action 'self'",
    // Prevent all framing
    "frame-ancestors 'none'",
    // Force HTTPS for all resources (production only)
    isDevelopment ? null : 'upgrade-insecure-requests',
  ];

  return directives.filter(Boolean).join('; ');
}

/**
 * Security headers configuration
 *
 * Additional security headers to complement CSP
 */
export function getSecurityHeaders() {
  return [
    {
      key: 'X-Content-Type-Options',
      value: 'nosniff',
    },
    {
      key: 'X-Frame-Options',
      value: 'DENY',
    },
    {
      key: 'X-XSS-Protection',
      value: '1; mode=block',
    },
    {
      key: 'Referrer-Policy',
      value: 'strict-origin-when-cross-origin',
    },
    {
      key: 'Permissions-Policy',
      value: 'camera=(), microphone=(), geolocation=()',
    },
  ];
}

/**
 * Request header key for CSP nonce
 * Used to pass nonce from middleware to Next.js
 */
export const CSP_NONCE_HEADER = 'x-csp-nonce';
