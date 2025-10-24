'use client';

/**
 * Theme Provider Component
 *
 * Provides theme switching functionality using next-themes.
 * Supports light, dark, and system theme preferences with persistence.
 *
 * Features:
 * - Automatic system theme detection
 * - Theme preference persistence in localStorage
 * - No flash on page load (SSR-safe)
 * - TypeScript support for theme values
 */

import * as React from 'react';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps as NextThemeProviderProps } from 'next-themes';

export interface ThemeProviderProps extends NextThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider wrapper component
 *
 * Wraps next-themes ThemeProvider with sensible defaults for the application.
 *
 * @param children - Child components to wrap
 * @param props - Additional next-themes ThemeProvider props
 */
export function ThemeProvider({ children, ...props }: ThemeProviderProps): React.JSX.Element {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
