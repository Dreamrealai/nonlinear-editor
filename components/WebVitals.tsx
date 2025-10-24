/**
 * Web Vitals Client Component
 *
 * Initializes Web Vitals tracking on the client side.
 * This component should be included in the root layout.
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
