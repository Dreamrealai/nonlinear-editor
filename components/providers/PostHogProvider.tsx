/**
 * PostHog Analytics Provider
 *
 * Initializes PostHog analytics on the client side and tracks page views.
 * Should be used in the root layout to enable analytics across the app.
 *
 * Usage:
 * ```tsx
 * // In app/layout.tsx
 * import { PostHogProvider } from '@/components/providers/PostHogProvider';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <PostHogProvider>
 *           {children}
 *         </PostHogProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */

'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { analyticsService } from '@/lib/services/analyticsService';

interface PostHogProviderProps {
  children: React.ReactNode;
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Initialize PostHog on mount
  useEffect(() => {
    analyticsService.init();
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (pathname) {
      const url = searchParams?.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname;

      analyticsService.trackPageView(url);
    }
  }, [pathname, searchParams]);

  return <>{children}</>;
}
