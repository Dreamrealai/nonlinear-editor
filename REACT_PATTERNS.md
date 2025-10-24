# React Component Patterns

This document outlines the standardized patterns used across the non-linear video editor codebase.

## Table of Contents

1. [File Structure](#file-structure)
2. [State Management](#state-management)
3. [Error Handling](#error-handling)
4. [Loading States](#loading-states)
5. [Prop Types](#prop-types)
6. [Import Organization](#import-organization)
7. [Component Documentation](#component-documentation)

---

## File Structure

### Component Header Comments

All components should start with a JSDoc-style comment describing:

- Component name
- Purpose/description
- Key features (bullet points)

```typescript
/**
 * ComponentName Component
 *
 * Brief description of what the component does
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */
'use client'; // if needed

import ...
```

---

## State Management

### State Declaration Order

1. **Hooks from libraries** (useRouter, useSearchParams, etc.)
2. **Refs** (useRef)
3. **Loading/error states** (isLoading, error, success)
4. **UI state** (isOpen, selected items, etc.)
5. **Form fields** (email, password, etc.)

```typescript
export default function MyComponent() {
  // 1. Library hooks
  const router = useRouter();
  const { supabaseClient } = useSupabase();

  // 2. Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // 3. Loading/error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 4. UI state
  const [isOpen, setIsOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // 5. Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ... component logic
}
```

### State Naming Conventions

- **Loading states**: Use `isLoading` (not `loading`, `isCreating`, etc.)
- **Multiple loading states**: Use descriptive prefixes: `isLoadingGuest`, `isLoadingData`
- **Boolean flags**: Use `is` prefix: `isOpen`, `isSelected`, `isVisible`
- **Error states**: Use `error` (string or null)
- **Success messages**: Use `success` (string or null)

---

## Error Handling

### Standard Pattern

All async operations should follow this pattern:

```typescript
const handleSubmit = async () => {
  setIsLoading(true);
  setError('');
  setSuccess('');

  try {
    const response = await fetch('/api/endpoint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Operation failed');
    }

    const result = await response.json();
    toast.success('Operation completed successfully');
    // Handle success
  } catch (error) {
    browserLogger.error({ error }, 'Failed to complete operation');
    toast.error('Failed to complete operation. Please try again.');
  } finally {
    setIsLoading(false);
  }
};
```

### Error Handling Requirements

1. **Always use try-catch-finally** for async operations
2. **Always log errors** with `browserLogger.error()`
3. **Always show user feedback** with `toast.error()` or inline error state
4. **Always reset loading state** in `finally` block
5. **Provide helpful error messages** - user-friendly, not technical

---

## Loading States

### Button Loading States

```typescript
<button
  onClick={handleAction}
  disabled={isLoading}
  className="... disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
>
  {isLoading ? 'Loading...' : 'Button Text'}
</button>
```

### Loading State Requirements

1. **Consistent naming**: Use `isLoading` as the primary loading state
2. **Disable interactions**: Always disable buttons/inputs during loading
3. **Visual feedback**: Show loading text or spinner
4. **Cursor feedback**: Add `disabled:cursor-not-allowed`
5. **Transitions**: Add `transition-colors` for smooth state changes

### Loading Indicators

For full-page or section loading:

```typescript
{isLoading ? (
  <div className="flex items-center justify-center py-8">
    <div className="flex items-center gap-2 text-sm text-neutral-500">
      <LoadingSpinner size="md" />
      <span>Loading...</span>
    </div>
  </div>
) : (
  // Content
)}
```

---

## Prop Types

### Interface Declaration

1. **Export interfaces** for reusable types
2. **Use interfaces** (not types) for component props
3. **Document props** with JSDoc comments
4. **Keep internal interfaces** private (no export)

```typescript
/**
 * Props for MyComponent
 */
export interface MyComponentProps {
  /** Primary identifier */
  id: string;
  /** Component title */
  title: string;
  /** Optional callback on close */
  onClose?: () => void;
  /** Loading state */
  isLoading?: boolean;
}

// Internal interface (not exported)
interface InternalState {
  selectedId: string | null;
  isOpen: boolean;
}

export default function MyComponent({ id, title, onClose, isLoading = false }: MyComponentProps) {
  // ...
}
```

### Type Conventions

- **Optional props**: Use `?` suffix
- **Default values**: Provide in destructuring
- **Callbacks**: Use `on` prefix: `onClick`, `onChange`, `onClose`
- **Boolean props**: Use `is` or `has` prefix: `isOpen`, `hasError`

---

## Import Organization

Standard import order:

1. **React and Next.js** imports
2. **Third-party libraries** (alphabetically)
3. **Local utilities and hooks** (@/lib/...)
4. **Local components** (@/components/...)
5. **Types** (@/types/...)

```typescript
// 1. React/Next
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// 2. Third-party (alphabetically)
import clsx from 'clsx';
import toast from 'react-hot-toast';

// 3. Local utilities/hooks
import { browserLogger } from '@/lib/browserLogger';
import { useSupabase } from '@/components/providers/SupabaseProvider';

// 4. Local components
import LoadingSpinner from '@/components/LoadingSpinner';

// 5. Types
import type { Timeline } from '@/types/timeline';
```

---

## Component Documentation

### Inline Comments

- Use comments to explain **why**, not **what**
- Document complex logic or non-obvious behavior
- Add section headers for major component blocks

```typescript
// Load user profile on mount
useEffect(() => {
  loadUserProfile();
}, []);

// Clean up blob URLs to prevent memory leaks
useEffect(() => {
  return () => {
    blobUrls.forEach((url) => URL.revokeObjectURL(url));
  };
}, []);
```

### Component Sections

Use consistent section organization:

```typescript
export default function MyComponent() {
  // ============ Hooks ============
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // ============ Effects ============
  useEffect(() => {
    // ...
  }, []);

  // ============ Handlers ============
  const handleSubmit = () => {
    // ...
  };

  // ============ Render ============
  return (
    // ...
  );
}
```

---

## Best Practices Summary

### Do's ✓

- Always add component documentation headers
- Use consistent state naming (`isLoading`, not `loading`)
- Always use try-catch-finally for async operations
- Always log errors with `browserLogger`
- Always show user feedback with `toast`
- Export interfaces for reusable types
- Organize imports by category
- Add `transition-colors` to interactive elements
- Use `disabled:cursor-not-allowed` on disabled buttons

### Don'ts ✗

- Don't use inconsistent loading state names
- Don't forget error logging
- Don't forget user feedback (toasts)
- Don't skip the `finally` block in try-catch
- Don't use `type` for component props (use `interface`)
- Don't leave disabled states without visual feedback
- Don't create files without documentation headers

---

## Migration Checklist

When updating an existing component:

- [ ] Add component documentation header
- [ ] Standardize state naming (`isLoading`)
- [ ] Reorganize state declarations (hooks, refs, loading, UI, form)
- [ ] Add error handling (try-catch-finally)
- [ ] Add error logging (`browserLogger.error`)
- [ ] Add user feedback (`toast.success/error`)
- [ ] Export prop interfaces
- [ ] Organize imports
- [ ] Add `transition-colors` to buttons
- [ ] Add `disabled:cursor-not-allowed` to disabled elements

---

_Last updated: January 2025_
