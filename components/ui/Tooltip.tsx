'use client';

/**
 * Tooltip Component
 *
 * A hoverable tooltip component built on Radix UI Tooltip.
 * Provides contextual information on hover or focus.
 *
 * @example
 * ```tsx
 * <TooltipProvider>
 *   <Tooltip>
 *     <TooltipTrigger asChild>
 *       <Button variant="outline">Hover me</Button>
 *     </TooltipTrigger>
 *     <TooltipContent>
 *       <p>Helpful information here</p>
 *     </TooltipContent>
 *   </Tooltip>
 * </TooltipProvider>
 * ```
 */

import * as React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';

/**
 * Provider for tooltip context. Wrap your app or tooltip group with this.
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * Root tooltip component. Controls open/close state.
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * Trigger element that shows the tooltip on hover/focus.
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * Tooltip content that appears on hover.
 *
 * Features:
 * - Automatic positioning with collision detection
 * - Smooth fade and slide animations
 * - Configurable offset from trigger
 * - Proper z-index layering
 *
 * @param sideOffset - Distance from trigger in pixels (default: 4)
 * @param className - Additional CSS classes to apply
 * @returns A styled tooltip content container with animations
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(
  ({ className, sideOffset = 4, ...props }, ref): React.ReactElement => (
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={`z-50 overflow-hidden rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-sm text-neutral-950 shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${className || ''}`}
      {...props}
    />
  )
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
