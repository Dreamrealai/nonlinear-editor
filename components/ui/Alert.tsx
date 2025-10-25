/**
 * Alert Component
 *
 * A notification or message component with different severity variants.
 * Supports optional icon positioning and composable title/description sections.
 *
 * @example
 * ```tsx
 * <Alert variant="default">
 *   <AlertTitle>Info</AlertTitle>
 *   <AlertDescription>Your changes have been saved.</AlertDescription>
 * </Alert>
 *
 * <Alert variant="destructive">
 *   <AlertTitle>Error</AlertTitle>
 *   <AlertDescription>Something went wrong.</AlertDescription>
 * </Alert>
 *
 * <Alert variant="success">
 *   <Info className="h-4 w-4" />
 *   <AlertTitle>Success</AlertTitle>
 *   <AlertDescription>Operation completed.</AlertDescription>
 * </Alert>
 * ```
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const alertVariants = cva(
  'relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive:
          'border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive',
        success: 'border-success/50 text-success dark:border-success [&>svg]:text-success',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

/**
 * Main alert container with automatic icon positioning support.
 *
 * @param variant - Alert severity variant (default, destructive, success)
 * @param className - Additional CSS classes to apply
 * @returns A styled alert container with role="alert" for accessibility
 */
const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(
  ({ className, variant, ...props }, ref): React.ReactElement => (
    <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
  )
);
Alert.displayName = 'Alert';

/**
 * Alert title heading (h5 element).
 *
 * @param className - Additional CSS classes to apply
 * @returns A styled heading for the alert title
 */
const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref): React.ReactElement => (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h5
      ref={ref}
      className={cn('mb-1 font-medium leading-none tracking-tight', className)}
      {...props}
    />
  )
);
AlertTitle.displayName = 'AlertTitle';

/**
 * Alert description text with relaxed line height for readability.
 *
 * @param className - Additional CSS classes to apply
 * @returns A div container for alert description content
 */
const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(
  ({ className, ...props }, ref): React.ReactElement => (
    <div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
  )
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription };
