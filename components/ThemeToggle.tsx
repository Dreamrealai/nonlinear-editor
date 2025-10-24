'use client';

/**
 * Theme Toggle Component
 *
 * A button component for toggling between light, dark, and system themes.
 * Uses next-themes for theme management with smooth transitions.
 *
 * Features:
 * - Three theme options: light, dark, system
 * - Icon changes based on current theme
 * - Tooltip showing current theme
 * - Keyboard accessible
 * - Mounted check to prevent hydration mismatch
 */

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';

export interface ThemeToggleProps {
  /** Custom className for styling */
  className?: string;
  /** Size variant for the toggle button */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-9 w-9',
  lg: 'h-10 w-10',
};

const iconSizes = {
  sm: 16,
  md: 18,
  lg: 20,
};

/**
 * ThemeToggle Component
 *
 * Cycles through light → dark → system themes on click.
 * Shows appropriate icon for current theme.
 *
 * @param className - Additional CSS classes
 * @param size - Button size variant
 */
export function ThemeToggle({ className = '', size = 'md' }: ThemeToggleProps): React.JSX.Element | null {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Prevent hydration mismatch by only rendering after mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  const cycleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
    } else if (theme === 'dark') {
      setTheme('system');
    } else {
      setTheme('light');
    }
  };

  const getIcon = () => {
    const iconSize = iconSizes[size];
    switch (theme) {
      case 'light':
        return <Sun size={iconSize} />;
      case 'dark':
        return <Moon size={iconSize} />;
      case 'system':
        return <Monitor size={iconSize} />;
      default:
        return <Sun size={iconSize} />;
    }
  };

  const getTooltipText = () => {
    switch (theme) {
      case 'light':
        return 'Light mode';
      case 'dark':
        return 'Dark mode';
      case 'system':
        return 'System theme';
      default:
        return 'Toggle theme';
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={cycleTheme}
          className={`inline-flex items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-900 hover:bg-neutral-50 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700 dark:active:bg-neutral-600 transition-colors ${sizeClasses[size]} ${className}`}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'} mode`}
        >
          {getIcon()}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{getTooltipText()}</p>
      </TooltipContent>
    </Tooltip>
  );
}
