import type { NextConfig } from 'next';
import { withSentryConfig } from '@sentry/nextjs';

// Bundle analyzer configuration
const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@next/bundle-analyzer')({
        enabled: true,
        openAnalyzer: true,
      })
    : (config: NextConfig): NextConfig => config;

const nextConfig: NextConfig = {
  // TypeScript type checking enabled (runs during build)
  typescript: {
    ignoreBuildErrors: false,
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

  async redirects() {
    return [
      {
        source: '/signin',
        destination: '/auth/sign-in',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/auth/sign-up',
        permanent: true,
      },
    ];
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
              // Script policy - allow Vercel Analytics, PostHog, and third-party monitoring scripts
              // wasm-unsafe-eval required for Next.js SWC (Rust/WASM compiler) and dependencies
              // (@napi-rs/wasm-runtime, @tybys/wasm-util used by Next.js build toolchain)
              // Note: wasm-unsafe-eval is MUCH safer than unsafe-eval as it only allows
              // WebAssembly compilation, not arbitrary JavaScript eval()
              // unsafe-inline required for PostHog's dynamically injected scripts (pushca, callable-future, etc.)
              // This is necessary for PostHog's real-time features to work properly
              "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://va.vercel-scripts.com https://cdn.vercel-insights.com https://us-assets.i.posthog.com https://us.i.posthog.com https://app.posthog.com",
              // Allow web workers bundled as blob URLs (Next.js worker instantiation pattern)
              "worker-src 'self' blob:",
              // Style sources - keep unsafe-inline only for Tailwind v4 CSS-in-JS
              // Google Fonts stylesheets allowed for next/font/google
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              // Image sources - Supabase storage, data URIs, and blob for canvas/video
              "img-src 'self' data: blob: https://*.supabase.co",
              // Media sources - Supabase storage for video/audio assets
              "media-src 'self' blob: https://*.supabase.co",
              // API connections - Supabase realtime, Fal.ai video, Google Gemini, Sentry, PostHog, Vercel Analytics
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://queue.fal.run https://fal.run https://generativelanguage.googleapis.com https://*.ingest.sentry.io https://app.posthog.com https://us.i.posthog.com https://va.vercel-scripts.com https://vitals.vercel-insights.com",
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
              // Note: plugin-types directive has been removed from CSP spec
              // Use object-src 'none' instead (already set above) to block plugins
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
      '@supabase/ssr',
      '@radix-ui/react-dialog',
      '@radix-ui/react-tooltip',
      'zustand',
      'clsx',
      'lucide-react',
      'react-hot-toast',
      'web-vitals',
      'immer',
      'uuid',
      'pino',
      'posthog-js',
      '@sentry/nextjs',
    ],
    // Enable optimized CSS loading
    optimizeCss: true,
    // Enable server actions for better data fetching
    serverActions: {
      bodySizeLimit: '1gb',
    },
  },

  // Turbopack configuration (Next.js 16+ default bundler)
  // Turbopack automatically handles tree-shaking, code splitting, and optimizations
  turbopack: {},

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

  // Enable source maps in production for Sentry error tracking
  productionBrowserSourceMaps: true,

  // Standalone output for smaller production builds
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Webpack optimizations (for webpack builds)
  webpack: (config, { isServer }) => {
    // Only apply client-side optimizations
    if (!isServer) {
      // Improve code splitting for better caching
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          maxInitialRequests: 25,
          minSize: 20000,
          cacheGroups: {
            // Vendor code splitting
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name(module: { context: string }): string {
                // Get package name from module context
                const packageName = module.context.match(
                  /[\\/]node_modules[\\/](.*?)([\\/]|$)/
                )?.[1];
                return `vendor.${packageName?.replace('@', '')}`;
              },
              priority: 10,
            },
            // Framework code (React, Next.js)
            framework: {
              test: /[\\/]node_modules[\\/](react|react-dom|next|scheduler)[\\/]/,
              name: 'framework',
              priority: 20,
              reuseExistingChunk: true,
            },
            // Common code shared between pages
            commons: {
              minChunks: 2,
              priority: 5,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Large libraries that should be split separately
            supabase: {
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              name: 'supabase',
              priority: 15,
              enforce: true,
            },
            posthog: {
              test: /[\\/]node_modules[\\/]posthog-js[\\/]/,
              name: 'posthog',
              priority: 15,
              enforce: true,
            },
            sentry: {
              test: /[\\/]node_modules[\\/]@sentry[\\/]/,
              name: 'sentry',
              priority: 15,
              enforce: true,
            },
            google: {
              test: /[\\/]node_modules[\\/]@google[\\/]/,
              name: 'google',
              priority: 15,
              enforce: true,
            },
            // Scalar API reference (large library)
            scalar: {
              test: /[\\/]node_modules[\\/]@scalar[\\/]/,
              name: 'scalar',
              priority: 15,
              enforce: true,
            },
            // Radix UI components
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix',
              priority: 15,
              enforce: true,
            },
          },
        },
        // Minimize bundle size
        usedExports: true,
        sideEffects: true,
      };

      // Performance budgets - warn when bundles exceed these sizes
      config.performance = {
        ...config.performance,
        hints: 'warning',
        maxEntrypointSize: 244000, // ~244KB
        maxAssetSize: 244000, // ~244KB
      };
    }
    return config;
  },
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses all logs
  silent: true,

  // Organization slug (from Sentry dashboard)
  org: process.env.SENTRY_ORG,

  // Project name (from Sentry dashboard)
  project: process.env.SENTRY_PROJECT,

  // Auth token for uploading source maps
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only upload source maps if DSN is configured
  disabled: !process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Hide source maps from public
  hideSourceMaps: true,

  // Disable telemetry
  telemetry: false,

  // Disable source map upload during development
  disableServerWebpackPlugin: process.env.NODE_ENV !== 'production',
  disableClientWebpackPlugin: process.env.NODE_ENV !== 'production',
};

// Wrap config with bundle analyzer, then Sentry
const configWithAnalyzer = withBundleAnalyzer(nextConfig);
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithAnalyzer, sentryWebpackPluginOptions)
  : configWithAnalyzer;
