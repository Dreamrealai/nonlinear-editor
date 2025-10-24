/**
 * Web Vitals Client Component
 *
 * Initializes Web Vitals tracking on the client side.
 * This component should be included in the root layout.
 *
 * Note: Web Vitals library is imported via npm and runs client-side,
 * so no inline scripts or CSP nonce is needed.
 */
'use client';

import { useEffect } from 'react';
import { initWebVitals } from '@/lib/webVitals';

export function WebVitals() {
  useEffect(() => {
    // Initialize Web Vitals tracking
    initWebVitals();
  }, []);

  // This component doesn't render anything
  return null;
}
