import type { Metadata } from 'next';
import { connection } from 'next/server';
import { headers } from 'next/headers';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SupabaseProvider from '@/components/providers/SupabaseProvider';
import ErrorBoundary from '@/components/ErrorBoundary';
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
  title: 'Nonlinear Editor',
  description: 'Browser-based video editor with keyframe editing',
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
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
