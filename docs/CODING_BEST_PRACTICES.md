# Coding Best Practices

> **Comprehensive guide to coding standards, patterns, and practices used in this Next.js video editor application.**

**Last Updated:** October 23, 2025
**Target Audience:** All developers working on this codebase

---

## Table of Contents

1. [TypeScript Best Practices](#typescript-best-practices)
2. [React Component Patterns](#react-component-patterns)
3. [State Management with Zustand](#state-management-with-zustand)
4. [API Route Design](#api-route-design)
5. [Service Layer Architecture](#service-layer-architecture)
6. [Error Handling](#error-handling)
7. [Validation Patterns](#validation-patterns)
8. [Testing Practices](#testing-practices)
9. [Performance Optimization](#performance-optimization)
10. [Security Practices](#security-practices)
11. [Logging and Monitoring](#logging-and-monitoring)
12. [Code Organization](#code-organization)

---

## TypeScript Best Practices

### 1.1 Branded Types for Type Safety

**WHY:** Branded types prevent mixing up similar primitive types (e.g., different ID types) at compile time, catching bugs before runtime.

**✅ DO:**

```typescript
// types/branded.ts
export type UserId = Brand<string, 'UserId'>;
export type ProjectId = Brand<string, 'ProjectId'>;
export type AssetId = Brand<string, 'AssetId'>;

// Usage
const userId: UserId = brandValue<UserId>('user-123');
const projectId: ProjectId = brandValue<ProjectId>('project-456');

// ✅ This will fail at compile time!
// const wrongAssignment: ProjectId = userId; // Error!
```

**❌ DON'T:**

```typescript
// Mixing up IDs with plain strings
function getProject(projectId: string, userId: string) {
  // Easy to accidentally swap these arguments!
  return database.query(userId, projectId); // BUG!
}
```

**Pattern Location:** `types/branded.ts`

---

### 1.2 Discriminated Unions for Type-Safe Error Handling

**WHY:** Discriminated unions enable exhaustive type checking and prevent missing error cases.

**✅ DO:**

```typescript
// types/api.ts
export type APIError =
  | { type: 'validation'; field: string; message: string }
  | { type: 'rate_limit'; limit: number; resetAt: number }
  | { type: 'authentication'; code: 'invalid_token' | 'expired_token' }
  | { type: 'not_found'; resource: string }
  | { type: 'server'; code?: string };

// Type-safe error handling with exhaustiveness checking
function handleError(error: APIError) {
  switch (error.type) {
    case 'validation':
      console.error(`Validation error on ${error.field}: ${error.message}`);
      break;
    case 'rate_limit':
      console.error(`Rate limited. Resets at ${error.resetAt}`);
      break;
    case 'authentication':
      console.error(`Auth error: ${error.code}`);
      break;
    case 'not_found':
      console.error(`Resource not found: ${error.resource}`);
      break;
    case 'server':
      console.error(`Server error: ${error.code ?? 'unknown'}`);
      break;
    // If you add a new error type, TypeScript will warn you!
  }
}
```

**❌ DON'T:**

```typescript
// Untyped error handling
function handleError(error: any) {
  if (error.field) {
    // What if error.field exists but it's not a validation error?
  }
}
```

**Pattern Location:** `types/api.ts` lines 536-620

---

### 1.3 Type Assertion with Type Guards

**WHY:** Type guards provide runtime type checking that TypeScript understands, improving type narrowing.

**✅ DO:**

```typescript
// lib/validation.ts
export function validateUUID(value: unknown, fieldName: string = 'ID'): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`, fieldName, 'INVALID_TYPE');
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName, 'INVALID_UUID');
  }
  // After this point, TypeScript knows value is a string!
}
```

**❌ DON'T:**

```typescript
// Type assertion without validation
function processId(id: unknown) {
  const safeId = id as string; // Unsafe! No runtime check
  return safeId.toLowerCase(); // Could crash if id is not a string
}
```

**Pattern Location:** `lib/validation.ts` lines 33-42

---

### 1.4 Enum Patterns for Constants

**WHY:** Enums provide type-safe constants with autocomplete and prevent magic strings/numbers.

**✅ DO:**

```typescript
// lib/errors/errorCodes.ts
export enum HttpStatusCode {
  OK = 200,
  CREATED = 201,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  INTERNAL_SERVER_ERROR = 500,
}

// Usage
return NextResponse.json({ error: 'Not found' }, { status: HttpStatusCode.NOT_FOUND });
```

**❌ DON'T:**

```typescript
// Magic numbers
return NextResponse.json({ error: 'Not found' }, { status: 404 });
```

**Pattern Location:** `lib/errors/errorCodes.ts` lines 46-91

---

### 1.5 Strict TypeScript Configuration

**WHY:** Strict mode catches more bugs at compile time and enforces better code quality.

**✅ DO:**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**Pattern Location:** `tsconfig.json` lines 7-18

---

## React Component Patterns

### 2.1 Component Composition with forwardRef

**WHY:** `forwardRef` enables ref forwarding for reusable UI components, supporting imperative APIs when needed.

**✅ DO:**

```typescript
// components/ui/Button.tsx
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button };
```

**❌ DON'T:**

```typescript
// No ref forwarding
export function Button(props: ButtonProps) {
  return <button {...props} />;
  // Can't access the button element from parent!
}
```

**Pattern Location:** `components/ui/Button.tsx`

---

### 2.2 Custom Hooks for Reusable Logic

**WHY:** Custom hooks encapsulate complex logic, making components cleaner and logic reusable.

**✅ DO:**

```typescript
// lib/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage in component
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    // Only called after user stops typing for 500ms
    fetchSearchResults(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

**❌ DON'T:**

```typescript
// Inline debounce logic in every component
function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedValue, setDebouncedValue] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(searchTerm), 500);
    return () => clearTimeout(timeout);
  }, [searchTerm]);
  // Repeating this logic in every component!
}
```

**Pattern Location:** `lib/hooks/useDebounce.ts`

---

### 2.3 Prop Spreading with Type Safety

**WHY:** Prop spreading enables component flexibility while maintaining type safety.

**✅ DO:**

```typescript
interface CustomButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  variant?: 'primary' | 'secondary';
}

function CustomButton({ isLoading, variant = 'primary', children, ...rest }: CustomButtonProps) {
  return (
    <button {...rest} disabled={isLoading || rest.disabled}>
      {isLoading ? 'Loading...' : children}
    </button>
  );
}
```

**❌ DON'T:**

```typescript
function CustomButton(props: any) {
  return <button {...props} />;
  // No type safety!
}
```

---

## State Management with Zustand

### 3.1 Store Organization Pattern

**WHY:** Separating stores by domain creates maintainable, focused state management.

**✅ DO:**

```typescript
// state/useTimelineStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

type TimelineStore = {
  // State
  timeline: Timeline | null;

  // Actions
  setTimeline: (timeline: Timeline | null) => void;
  addClip: (clip: Clip) => void;
  updateClip: (id: string, patch: Partial<Clip>) => void;
  removeClip: (id: string) => void;
};

export const useTimelineStore = create<TimelineStore>()(
  immer((set, get) => ({
    timeline: null,

    setTimeline: (timeline) =>
      set((state) => {
        state.timeline = timeline;
      }),

    addClip: (clip) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips.push(clip);
      }),

    updateClip: (id, patch) =>
      set((state) => {
        const clip = state.timeline?.clips.find((c) => c.id === id);
        if (clip) {
          Object.assign(clip, patch);
        }
      }),

    removeClip: (id) =>
      set((state) => {
        if (!state.timeline) return;
        state.timeline.clips = state.timeline.clips.filter((c) => c.id !== id);
      }),
  }))
);
```

**❌ DON'T:**

```typescript
// One massive store for everything
const useAppStore = create((set) => ({
  // Timeline state
  timeline: null,
  // Playback state
  isPlaying: false,
  // Selection state
  selectedClips: [],
  // History state
  history: [],
  // ... 100 more properties
  // This becomes unmaintainable!
}));
```

**Pattern Location:** `state/useTimelineStore.ts`

---

### 3.2 Using Immer for Immutable Updates

**WHY:** Immer allows writing mutable-style code that produces immutable updates, preventing bugs.

**✅ DO:**

```typescript
import { immer } from 'zustand/middleware/immer';

export const useTimelineStore = create<TimelineStore>()(
  immer((set) => ({
    timeline: null,

    updateClip: (id, patch) =>
      set((state) => {
        // Looks mutable but produces immutable update!
        const clip = state.timeline?.clips.find((c) => c.id === id);
        if (clip) {
          Object.assign(clip, patch);
        }
      }),
  }))
);
```

**❌ DON'T:**

```typescript
// Manual immutable updates (error-prone)
export const useTimelineStore = create<TimelineStore>((set) => ({
  updateClip: (id, patch) =>
    set((state) => ({
      ...state,
      timeline: state.timeline
        ? {
            ...state.timeline,
            clips: state.timeline.clips.map((clip) =>
              clip.id === id ? { ...clip, ...patch } : clip
            ),
          }
        : null,
    })),
  // Easy to forget spread operators and introduce bugs!
}));
```

**Pattern Location:** `state/useTimelineStore.ts` line 24

---

### 3.3 Selector Pattern for Derived State

**WHY:** Selectors compute derived state efficiently and prevent unnecessary re-renders.

**✅ DO:**

```typescript
// state/selectors.ts
export const selectClipById = (state: TimelineStore, clipId: string) =>
  state.timeline?.clips.find((clip) => clip.id === clipId);

export const selectTotalDuration = (state: TimelineStore) =>
  state.timeline?.clips.reduce((total, clip) => {
    return Math.max(total, clip.timelinePosition + (clip.end - clip.start));
  }, 0) ?? 0;

// Usage
function ClipEditor({ clipId }: { clipId: string }) {
  const clip = useTimelineStore((state) => selectClipById(state, clipId));
  // Only re-renders when this specific clip changes!
}
```

**❌ DON'T:**

```typescript
// No selectors, manual computation in components
function ClipEditor({ clipId }: { clipId: string }) {
  const timeline = useTimelineStore((state) => state.timeline);
  // Re-renders on ANY timeline change, even unrelated clips!
  const clip = timeline?.clips.find((c) => c.id === clipId);
}
```

**Pattern Location:** `state/selectors.ts`

---

## API Route Design

### 4.1 Authentication Middleware Pattern

**WHY:** Centralized authentication logic ensures consistency and reduces boilerplate.

**✅ DO:**

```typescript
// app/api/projects/route.ts
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';

async function handleProjectCreate(request: NextRequest, context: AuthContext) {
  const { user, supabase } = context;
  // User is guaranteed to be authenticated here!

  const body = await request.json();
  // ... business logic
}

// Export with authentication and rate limiting
export const POST = withAuth(handleProjectCreate, {
  route: '/api/projects',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
```

**❌ DON'T:**

```typescript
// Manual authentication in every route
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Repeating this in every API route!
}
```

**Pattern Location:** `lib/api/withAuth.ts` lines 85-268

---

### 4.2 Standardized Error Responses

**WHY:** Consistent error format makes client-side error handling predictable.

**✅ DO:**

```typescript
// lib/api/errorResponse.ts
import { errorResponse, ErrorResponses } from '@/lib/api/errorResponse';

// In your API route
export async function POST(request: NextRequest) {
  // Specific error types
  return ErrorResponses.badRequest('Invalid project ID', { projectId });
  return ErrorResponses.unauthorized('Session expired', { userId });
  return ErrorResponses.notFound('Project not found', { projectId });
  return ErrorResponses.tooManyRequests('Rate limit exceeded', { userId });
  return ErrorResponses.internal('Database error', { error: err.message });
}

// All errors follow this format:
// { "error": "Error message" }
```

**❌ DON'T:**

```typescript
// Inconsistent error formats
return NextResponse.json({ message: 'Error' }, { status: 400 });
return NextResponse.json({ error: 'Failed', details: 'Something' }, { status: 500 });
return NextResponse.json({ err: 'Bad request' }, { status: 400 });
// Client can't handle different formats!
```

**Pattern Location:** `lib/api/errorResponse.ts` lines 74-125

---

### 4.3 Rate Limiting Strategy

**WHY:** Prevents abuse and ensures fair resource allocation across users.

**✅ DO:**

```typescript
// Use tiered rate limits based on operation cost
import { RATE_LIMITS } from '@/lib/rateLimit';
import { withAuth } from '@/lib/api/withAuth';

export const RATE_LIMITS = {
  // TIER 1: 5/min - Authentication, payment, admin operations
  tier1_auth_payment: { max: 5, windowMs: 60 * 1000 },

  // TIER 2: 10/min - Expensive resource creation (AI generation, uploads)
  tier2_resource_creation: { max: 10, windowMs: 60 * 1000 },

  // TIER 3: 30/min - Status checks and read operations
  tier3_status_read: { max: 30, windowMs: 60 * 1000 },

  // TIER 4: 60/min - General API operations
  tier4_general: { max: 60, windowMs: 60 * 1000 },
} as const;

// TIER 1 Examples: Admin and payment operations (5 req/min)
export const POST = withAuth(handleChangeTier, {
  route: '/api/admin/change-tier',
  rateLimit: RATE_LIMITS.tier1_auth_payment,
});

export const POST = withAuth(handleStripeCheckout, {
  route: '/api/stripe/checkout',
  rateLimit: RATE_LIMITS.tier1_auth_payment,
});

// TIER 2 Examples: AI generation and resource creation (10 req/min)
export const POST = withAuth(handleVideoGenerate, {
  route: '/api/video/generate',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});

export const POST = withAuth(handleImageGenerate, {
  route: '/api/image/generate',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});

export const POST = withAuth(handleAssetUpload, {
  route: '/api/assets/upload',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});

// TIER 3 Examples: Status checks and read operations (30 req/min)
export const GET = withAuth(handleVideoStatus, {
  route: '/api/video/status',
  rateLimit: RATE_LIMITS.tier3_status_read,
});

export const GET = withAuth(handleAssetsList, {
  route: '/api/assets',
  rateLimit: RATE_LIMITS.tier3_status_read,
});

// TIER 4 Examples: General operations (60 req/min)
export const POST = withAuth(handleLogEvent, {
  route: '/api/logs',
  rateLimit: RATE_LIMITS.tier4_general,
});
```

**❌ DON'T:**

```typescript
// Same limit for all operations
const RATE_LIMIT = { max: 100, windowMs: 60000 };
// Video generation gets same limit as status check? Bad!

// Custom limits instead of using tier constants
export const POST = withAuth(handleAdminAction, {
  route: '/api/admin/cache',
  rateLimit: { max: 5, windowMs: 60 * 1000 }, // ❌ Use tier1_auth_payment!
});

// Missing rate limiting entirely
export const POST = withAuth(handleCreate, {
  route: '/api/expensive-operation',
  // ❌ No rateLimit specified!
});
```

**Rate Limiting Decision Guide:**

- **Use TIER 1** for: Admin operations, payment processing, account deletion
- **Use TIER 2** for: AI generation (video, image, audio), video processing (upscale, scene detection), file uploads, exports
- **Use TIER 3** for: Status polling, asset listing, read-only operations
- **Use TIER 4** for: Client-side logging, chat messages, general CRUD

**Pattern Location:** `lib/rateLimit.ts` lines 314-369

---

### 4.4 Request Validation Pattern

**WHY:** Validates input early to prevent invalid data from reaching business logic.

**✅ DO:**

```typescript
import { validateAll, validateString, validateUUID } from '@/lib/api/validation';

async function handleCreate(request: NextRequest, context: AuthContext) {
  const body = await request.json();

  // Validate all fields
  const validation = validateAll([
    validateString(body.prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
    validateUUID(body.projectId, 'projectId'),
    validateEnum(body.model, 'model', ['veo-002', 'veo-003']),
  ]);

  if (!validation.valid) {
    return errorResponse(
      validation.errors[0]?.message ?? 'Invalid input',
      400,
      validation.errors[0]?.field
    );
  }

  // Validation passed, business logic here
}
```

**❌ DON'T:**

```typescript
// No validation
async function handleCreate(request: NextRequest) {
  const body = await request.json();
  // Directly use body.prompt - could be undefined, empty, or malicious!
  await generateVideo(body.prompt);
}
```

**Pattern Location:** `lib/validation.ts`

---

## Service Layer Architecture

### 5.1 Service Layer Pattern

**WHY:** Separates business logic from API routes, making code testable and reusable.

**✅ DO:**

```typescript
// lib/services/projectService.ts
import { SupabaseClient } from '@supabase/supabase-js';

export class ProjectService {
  constructor(private supabase: SupabaseClient) {}

  async createProject(userId: string, options: CreateProjectOptions): Promise<Project> {
    try {
      const { data: project, error: dbError } = await this.supabase
        .from('projects')
        .insert({
          title: options.title ?? 'Untitled Project',
          user_id: userId,
          timeline_state_jsonb: options.initialState ?? {},
        })
        .select()
        .single();

      if (dbError) {
        trackError(dbError, {
          category: ErrorCategory.DATABASE,
          severity: ErrorSeverity.HIGH,
          context: { userId, title: options.title },
        });
        throw new Error(`Failed to create project: ${dbError.message}`);
      }

      if (!project) {
        throw new Error('Project creation returned no data');
      }

      await invalidateUserProjects(userId);
      return project as Project;
    } catch (error) {
      trackError(error, {
        category: ErrorCategory.DATABASE,
        severity: ErrorSeverity.HIGH,
        context: { userId },
      });
      throw error;
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    // Try cache first
    const cacheKey = CacheKeys.userProjects(userId);
    const cached = await cache.get<Project[]>(cacheKey);
    if (cached) return cached;

    // Fetch from database
    const { data: projects, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new Error(`Failed to fetch projects: ${error.message}`);

    // Cache the result
    await cache.set(cacheKey, projects || [], CacheTTL.userProjects);
    return projects || [];
  }
}

// Usage in API route
async function handleProjectCreate(request: NextRequest, context: AuthContext) {
  const { user, supabase } = context;

  const projectService = new ProjectService(supabase);
  const project = await projectService.createProject(user.id, { title: 'My Project' });

  return successResponse(project);
}
```

**❌ DON'T:**

```typescript
// Business logic in API route
async function handleProjectCreate(request: NextRequest) {
  const body = await request.json();

  // All business logic here - not reusable or testable!
  const { data: project } = await supabase.from('projects').insert({...});
  await invalidateCache();
  await trackEvent();
  // ... 100 more lines
}
```

**Pattern Location:** `lib/services/projectService.ts`

---

### 5.2 Dependency Injection Pattern

**WHY:** Makes services testable by allowing mock injection.

**✅ DO:**

```typescript
// Service accepts dependencies
export class ProjectService {
  constructor(
    private supabase: SupabaseClient,
    private cache: CacheService = defaultCache,
    private logger: Logger = defaultLogger
  ) {}
}

// Easy to test with mocks
const mockSupabase = createMockSupabaseClient();
const mockCache = createMockCache();
const service = new ProjectService(mockSupabase, mockCache);
```

**❌ DON'T:**

```typescript
// Hard-coded dependencies
export class ProjectService {
  async createProject() {
    const supabase = createSupabaseClient(); // Hard-coded!
    // Can't test without real Supabase connection
  }
}
```

---

## Error Handling

### 6.1 Custom Error Classes

**WHY:** Custom errors provide structure and enable type-safe error handling.

**✅ DO:**

```typescript
// lib/validation.ts
export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
try {
  validateUUID(projectId, 'Project ID');
} catch (error) {
  if (error instanceof ValidationError) {
    // Type-safe access to field and code
    console.error(`Validation failed on ${error.field}: ${error.message}`);
  }
}
```

**❌ DON'T:**

```typescript
// Generic error throwing
throw new Error('Validation failed: invalid ID on field projectId');
// No structured data, hard to parse!
```

**Pattern Location:** `lib/validation.ts` lines 19-28

---

### 6.2 Error Tracking and Logging

**WHY:** Centralized error tracking helps debug production issues.

**✅ DO:**

```typescript
import { trackError, ErrorCategory, ErrorSeverity } from '@/lib/errorTracking';

try {
  await riskyOperation();
} catch (error) {
  trackError(error, {
    category: ErrorCategory.DATABASE,
    severity: ErrorSeverity.HIGH,
    context: { userId, projectId, operation: 'createProject' },
  });
  throw error; // Re-throw after tracking
}
```

**❌ DON'T:**

```typescript
// Silent failures
try {
  await riskyOperation();
} catch (error) {
  // Swallowed! No one knows this failed
}
```

---

### 6.3 Graceful Error Recovery

**WHY:** Fallback mechanisms prevent total system failure.

**✅ DO:**

```typescript
// lib/rateLimit.ts
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const client = getSupabaseClient();

  // Fallback to in-memory if database unavailable
  if (!client) {
    return checkRateLimitMemory(identifier, config);
  }

  try {
    // Try database-backed rate limiting
    const result = await client.rpc('increment_rate_limit', {...});
    return result;
  } catch (error) {
    serverLogger.error({ event: 'rateLimit.error', error }, 'Rate limit check failed');
    // Fallback to in-memory
    return checkRateLimitMemory(identifier, config);
  }
}
```

**❌ DON'T:**

```typescript
// No fallback
export async function checkRateLimit(identifier: string) {
  const client = getSupabaseClient();
  // Throws if Supabase unavailable - entire API fails!
  return await client.rpc('increment_rate_limit', {...});
}
```

**Pattern Location:** `lib/rateLimit.ts` lines 187-274

---

## Validation Patterns

### 7.1 Assertion Functions for Type Narrowing

**WHY:** Type assertions provide both runtime validation and TypeScript type narrowing.

**✅ DO:**

```typescript
export function validateUUID(value: unknown, fieldName: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string`);
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) {
    throw new ValidationError(`Invalid ${fieldName} format`);
  }
  // TypeScript now knows value is a string!
}

// Usage
function processProject(id: unknown) {
  validateUUID(id, 'Project ID'); // Throws if invalid
  const uppercase = id.toUpperCase(); // ✅ TypeScript knows id is string
}
```

**Pattern Location:** `lib/validation.ts` lines 33-42

---

### 7.2 Composable Validation

**WHY:** Enables building complex validation from simple rules.

**✅ DO:**

```typescript
import { validateAll, validateString, validateUUID, validateEnum } from '@/lib/api/validation';

const validation = validateAll([
  validateString(body.prompt, 'prompt', { minLength: 3, maxLength: 1000 }),
  validateUUID(body.projectId, 'projectId'),
  validateEnum(body.model, 'model', ['veo-002', 'veo-003']),
]);

if (!validation.valid) {
  return errorResponse(validation.errors[0]?.message, 400);
}
```

**Pattern Location:** `lib/validation.ts`

---

## Testing Practices

### 8.1 AAA Pattern (Arrange-Act-Assert)

**WHY:** Structured tests are easier to understand and maintain.

**✅ DO:**

```typescript
describe('useEditorStore', () => {
  it('should add clip to timeline', () => {
    // Arrange - Set up test data
    const { result } = renderHook(() => useEditorStore());
    const mockTimeline = createMockTimeline();
    const mockClip = createMockClip();

    // Act - Perform the action
    act(() => {
      result.current.setTimeline(mockTimeline);
      result.current.addClip(mockClip);
    });

    // Assert - Verify the result
    expect(result.current.timeline?.clips).toHaveLength(1);
    expect(result.current.timeline?.clips[0]).toEqual(mockClip);
  });
});
```

**❌ DON'T:**

```typescript
it('test', () => {
  const result = renderHook(() => useEditorStore());
  result.current.addClip(mockClip);
  expect(result.current.timeline?.clips).toHaveLength(1);
  result.current.removeClip(mockClip.id);
  // Testing multiple things, unclear structure
});
```

**Pattern Location:** `__tests__/state/useEditorStore.test.ts`

---

### 8.2 Test Helper Functions

**WHY:** Reduces boilerplate and ensures consistency across tests.

**✅ DO:**

```typescript
// test-utils/mockSupabase.ts
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
  };
}

export function createMockUser(overrides?: Partial<User>): User {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

// Usage in tests
const mockSupabase = createMockSupabaseClient();
const mockUser = createMockUser({ email: 'custom@example.com' });
```

**Pattern Location:** `test-utils/mockSupabase.ts`

---

### 8.3 Descriptive Test Names

**WHY:** Clear test names document behavior and make failures easy to diagnose.

**✅ DO:**

```typescript
describe('POST /api/video/generate', () => {
  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      // ...
    });
  });

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      // ...
    });

    it('should apply expensive rate limit for video generation', async () => {
      // ...
    });
  });

  describe('Video Generation - Google Veo', () => {
    it('should generate video with Veo for Google models', async () => {
      // ...
    });
  });
});
```

**❌ DON'T:**

```typescript
describe('API', () => {
  it('test 1', () => {});
  it('test 2', () => {});
  it('works', () => {});
  // Unclear what's being tested!
});
```

**Pattern Location:** `__tests__/api/video/generate.test.ts`

---

## Performance Optimization

### 9.1 Caching Strategy

**WHY:** Reduces database queries and improves response times.

**✅ DO:**

```typescript
// lib/services/projectService.ts
async getUserProjects(userId: string): Promise<Project[]> {
  // Try cache first
  const cacheKey = CacheKeys.userProjects(userId);
  const cached = await cache.get<Project[]>(cacheKey);

  if (cached) {
    return cached;
  }

  // Fetch from database
  const { data: projects } = await this.supabase
    .from('projects')
    .select('*')
    .eq('user_id', userId);

  const projectsList = projects || [];

  // Cache the result
  await cache.set(cacheKey, projectsList, CacheTTL.userProjects);

  return projectsList;
}
```

**Pattern Location:** `lib/services/projectService.ts` lines 122-162

---

### 9.2 Cache Invalidation Pattern

**WHY:** Ensures cached data stays fresh after mutations.

**✅ DO:**

```typescript
// lib/cacheInvalidation.ts
export async function invalidateProjectCache(projectId: string, userId: string): Promise<void> {
  await Promise.all([
    cache.delete(CacheKeys.projectMetadata(projectId)),
    cache.delete(CacheKeys.userProjects(userId)),
  ]);
}

