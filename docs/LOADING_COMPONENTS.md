# Loading Components Documentation

This document describes the branded loading components available in the application and their usage patterns.

## Overview

The application uses a consistent, branded loading design system featuring:

- **Purple gradient branding** (`purple-600` to `purple-400`)
- **Accessibility support** with reduced motion preferences
- **Dark mode support** for all loading states
- **Consistent animations** across all components
- **Proper ARIA labels** for screen readers

## Components

### 1. LoadingSpinner

Two versions are available:

#### Simple Spinner (`components/ui/LoadingSpinner.tsx`)

Uses Lucide's Loader2 icon with branded gradient support.

```tsx
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// Default spinner
<LoadingSpinner />

// Branded purple gradient spinner
<LoadingSpinner variant="branded" size={32} />

// Custom styling
<LoadingSpinner size={24} className="text-blue-500" />
```

**Props:**

- `size?: number` - Size in pixels (default: 24)
- `variant?: 'default' | 'branded'` - Visual style
- `className?: string` - Additional CSS classes

#### Border Spinner (`components/LoadingSpinner.tsx`)

Uses CSS border animation with size presets.

```tsx
import { LoadingSpinner } from '@/components/LoadingSpinner';

// Medium branded spinner
<LoadingSpinner size="md" variant="branded" />

// Large spinner with text
<LoadingSpinner size="lg" text="Loading data..." />
```

**Props:**

- `size?: 'sm' | 'md' | 'lg' | 'xl'` - Preset sizes
- `variant?: 'default' | 'branded'` - Visual style
- `text?: string` - Optional label text
- `className?: string` - Additional CSS classes

**Size Reference:**

- `sm`: 16px (4×4, border-2)
- `md`: 24px (6×6, border-2)
- `lg`: 32px (8×8, border-3)
- `xl`: 48px (12×12, border-4)

### 2. Skeleton Loaders (`components/ui/Skeleton.tsx`)

Placeholder components for content loading states.

#### Base Skeleton

```tsx
import { Skeleton } from '@/components/ui/Skeleton';

<Skeleton className="h-4 w-full" />
<Skeleton className="h-8 w-32" variant="branded" />
```

#### Skeleton Text

```tsx
import { SkeletonText } from '@/components/ui/Skeleton';

// 3 lines of text
<SkeletonText lines={3} />

// Branded variant
<SkeletonText lines={5} variant="branded" />
```

#### Skeleton Card

```tsx
import { SkeletonCard } from '@/components/ui/Skeleton';

// Full card with image, title, description
<SkeletonCard />

// Card without image
<SkeletonCard showImage={false} />

// Branded variant
<SkeletonCard variant="branded" descriptionLines={3} />
```

**Props:**

- `showImage?: boolean` - Show image placeholder (default: true)
- `showTitle?: boolean` - Show title placeholder (default: true)
- `descriptionLines?: number` - Number of description lines (default: 2)

#### Skeleton List Item

```tsx
import { SkeletonListItem } from '@/components/ui/Skeleton';

// List item with avatar
<SkeletonListItem />

// Without avatar
<SkeletonListItem showAvatar={false} />
```

#### Skeleton Table

```tsx
import { SkeletonTable } from '@/components/ui/Skeleton';

// 5 rows, 4 columns
<SkeletonTable />

// Custom dimensions
<SkeletonTable rows={10} columns={6} variant="branded" />
```

#### Skeleton Timeline

```tsx
import { SkeletonTimeline } from '@/components/ui/Skeleton';

// Timeline with 3 clips
<SkeletonTimeline />

// Custom number of clips
<SkeletonTimeline clips={5} variant="branded" />
```

### 3. Progress Indicators

#### ProgressBar (`components/ui/ProgressBar.tsx`)

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar';

// Basic progress
<ProgressBar progress={75} />

// With label and time estimates
<ProgressBar
  progress={50}
  label="Processing video"
  timeElapsed={30}
  timeRemaining={30}
  variant="primary"
/>

// Different variants
<ProgressBar progress={100} variant="success" />
<ProgressBar progress={25} variant="warning" />
<ProgressBar progress={10} variant="danger" />
```

**Variants:**

- `primary` - Blue (default)
- `success` - Green
- `warning` - Yellow
- `danger` - Red
- `info` - Cyan

#### IndeterminateProgressBar

```tsx
import { IndeterminateProgressBar } from '@/components/ui/ProgressBar';

