import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PostHogProvider } from '@/components/providers/PostHogProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebVitals } from '@/components/WebVitals';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: '#6366f1',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://nonlinear-editor.com'),
  title: {
    default: 'Nonlinear Editor - Professional Browser-Based Video Editor',
    template: '%s | Nonlinear Editor',
  },
  description:
    'Create stunning videos with our professional browser-based video editor. Features include timeline editing, keyframe animation, AI-powered video generation, and real-time collaboration. No downloads required.',
  keywords: [
    'video editor',
    'online video editor',
    'browser-based video editor',
    'timeline editor',
    'keyframe animation',
    'video editing',
    'non-linear editor',
    'NLE',
    'video production',
    'video editing software',
    'AI video generation',
    'video collaboration',
    'web-based editor',
    'cloud video editor',
  ],
  authors: [{ name: 'Nonlinear Editor' }],
  creator: 'Nonlinear Editor',
  publisher: 'Nonlinear Editor',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
    shortcut: '/favicon.svg',
    apple: [{ url: '/favicon.svg', type: 'image/svg+xml' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://nonlinear-editor.com',
    siteName: 'Nonlinear Editor',
    title: 'Nonlinear Editor - Professional Browser-Based Video Editor',
    description:
      'Create stunning videos with our professional browser-based video editor. Features include timeline editing, keyframe animation, AI-powered video generation, and real-time collaboration.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Nonlinear Editor - Professional Video Editing in Your Browser',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nonlinear Editor - Professional Browser-Based Video Editor',
    description:
      'Create stunning videos with professional timeline editing, keyframe animation, and AI-powered video generation. No downloads required.',
    images: ['/og-image.png'],
    creator: '@nonlineareditor',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || 'https://nonlinear-editor.com',
  },
  category: 'technology',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): Promise<React.JSX.Element> {
  // Await connection to ensure proper request handling
  await connection();

  // Note: We intentionally do NOT read headers() or nonces here to prevent
  // Next.js 15+ from automatically generating and applying nonces to inline scripts.
  // When nonces are present, 'unsafe-inline' is ignored per CSP spec, which breaks
  // PostHog's dynamically injected scripts (pushca.min.js, callable-future.js, etc.)
  // that don't have nonce attributes.
  //
  // Instead, we rely on 'unsafe-inline' in the CSP (next.config.ts) to allow
  // both Next.js framework scripts and third-party analytics scripts.

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* Skip to main content link for keyboard navigation */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-600"
        >
          Skip to main content
        </a>
        <ThemeProvider>
          <PostHogProvider>
            <WebVitals />
            <ErrorBoundary name="RootLayout" context={{ page: 'root' }}>
              <SupabaseProvider>{children}</SupabaseProvider>
            </ErrorBoundary>
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
