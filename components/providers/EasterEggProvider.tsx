/**
 * Easter Egg Provider
 *
 * Wraps the application to enable fun hidden features
 */
'use client';

import React from 'react';
import { useEasterEggs } from '@/lib/hooks/useEasterEggs';

interface EasterEggProviderProps {
  children: React.ReactNode;
  /** Enable easter eggs (default: true in production) */
  enabled?: boolean;
}

export function EasterEggProvider({ children, enabled = true }: EasterEggProviderProps): React.JSX.Element {
  // Initialize easter eggs
  useEasterEggs({ enabled });

  return <>{children}</>;
}