<IndeterminateProgressBar label="Loading..." variant="primary" />;
```

### 4. GenerationProgress (`components/ui/GenerationProgress.tsx`)

Specialized component for video/audio/image generation.

```tsx
import { GenerationProgress } from '@/components/ui/GenerationProgress';

<GenerationProgress
  progress={45}
  currentAttempt={5}
  maxAttempts={10}
  generationType="video"
  statusMessage="Processing frames..."
  estimatedTimeRemaining={120}
  showCancel={true}
  onCancel={() => cancelGeneration()}
/>

// Compact variant
<GenerationProgress
  progress={30}
  currentAttempt={3}
  maxAttempts={10}
  variant="compact"
/>
```

## Loading Pages

### App-level Loading (`app/loading.tsx`)

```tsx
export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 dark:bg-neutral-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-8 dark:border-purple-800 dark:border-t-purple-400"></div>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</p>
      </div>
    </div>
  );
}
```

### Editor Loading (`app/editor/loading.tsx`)

Dark-themed loading screen for the editor.

```tsx
export default function EditorLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-900">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-purple-800 border-t-purple-400 motion-reduce:animate-none motion-reduce:border-t-8"></div>
        <p className="text-sm text-neutral-400">Loading editor...</p>
      </div>
    </div>
  );
}
```

## Design Guidelines

### Brand Colors

**Light Mode:**

- Border base: `border-purple-200`
- Border animated: `border-t-purple-600`

**Dark Mode:**

- Border base: `border-purple-800`
- Border animated: `border-t-purple-400`

### Accessibility

All loading components support:

1. **Reduced Motion:**

   ```css
   motion-reduce:animate-none
   motion-reduce:border-t-8  /* Thicker border when animation disabled */
   ```

2. **ARIA Labels:**

   ```tsx
   role="status"
   aria-label="Loading content"
   aria-live="polite"
   ```

3. **Dark Mode:**
   - All components have dark mode variants
   - Text colors use `dark:text-neutral-400` for readability

### Animation Performance

- Use CSS animations, not JavaScript
- Animations are GPU-accelerated (`transform`, `opacity`)
- Respect `prefers-reduced-motion` media query
- Keep animations subtle and professional

## Usage Examples

### Basic Page Loading

```tsx
'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function MyPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner variant="branded" size={32} />
      </div>
    );
  }

  return <div>Your content</div>;
}
```

### Content Loading with Skeleton

```tsx
import { SkeletonCard } from '@/components/ui/Skeleton';

export default function CardList() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        <SkeletonCard variant="branded" />
        <SkeletonCard variant="branded" />
        <SkeletonCard variant="branded" />
      </div>
    );
  }

  return <div>{/* Render items */}</div>;
}
```

### Lazy Loading Components

```tsx
import dynamic from 'next/dynamic';

const LoadingFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div
        className="h-8 w-8 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600 motion-reduce:animate-none motion-reduce:border-t-8 dark:border-purple-800 dark:border-t-purple-400"
        role="status"
        aria-label="Loading"
      ></div>
      <span className="text-sm text-neutral-600 dark:text-neutral-400">Loading...</span>
    </div>
  </div>
);

const LazyComponent = dynamic(() => import('./MyComponent'), {
  loading: LoadingFallback,
  ssr: false,
});
```

### Progress Tracking

```tsx
import { ProgressBar } from '@/components/ui/ProgressBar';

export default function UploadProgress({ progress, timeElapsed, timeRemaining }) {
  return (
    <ProgressBar
      progress={progress}
      label="Uploading video"
      variant="primary"
      showPercentage={true}
      timeElapsed={timeElapsed}
      timeRemaining={timeRemaining}
    />
  );
}
```

## Best Practices

1. **Use branded variant for primary actions** - Show brand identity during key interactions
2. **Match loading state to content type** - Use SkeletonCard for cards, SkeletonTimeline for timeline
3. **Provide meaningful labels** - Tell users what's loading
4. **Show progress when possible** - Use ProgressBar instead of spinner for deterministic operations
5. **Keep animations smooth** - Use CSS transitions, respect reduced motion
6. **Test in dark mode** - Ensure contrast and visibility
7. **Add time estimates** - Help users understand wait times for long operations

## Testing

All loading components have tests in `__tests__/components/ui/`:

- `LoadingSpinner.test.tsx` - Spinner component tests
- `ProgressBar.test.tsx` - Progress bar tests
- Add new tests for Skeleton components

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS animations with fallbacks
- Respects `prefers-reduced-motion` system setting
- Dark mode via CSS custom properties
