import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compiler: {
    // Remove console.log in production but keep warnings and errors
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
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
    formats: ['image/webp', 'image/avif'],
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
              // Added wasm-unsafe-eval for WebAssembly support (safer than unsafe-eval)
              "script-src 'self' 'wasm-unsafe-eval'",
              // Style sources - keep unsafe-inline only for Tailwind
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
              "upgrade-insecure-requests",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Optimize bundle
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'zustand', 'clsx'],
  },

  // Production-only optimizations
  reactStrictMode: true,

  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
