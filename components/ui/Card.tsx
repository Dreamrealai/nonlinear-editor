/**
 * Card Component
 *
 * A versatile container component for grouping related content.
 * Provides a consistent card layout with optional header, content, and footer sections.
 *
 * @example
 * ```tsx
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Title</CardTitle>
 *     <CardDescription>Description text</CardDescription>
 *   </CardHeader>
 *   <CardContent>Main content goes here</CardContent>
 *   <CardFooter>Footer actions</CardFooter>
 * </Card>
 * ```
 */
import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Main card container with border and shadow styling.
 *
 * @param className - Additional CSS classes to apply
 * @returns A styled card container element
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref): JSX.Element => (
    <div
      ref={ref}
      className={cn('rounded-lg border bg-card text-card-foreground shadow-sm', className)}
      {...props}
    />
  )
);
Card.displayName = 'Card';

/**
 * Card header section with vertical spacing for title and description.
 *
 * @param className - Additional CSS classes to apply
 * @returns A flex container for card header content
 */
const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref): JSX.Element => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6 dark:border-neutral-800', className)} {...props} />
  )
);
CardHeader.displayName = 'CardHeader';

/**
 * Card title heading (h3 element).
 *
 * @param className - Additional CSS classes to apply
 * @returns A styled h3 heading element
 */
const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref): JSX.Element => (
    // eslint-disable-next-line jsx-a11y/heading-has-content
    <h3
      ref={ref}
      className={cn('text-2xl font-semibold leading-none tracking-tight text-neutral-900 dark:text-neutral-100', className)}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

/**
 * Card description text with muted styling.
 *
 * @param className - Additional CSS classes to apply
 * @returns A styled paragraph element for descriptions
 */
const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref): JSX.Element => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

/**
 * Card main content area with padding.
 *
 * @param className - Additional CSS classes to apply
 * @returns A div container for card content
 */
const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref): JSX.Element => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
);
CardContent.displayName = 'CardContent';

/**
 * Card footer section for actions or metadata.
 *
 * @param className - Additional CSS classes to apply
 * @returns A flex container for footer content
 */
const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref): JSX.Element => (
    <div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
