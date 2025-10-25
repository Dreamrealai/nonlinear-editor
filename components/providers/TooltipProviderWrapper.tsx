'use client';

/**
 * Tooltip Provider Wrapper
 *
 * Client-side wrapper for Radix UI TooltipProvider to ensure proper context availability.
 * This component must be a client component to provide the Tooltip context to child components.
 *
 * Usage:
 * Wrap your app with this provider in the root layout to enable tooltips throughout.
 */

import * as React from 'react';
import { TooltipProvider } from '@/components/ui/Tooltip';

type TooltipProviderWrapperProps = {
  children: React.ReactNode;
};

/**
 * Wraps children with TooltipProvider to enable tooltips.
 * Configured with reasonable defaults for delay timing.
 */
export function TooltipProviderWrapper({
  children,
}: TooltipProviderWrapperProps): React.ReactElement {
  return (
    <TooltipProvider delayDuration={200} skipDelayDuration={100}>
      {children}
    </TooltipProvider>
  );
}
