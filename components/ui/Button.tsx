/**
 * Button Component
 *
 * A flexible button component with multiple variants and sizes.
 * Built with class-variance-authority for type-safe variant management.
 *
 * @example
 * ```tsx
 * <Button variant="default" size="medium">Click me</Button>
 * <Button variant="destructive" size="small">Delete</Button>
 * <Button variant="outline" disabled>Disabled</Button>
 * ```
 */
import React from 'react';
import { type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button-variants';

/**
 * Props for the Button component
 */
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /**
   * When true, renders as a Slot component for composition.
   * Currently not implemented but reserved for future use with Radix UI Slot.
   */
  asChild?: boolean;
}

/**
 * A styled button component with multiple visual variants.
 *
 * Supports all standard button HTML attributes plus variant styling.
 * Uses forwardRef to allow parent components to access the underlying DOM element.
 *
 * @param variant - Visual style variant (default, destructive, outline, secondary, ghost, link)
 * @param size - Size variant (default, small, large, icon)
 * @param className - Additional CSS classes to apply
 * @param asChild - Render as Slot for composition (not yet implemented)
 * @returns A styled button element
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref): JSX.Element => {
    const Comp = 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button };
