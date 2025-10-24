import type { NextConfig } from 'next';

// Bundle analyzer configuration
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@next/bundle-analyzer')({
        enabled: true,
        openAnalyzer: true,
      })
    : (config: NextConfig) => config;

const nextConfig: NextConfig = {
  // Skip type checking during bundle analysis only
  typescript: {
    ignoreBuildErrors: process.env.ANALYZE === 'true',
  },

  // Production optimizations
  compiler: {
    // Remove console.log in production but keep warnings and errors
    removeConsole:
      process.env.NODE_ENV === 'production'
        ? {
            exclude: ['error', 'warn'],
          }
        : false,
  },

  // Image optimization
  images: {
    // Add Supabase storage domain for optimized images
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/**',
      },
    ],
    // Modern image formats (AVIF first for best compression, fallback to WebP)
    formats: ['image/avif', 'image/webp'],
    // Enable image optimization caching
    minimumCacheTTL: 60 * 60 * 24 * 7, // 7 days
    // Device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    // Image sizes for different layout modes
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Disable static image imports if not using them
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              // Strict script policy - removed unsafe-eval and unsafe-inline
              // Next.js bundles all scripts, so 'self' is sufficient
              // wasm-unsafe-eval required for Next.js SWC (Rust/WASM compiler) and dependencies
              // (@napi-rs/wasm-runtime, @tybys/wasm-util used by Next.js build toolchain)
              // Note: wasm-unsafe-eval is MUCH safer than unsafe-eval as it only allows
              // WebAssembly compilation, not arbitrary JavaScript eval()
              "script-src 'self' 'wasm-unsafe-eval'",
              // Style sources - keep unsafe-inline only for Tailwind v4 CSS-in-JS
              // Google Fonts stylesheets allowed for next/font/google
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Image sources - Supabase storage, data URIs, and blob for canvas/video
              "img-src 'self' data: blob: https://*.supabase.co",
              // Media sources - Supabase storage for video/audio assets
              "media-src 'self' blob: https://*.supabase.co",
              // API connections - Supabase realtime, Fal.ai video, Google Gemini
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://queue.fal.run https://fal.run https://generativelanguage.googleapis.com",
              // Font sources - Google Fonts CDN for optimized font delivery
              "font-src 'self' data: https://fonts.gstatic.com",
              // Prevent object/embed/applet tags (no Flash, Java, etc.)
              "object-src 'none'",
              // Restrict base tag to prevent base tag hijacking
              "base-uri 'self'",
              // Only allow form submissions to same origin
              "form-action 'self'",
              // Prevent all framing (stronger than X-Frame-Options)
              "frame-ancestors 'none'",
              // Force HTTPS for all resources
              'upgrade-insecure-requests',
              // Block all plugins (Flash, Java, Silverlight, etc.)
              "plugin-types 'none'",
              // Require SRI for scripts and styles (when using external CDNs)
              // Disabled for now as Next.js handles bundling
              // "require-sri-for script style",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Optimize bundle and performance
  experimental: {
    optimizePackageImports: [
      '@supabase/supabase-js',
      'zustand',
      'clsx',
      'lucide-react',
      'react-hot-toast',
      'web-vitals',
    ],
  },

  // Modularize imports for better tree-shaking
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },

  // Production-only optimizations
  reactStrictMode: true,

  // Disable x-powered-by header
  poweredByHeader: false,

  // Production build optimizations
  compress: true, // Enable compression (gzip)
  generateEtags: true, // Enable ETags for caching

  // Disable source maps in production for smaller bundle size
  productionBrowserSourceMaps: false,

  // Standalone output for smaller production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
};

export default withBundleAnalyzer(nextConfig);