// Always invalidate after mutations
async function updateProject(projectId: string, userId: string, data: UpdateData) {
  await supabase.from('projects').update(data).eq('id', projectId);
  await invalidateProjectCache(projectId, userId); // Keep cache fresh!
}
```

**Pattern Location:** `lib/cacheInvalidation.ts`

---

### 9.3 Debouncing Expensive Operations

**WHY:** Prevents excessive API calls or re-renders during rapid user input.

**✅ DO:**

```typescript
import { useDebounce } from '@/lib/hooks/useDebounce';

function SearchComponent() {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    // Only called after user stops typing for 500ms
    if (debouncedSearchTerm) {
      fetchSearchResults(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm]);

  return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
}
```

**Pattern Location:** `lib/hooks/useDebounce.ts`

---

## Security Practices

### 10.1 Input Validation and Sanitization

**WHY:** Prevents injection attacks and invalid data.

**✅ DO:**

```typescript
import { validateUUID, validateStringLength } from '@/lib/validation';

async function handleRequest(request: NextRequest) {
  const body = await request.json();

  // Validate all inputs
  validateUUID(body.projectId, 'Project ID');
  validateStringLength(body.prompt, 'Prompt', 3, 1000);

  // Inputs are now safe to use
}
```

**Pattern Location:** `lib/validation.ts`

---

### 10.2 Authentication and Authorization

**WHY:** Ensures users can only access their own resources.

**✅ DO:**

```typescript
// lib/api/withAuth.ts
export function withAuth<TParams>(handler: AuthenticatedHandler<TParams>, options: AuthOptions) {
  return async (request: NextRequest, context: { params: Promise<TParams> }) => {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      await auditSecurityEvent(AuditAction.SECURITY_UNAUTHORIZED_ACCESS, null, request, {
        route: options.route,
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // User is authenticated, proceed
    return await handler(request, { user, supabase, params: await context.params });
  };
}
```

**Pattern Location:** `lib/api/withAuth.ts`

---

### 10.3 Rate Limiting for Security

**WHY:** Prevents brute force attacks and resource exhaustion.

**✅ DO:**

```typescript
// Strict rate limits for sensitive operations
export const POST = withAuth(handleAuthentication, {
  route: '/api/auth/signin',
  rateLimit: RATE_LIMITS.tier1_auth_payment, // Only 5 requests per minute
});

// More relaxed for read operations
export const GET = withAuth(handleGetProjects, {
  route: '/api/projects',
  rateLimit: RATE_LIMITS.tier3_status_read, // 30 requests per minute
});
```

**Pattern Location:** `lib/rateLimit.ts` lines 314-333

---

## Logging and Monitoring

### 11.1 Structured Logging

**WHY:** Structured logs are queryable and provide context for debugging.

**✅ DO:**

```typescript
import { serverLogger } from '@/lib/serverLogger';

serverLogger.info(
  {
    event: 'projects.create.success',
    userId: user.id,
    projectId: project.id,
    title: project.title,
    duration: Date.now() - startTime,
  },
  `Project created successfully in ${duration}ms`
);

serverLogger.error(
  {
    event: 'projects.create.error',
    userId: user.id,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  },
  'Failed to create project'
);
```

**❌ DON'T:**

```typescript
// Unstructured logging
console.log('Project created');
console.error('Error:', error);
// No context, hard to query!
```

---

### 11.2 Event-Driven Logging

**WHY:** Consistent event names enable tracking workflows across services.

**✅ DO:**

```typescript
// Consistent event naming: domain.action.status
serverLogger.info({ event: 'projects.create.request_started' }, 'Starting project creation');
serverLogger.info({ event: 'projects.create.validating' }, 'Validating input');
serverLogger.info({ event: 'projects.create.database_insert' }, 'Inserting into database');
serverLogger.info({ event: 'projects.create.success' }, 'Project created successfully');
```

**Pattern Location:** `app/api/projects/route.ts`

---

## Code Organization

### 12.1 File Naming Conventions

**WHY:** Consistent naming makes files easy to find and understand.

**✅ DO:**

```
types/
  branded.ts           # Branded type definitions
  api.ts              # API request/response types
  timeline.ts         # Timeline-related types

lib/
  services/
    projectService.ts  # Service classes (camelCase + Service suffix)
    userService.ts
  hooks/
    useDebounce.ts    # Custom hooks (camelCase + use prefix)
    useAutosave.ts
  api/
    withAuth.ts       # API utilities (camelCase)
    errorResponse.ts

components/
  ui/
    Button.tsx        # UI components (PascalCase)
    Dialog.tsx
  editor/
    TimelineView.tsx  # Feature components (PascalCase)

__tests__/
  api/
    projects.test.ts  # Test files (match source + .test suffix)
  components/
    Button.test.tsx
```

---

### 12.2 Import Organization

**WHY:** Organized imports improve readability and prevent merge conflicts.

**✅ DO:**

```typescript
// 1. React and Next.js imports
import { NextRequest, NextResponse } from 'next/server';
import { useState, useEffect } from 'react';

// 2. Third-party libraries
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// 3. Absolute imports from @/
import { serverLogger } from '@/lib/serverLogger';
import { withAuth } from '@/lib/api/withAuth';
import type { Project } from '@/types/api';

// 4. Relative imports
import { helper } from './helper';
import type { LocalType } from './types';
```

**❌ DON'T:**

```typescript
// Mixed order
import type { Project } from '@/types/api';
import { useState } from 'react';
import { helper } from './helper';
import { NextRequest } from 'next/server';
// Confusing and hard to scan!
```

---

### 12.3 Directory Structure

**WHY:** Clear structure makes navigation intuitive.

```
/app                    # Next.js App Router
  /api                 # API routes
    /projects          # Resource-based organization
      route.ts         # GET, POST /api/projects
      [projectId]/     # Dynamic routes
        route.ts       # GET, PUT, DELETE /api/projects/:id
  /editor              # Page routes
    [projectId]/
      page.tsx

/lib                    # Shared utilities
  /api                 # API-specific utilities
  /hooks               # Custom React hooks
  /services            # Business logic services
  /utils               # Pure utility functions
  /errors              # Error handling
  /config              # Configuration

/components             # React components
  /ui                  # Reusable UI components
  /editor              # Feature-specific components
  /providers           # Context providers

/state                  # Zustand stores
  useTimelineStore.ts
  usePlaybackStore.ts
  selectors.ts         # Reusable selectors

/types                  # TypeScript types
  api.ts               # API types
  branded.ts           # Branded types
  timeline.ts          # Domain types

/__tests__              # Tests (mirrors src structure)
  /api
  /components
  /lib

/docs                   # Documentation
```

---

## Migration Guide for Old Code

### Updating to New Patterns

When you encounter code that doesn't follow these patterns:

1. **Identify the Pattern Violation**
   - Check against this document
   - Note the pattern category (e.g., "Error Handling", "Validation")

2. **Refactor Incrementally**
   - Don't refactor everything at once
   - Focus on high-impact areas first (authentication, validation, error handling)
   - Write tests before refactoring

3. **Example Migration:**

**Before:**

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  const { data } = await supabase.from('projects').insert({
    title: body.title,
    user_id: user.id,
  });

  return NextResponse.json(data);
}
```

**After:**

```typescript
async function handleProjectCreate(request: NextRequest, context: AuthContext) {
  const { user, supabase } = context;
  const body = await request.json();

  // Validate input
  const validation = validateAll([
    validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
  ]);

  if (!validation.valid) {
    return errorResponse(validation.errors[0]?.message, 400);
  }

  // Use service layer
  const projectService = new ProjectService(supabase);
  const project = await projectService.createProject(user.id, { title: body.title });

  return successResponse(project);
}

export const POST = withAuth(handleProjectCreate, {
  route: '/api/projects',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
```

---

## Summary Checklist

Before merging code, ensure:

- [ ] TypeScript strict mode is satisfied (no `any`, proper types)
- [ ] Branded types are used for IDs
- [ ] API routes use `withAuth` middleware
- [ ] Errors are handled with `errorResponse` helpers
- [ ] Input validation is performed with assertion functions
- [ ] Service layer is used for business logic
- [ ] Tests follow AAA pattern
- [ ] Structured logging is used
- [ ] Rate limiting is applied appropriately
- [ ] Caching is implemented and invalidated correctly
- [ ] Code is organized according to conventions
- [ ] Documentation is updated

---

## Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [React Best Practices](https://react.dev/learn)
- [Next.js Documentation](https://nextjs.org/docs)
- [Zustand Guide](https://docs.pmnd.rs/zustand)
- [Service Layer Guide](./SERVICE_LAYER_GUIDE.md)
- [API Documentation](./api/)
- [Testing Guide](./TESTING.md)

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
