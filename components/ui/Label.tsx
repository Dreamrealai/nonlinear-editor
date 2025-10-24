/**
 * Label Component
 *
 * A simple label component for form inputs.
 */
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Label component
 */
export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {}

/**
 * A styled label component for form inputs.
 */
const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, ...props }, ref): React.ReactElement => {
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className
        )}
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';

export { Label };
