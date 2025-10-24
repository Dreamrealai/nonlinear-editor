/**
 * Input Component
 *
 * A styled text input component with focus states and accessibility features.
 * Supports all standard HTML input types and attributes.
 *
 * @example
 * ```tsx
 * <Input type="text" placeholder="Enter name" />
 * <Input type="email" required />
 * <Input type="password" disabled />
 * <Input type="file" />
 * ```
 */
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Input component.
 * Extends all standard HTML input attributes.
 */
export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * A styled input field with consistent styling across the application.
 *
 * Features:
 * - Focus ring with offset for accessibility
 * - Disabled state styling
 * - File input support with custom file button styling
 * - Placeholder text styling
 *
 * @param type - HTML input type (text, email, password, file, etc.)
 * @param className - Additional CSS classes to apply
 * @param ref - Forwarded ref to access the underlying input element
 * @returns A styled input element
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref): React.ReactElement => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
