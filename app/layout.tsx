import type { Metadata } from 'next';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SupabaseProvider } from '@/components/providers/SupabaseProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { WebVitals } from '@/components/WebVitals';
import { CSP_NONCE_HEADER } from '@/lib/security/csp';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

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

  // Read CSP nonce from middleware headers
  // Next.js 15+ automatically applies nonces to inline scripts when:
  // 1. headers() is called in the root layout
  // 2. The nonce header is present in the request
  const headersList = await headers();
  // Reading the nonce triggers Next.js to automatically apply it to inline scripts
  // The nonce will be automatically applied by Next.js to:
  // - __NEXT_DATA__ script tag
  // - React hydration scripts
  // - Other framework-generated inline scripts
  // No explicit nonce attribute setting needed - Next.js handles this internally
  headersList.get(CSP_NONCE_HEADER);

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <WebVitals />
        <ErrorBoundary>
          <SupabaseProvider>{children}</SupabaseProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
