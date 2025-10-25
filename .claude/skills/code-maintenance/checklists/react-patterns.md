# React Patterns Checklist

## Component Design

### Component Structure
- [ ] Component files use PascalCase naming
- [ ] One component per file (except small sub-components)
- [ ] Props interface defined and exported
- [ ] Component has clear single responsibility
- [ ] File size under 200 lines (or justifiably larger)

### ForwardRef Pattern
- [ ] Reusable UI components use `forwardRef`
- [ ] Ref type properly typed: `forwardRef<HTMLDivElement, Props>`
- [ ] Ref properly forwarded to DOM element
- [ ] Used for: Buttons, Inputs, custom controls

### Component Composition
- [ ] Complex components split into sub-components
- [ ] Presentation separated from logic (container/view pattern)
- [ ] Shared components in `/components/`
- [ ] Feature-specific components in feature directory

## Hooks Best Practices

### Hooks Order
Consistent ordering:
1. [ ] `useContext` hooks first
2. [ ] `useState` hooks
3. [ ] `useRef` hooks
4. [ ] `useEffect` hooks
5. [ ] Custom hooks last

### Custom Hooks
- [ ] Reusable logic extracted to custom hooks
- [ ] Custom hooks named with `use` prefix
- [ ] Custom hooks in `/hooks/` directory
- [ ] Custom hooks properly typed with return type
- [ ] Custom hooks have single responsibility

### useEffect Best Practices
- [ ] Dependencies array correct and complete
- [ ] Cleanup functions for subscriptions/listeners
- [ ] No missing dependencies (ESLint rule satisfied)
- [ ] Effects focused (one purpose per effect)
- [ ] Async operations handled correctly (no race conditions)

### useState Best Practices
- [ ] Related state grouped in object or custom hook
- [ ] State updates use functional form when based on previous state
- [ ] Initial state not computed on every render (use lazy init)
- [ ] State setters have descriptive names

### useMemo & useCallback
- [ ] Expensive calculations wrapped in `useMemo`
- [ ] Functions passed as props wrapped in `useCallback`
- [ ] Dependencies array correct
- [ ] Not overused (only when necessary)

## Performance Optimization

### Memoization
- [ ] List item components wrapped in `React.memo`
- [ ] Expensive components memoized
- [ ] Props comparison function if needed
- [ ] Avoid inline object/array literals in render

### Virtualization
- [ ] Large lists use virtualization (react-window)
- [ ] Timeline uses virtualization for clips
- [ ] Infinite scroll uses virtualization
- [ ] Window size calculated correctly

### Event Handlers
- [ ] High-frequency events debounced (scroll, resize, input)
- [ ] Mouse events throttled if continuous
- [ ] Event handlers not recreated every render (useCallback)
- [ ] Passive event listeners where appropriate

### Code Splitting
- [ ] Heavy components use dynamic imports
- [ ] Route-based code splitting
- [ ] Conditional features lazy loaded
- [ ] Third-party heavy libraries dynamically imported

## State Management

### Local State
- [ ] Local state for UI-only concerns (open/closed, hover)
- [ ] Form state managed locally or with library
- [ ] Derived state computed, not stored
- [ ] State close to where it's used

### Zustand Stores
- [ ] Global state in Zustand stores
- [ ] Separate stores per domain (timeline, playback, selection)
- [ ] Store uses Immer middleware for immutability
- [ ] Selectors exported for performance
- [ ] Actions are atomic and focused

### Context
- [ ] Context for dependency injection
- [ ] Context for theme, i18n, feature flags
- [ ] Context not overused (prefer Zustand for complex state)
- [ ] Context split by update frequency

### Props vs State vs Store
- [ ] Props for configuration and callbacks
- [ ] Local state for component-specific data
- [ ] Zustand for shared application state
- [ ] Not "prop drilling" (use context or store)

## Error Handling

### Error Boundaries
- [ ] Route-level error boundaries (`error.tsx`)
- [ ] Complex feature error boundaries
- [ ] Error boundaries show user-friendly messages
- [ ] Errors logged to tracking service
- [ ] Fallback UI provided

### Async Error Handling
- [ ] API calls wrapped in try/catch
- [ ] Loading states shown during async operations
- [ ] Error states displayed to user
- [ ] Retry mechanisms for transient failures

## Accessibility

### Semantic HTML
- [ ] Use semantic elements (button, nav, header, etc.)
- [ ] Avoid divs with click handlers (use buttons)
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Lists use ul/ol elements

### ARIA Attributes
- [ ] `aria-label` on icon buttons
- [ ] `aria-describedby` for form fields with errors
- [ ] `aria-live` for dynamic content
- [ ] `role` attribute when semantic HTML not sufficient

### Keyboard Navigation
- [ ] All interactive elements keyboard accessible
- [ ] Focus management in modals/dialogs
- [ ] Tab order logical
- [ ] Focus visible (outline not removed without alternative)

### Screen Readers
- [ ] Images have alt text
- [ ] Form inputs have labels
- [ ] Loading states announced
- [ ] Error messages associated with fields

## Project-Specific Patterns

### Timeline Components
- [ ] Timeline clips use virtualization
- [ ] Drag and drop properly typed
- [ ] Playback synchronized with state
- [ ] Zoom calculations memoized
- [ ] Snap-to-grid debounced

### Video Player
- [ ] Video element uses ref
- [ ] Playback state synchronized
- [ ] Time updates throttled
- [ ] Fullscreen properly handled
- [ ] Resource cleanup on unmount

### Forms
- [ ] Controlled inputs (value + onChange)
- [ ] Form validation on submit
- [ ] Error messages displayed
- [ ] Loading state during submission
- [ ] Success feedback provided

### Asset Management
- [ ] File uploads show progress
- [ ] Upload errors handled gracefully
- [ ] Asset thumbnails lazy loaded
- [ ] Asset deletion confirmed
- [ ] Optimistic updates for UX

## Server vs Client Components (Next.js)

### Server Components
- [ ] Default to server components when possible
- [ ] Fetch data in server components
- [ ] No hooks or browser APIs in server components
- [ ] Streaming for long operations

### Client Components
- [ ] `'use client'` directive only when needed
- [ ] Client components for interactivity
- [ ] Client components for browser APIs
- [ ] Client components for hooks
- [ ] Minimize client component boundaries

## Testing Considerations

### Testability
- [ ] Components accept data via props (not hard-coded)
- [ ] Logic extracted to functions (not inline)
- [ ] Custom hooks can be tested independently
- [ ] Mocking-friendly (dependency injection)

### Test IDs
- [ ] Critical elements have `data-testid`
- [ ] Test IDs descriptive and stable
- [ ] Use semantic queries first (role, label)
- [ ] Test IDs only when semantic queries insufficient
