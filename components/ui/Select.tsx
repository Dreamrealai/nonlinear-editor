/**
 * Select Component
 *
 * A simple select dropdown component.
 * This is a basic implementation. For a more robust solution, consider using Radix UI Select.
 */
import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Props for the Select component
 */
export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

/**
 * Context for Select component
 */
const SelectContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

/**
 * Root Select component
 */
function Select({ value, onValueChange, children }: SelectProps): React.ReactElement {
  return (
    <SelectContext.Provider value={{ value, onValueChange }}>
      {children}
    </SelectContext.Provider>
  );
}

/**
 * Props for SelectTrigger
 */
export interface SelectTriggerProps extends React.HTMLAttributes<HTMLSelectElement> {
  children?: React.ReactNode;
}

/**
 * Select trigger (the visible button/dropdown)
 */
const SelectTrigger = React.forwardRef<HTMLSelectElement, SelectTriggerProps>(
  ({ className, children, ...props }, ref): React.ReactElement => {
    const context = React.useContext(SelectContext);

    return (
      <div className="relative">
        <select
          ref={ref}
          value={context.value}
          onChange={(e): void => context.onValueChange?.(e.target.value)}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-gray-300',
            'bg-white px-3 py-2 text-sm placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'dark:border-gray-600 dark:bg-gray-800 dark:text-white',
            className
          )}
          {...props}
        >
          {children}
        </select>
      </div>
    );
  }
);

SelectTrigger.displayName = 'SelectTrigger';

/**
 * Props for SelectValue
 */
export interface SelectValueProps {
  placeholder?: string;
}

/**
 * Select value display (placeholder when no value selected)
 */
function SelectValue({ placeholder }: SelectValueProps): React.ReactElement {
  const context = React.useContext(SelectContext);

  if (!context.value && placeholder) {
    return <option value="">{placeholder}</option>;
  }

  return <></>;
}

/**
 * Props for SelectContent
 */
export interface SelectContentProps {
  children: React.ReactNode;
}

/**
 * Select content container (wraps options)
 */
function SelectContent({ children }: SelectContentProps): React.ReactElement {
  return <>{children}</>;
}

/**
 * Props for SelectItem
 */
export interface SelectItemProps extends React.OptionHTMLAttributes<HTMLOptionElement> {
  value: string;
  children: React.ReactNode;
}

/**
 * Individual select option
 */
function SelectItem({ value, children, ...props }: SelectItemProps): React.ReactElement {
  return (
    <option value={value} {...props}>
      {children}
    </option>
  );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
