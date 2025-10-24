/**
 * Kbd Component
 *
 * A component to display keyboard keys in a styled format.
 * Automatically detects platform and displays correct modifier keys.
 *
 * @example
 * ```tsx
 * <Kbd>Cmd</Kbd>
 * <Kbd>Shift</Kbd>
 * <Kbd keys={['Cmd', 'Z']}>Undo</Kbd>
 * ```
 */
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Kbd component
 */
export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Array of keys to display (e.g., ['Cmd', 'Shift', 'Z'])
   */
  keys?: string[];
}

/**
 * Get the platform-specific modifier key name
 */
export function getModifierKey(key: string): string {
  if (typeof window === 'undefined') return key;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  if (key === 'Mod' || key === 'mod') {
    return isMac ? 'Cmd' : 'Ctrl';
  }

  return key;
}

/**
 * A styled keyboard key component
 *
 * @param keys - Array of keys to display
 * @param className - Additional CSS classes to apply
 * @param children - Content to display (overrides keys prop)
 * @returns A styled kbd element
 */
export const Kbd = React.forwardRef<HTMLElement, KbdProps>(
  ({ keys, className, children, ...props }, ref) => {
    if (children) {
      return (
        <kbd
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-xs font-mono font-medium text-neutral-700 shadow-sm',
            className
          )}
          {...props}
        >
          {children}
        </kbd>
      );
    }

    if (!keys || keys.length === 0) {
      return null;
    }

    return (
      <span className={cn('inline-flex items-center gap-1', className)}>
        {keys.map((key, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-xs text-neutral-500">+</span>}
            <kbd
              ref={index === 0 ? ref : undefined}
              className="inline-flex items-center justify-center rounded border border-neutral-300 bg-neutral-100 px-1.5 py-0.5 text-xs font-mono font-medium text-neutral-700 shadow-sm"
              {...(index === 0 ? props : {})}
            >
              {getModifierKey(key)}
            </kbd>
          </React.Fragment>
        ))}
      </span>
    );
  }
);

Kbd.displayName = 'Kbd';
