# Architecture Overview

> **Comprehensive guide to the architectural design and patterns of the Non-Linear Video Editor application.**

**Last Updated:** October 23, 2025
**Technology Stack:** Next.js 16, React 19, TypeScript 5, Zustand, Supabase

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Application Layers](#application-layers)
3. [State Management Architecture](#state-management-architecture)
4. [API Architecture](#api-architecture)
5. [Data Flow](#data-flow)
6. [Authentication & Authorization](#authentication--authorization)
7. [Error Handling Architecture](#error-handling-architecture)
8. [Caching Strategy](#caching-strategy)
9. [Performance Architecture](#performance-architecture)
10. [Security Architecture](#security-architecture)
11. [Testing Architecture](#testing-architecture)
12. [Deployment Architecture](#deployment-architecture)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (Browser)                     │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │React       │  │Zustand       │  │Service Workers      │ │
│  │Components  │←→│State Stores  │  │(Future)             │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application Server                 │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │App Router  │←→│Middleware    │  │API Routes           │ │
│  │(Pages)     │  │(Auth)        │  │(/api/*)             │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │Service     │←→│Validation    │  │Error Handling       │ │
│  │Layer       │  │Layer         │  │                     │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                     External Services                        │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │Supabase    │  │Google Cloud  │  │Stripe               │ │
│  │(Auth, DB,  │  │(Veo, Imagen, │  │(Payments)           │ │
│  │ Storage)   │  │ Gemini)      │  │                     │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
│  ┌────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │FAL.ai      │  │ElevenLabs    │  │Axiom                │ │
│  │(Video Gen) │  │(Audio TTS)   │  │(Logging/Analytics)  │ │
│  └────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**

- **React 19.2** - UI library
- **Next.js 16** - Framework (App Router)
- **TypeScript 5** - Type safety
- **Tailwind CSS 4** - Styling
- **Zustand 5** - State management
- **Immer** - Immutable state updates

**Backend:**

- **Next.js API Routes** - Backend API
- **Supabase** - Authentication, PostgreSQL database, Storage
- **Node.js 18+** - Runtime

**External Services:**

- **Google Cloud (Vertex AI)** - Video (Veo), Image (Imagen), Chat (Gemini)
- **FAL.ai** - Alternative video generation models
- **ElevenLabs** - Text-to-speech and sound effects
- **Stripe** - Payment processing
- **Axiom** - Logging and analytics

**Development Tools:**

- **Jest** - Unit testing
- **Playwright** - E2E testing
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Husky** - Git hooks

---

## Application Layers

### Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Presentation Layer                        │
│           (React Components, UI, User Interactions)          │
│                    /components, /app                         │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    State Management Layer                    │
│            (Zustand Stores, Selectors, Actions)              │
│                         /state                               │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                        API Layer                             │
│          (Next.js API Routes, Authentication)                │
│                      /app/api                                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│         (Business Logic, Domain Services)                    │
│                    /lib/services                             │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                      Data Access Layer                       │
│            (Supabase Client, Database Queries)               │
│                      /lib/supabase                           │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                         Database                             │
│                  (Supabase PostgreSQL)                       │
└─────────────────────────────────────────────────────────────┘
```

### Layer Responsibilities

**1. Presentation Layer** (`/components`, `/app`)

- React components for UI
- User interaction handling
- Client-side routing
- Form handling and validation
- Visual feedback and loading states

**2. State Management Layer** (`/state`)

- Global state management with Zustand
- State persistence
- Computed/derived state (selectors)
- State synchronization across components

**3. API Layer** (`/app/api`)

- HTTP endpoint handlers
- Request/response formatting
- Authentication middleware
- Rate limiting
- Request validation

**4. Service Layer** (`/lib/services`)

- Business logic implementation
- Domain operations
- External service integration
- Caching logic
- Error handling and recovery

**5. Data Access Layer** (`/lib/supabase`)

- Database queries
- Storage operations
- Real-time subscriptions
- Data transformations

---

## State Management Architecture

### Zustand Store Organization

**Separated by Domain:**

```
state/
├── useTimelineStore.ts      # Timeline state (clips, tracks, markers)
├── usePlaybackStore.ts      # Playback state (playing, currentTime)
├── useSelectionStore.ts     # Selection state (selected clips)
├── useHistoryStore.ts       # Undo/redo history
├── useEditorStore.ts        # Combined editor state
├── useClipboardStore.ts     # Copy/paste operations
├── selectors.ts             # Reusable state selectors
└── index.ts                 # Exports
```

### Store Pattern

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
    // ... more actions
  }))
);
```

### State Flow

```
User Action
    ↓
Event Handler (Component)
    ↓
Store Action (Zustand)
    ↓
State Update (Immer)
    ↓
Component Re-render
    ↓
UI Update
```

---

## API Architecture

### API Route Organization

```
app/api/
├── auth/                    # Authentication endpoints
│   └── signout/
│       └── route.ts
├── projects/                # Project CRUD
│   ├── route.ts            # GET (list), POST (create)
│   └── [projectId]/
│       ├── route.ts        # GET (one), PUT (update), DELETE
│       └── chat/           # Project chat
│           ├── route.ts
│           └── messages/
│               └── route.ts
├── video/                   # Video generation
│   ├── generate/
│   │   └── route.ts
│   ├── status/
│   │   └── route.ts
│   ├── upscale/
│   │   └── route.ts
│   └── split-scenes/
│       └── route.ts
├── image/                   # Image generation
│   └── generate/
│       └── route.ts
├── audio/                   # Audio generation
│   ├── elevenlabs/
│   │   ├── generate/
│   │   ├── voices/
│   │   └── sfx/
│   └── suno/
│       ├── generate/
│       └── status/
└── assets/                  # Asset management
    ├── upload/
    └── [assetId]/
```

### API Route Pattern

**Standard Structure:**

```typescript
// app/api/projects/route.ts
import { withAuth, type AuthContext } from '@/lib/api/withAuth';
import { RATE_LIMITS } from '@/lib/rateLimit';
import { errorResponse, successResponse } from '@/lib/api/response';

// Handler function (receives authenticated context)
async function handleProjectCreate(request: NextRequest, context: AuthContext) {
  const { user, supabase } = context;

  // 1. Parse request body
  const body = await request.json();

  // 2. Validate input
  const validation = validateAll([
    validateString(body.title, 'title', { minLength: 1, maxLength: 200 }),
  ]);

  if (!validation.valid) {
    return errorResponse(validation.errors[0]?.message, 400);
  }

  // 3. Use service layer
  const projectService = new ProjectService(supabase);
  const project = await projectService.createProject(user.id, { title: body.title });

  // 4. Return response
  return successResponse(project);
}

// Export with middleware
export const POST = withAuth(handleProjectCreate, {
  route: '/api/projects',
  rateLimit: RATE_LIMITS.tier2_resource_creation,
});
```

### Middleware Stack

```
Request
    ↓
Middleware (/middleware.ts)
    │
    ├─ Check Supabase config
    ├─ Create Supabase client
    ├─ Refresh auth session
    ├─ Protect /editor routes
    └─ Redirect authenticated users
    ↓
API Route Handler
    ↓
withAuth Middleware
    │
    ├─ Verify authentication
    ├─ Check rate limiting
    ├─ Create auth context
    └─ Log request
    ↓
Handler Function
    │
    ├─ Validate input
    ├─ Call service layer
    ├─ Handle errors
    └─ Return response
    ↓
Response
```

---

## Data Flow

### Read Operation Flow

```
Component
    ↓
(1) Read from Zustand store
    ↓
(2) If not in store, fetch from API
    ↓
API Route (/app/api/*)
    ↓
(3) Check cache (Redis/Memory)
    ↓
(4) If cache miss, query database
    ↓
Service Layer (/lib/services/*)
    ↓
Supabase Client
    ↓
PostgreSQL Database
    ↓
(5) Return data
    ↓
(6) Update cache
    ↓
(7) Update Zustand store
    ↓
Component re-renders
```

### Write Operation Flow

```
Component
    ↓
(1) Call Zustand action
    ↓
(2) Optimistically update UI
    ↓
(3) Send API request
    ↓
API Route (/app/api/*)
    ↓
(4) Validate input
    ↓
(5) Call service layer
    ↓
Service Layer (/lib/services/*)
    ↓
(6) Write to database
    ↓
(7) Invalidate cache
    ↓
(8) Return success/error
    ↓
(9) Update Zustand with server response
    ↓
Component re-renders with final state
```

---

## Authentication & Authorization

### Authentication Flow

```
User
    ↓
Sign In Form
    ↓
Supabase Auth
    │
    ├─ Create session
    ├─ Set HTTP-only cookie
    └─ Return user object
    ↓
Middleware (middleware.ts)
    │
    ├─ Verify session cookie
    ├─ Refresh if needed
    └─ Redirect if unauthorized
    ↓
Protected Routes/API
    │
    ├─ withAuth middleware
    ├─ Extract user from session
    └─ Inject into handler context
    ↓
Handler with user context
```

### Authorization Pattern

**Row Level Security (RLS):**

```sql
-- Supabase RLS Policy
CREATE POLICY "Users can only access their own projects"
ON projects
FOR ALL
USING (auth.uid() = user_id);
```

**API-Level Authorization:**

```typescript
// lib/api/project-verification.ts
export async function verifyProjectOwnership(
  supabase: SupabaseClient,
  projectId: string,
  userId: string
): Promise<{ hasAccess: boolean; error?: string }> {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id')
    .eq('id', projectId)
    .eq('user_id', userId)
    .single();

  if (error || !project) {
    return { hasAccess: false, error: 'Project not found or access denied' };
  }

  return { hasAccess: true };
}
```

---

## Error Handling Architecture

### Error Flow

```
Error occurs
    ↓
Custom Error Class
    (ValidationError, DatabaseError, etc.)
    ↓
Error Tracking
    (lib/errorTracking.ts)
    │
    ├─ Log to Axiom
    ├─ Categorize error
    └─ Add context
    ↓
Error Response
    (lib/api/errorResponse.ts)
    │
    ├─ Format error
    ├─ Determine status code
    └─ Return to client
    ↓
Client Error Handler
    │
    ├─ Display user-friendly message
    ├─ Update UI state
    └─ Log to browser logger
```

### Error Categories

```typescript
// lib/errorTracking.ts
export enum ErrorCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  EXTERNAL_API = 'EXTERNAL_API',
  RATE_LIMIT = 'RATE_LIMIT',
  NETWORK = 'NETWORK',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW', // Minor issues, user can continue
  MEDIUM = 'MEDIUM', // Significant issues, some features affected
  HIGH = 'HIGH', // Critical issues, major functionality broken
  CRITICAL = 'CRITICAL', // System-wide failure
}
```

---

## Caching Strategy

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser Cache                             │
│            (React Query, Zustand Persistence)                │
│                     TTL: 5-10 minutes                        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Application Cache                           │
│                (Memory Cache, Redis Future)                  │
│                     TTL: 5-60 minutes                        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                    Database Cache                            │
│              (PostgreSQL Query Cache)                        │
│                     TTL: Database-managed                    │
└─────────────────────────────────────────────────────────────┘
```

### Cache Keys

```typescript
// lib/cache.ts
export const CacheKeys = {
  userProjects: (userId: string) => `user:${userId}:projects`,
  projectMetadata: (projectId: string) => `project:${projectId}:metadata`,
  assetList: (projectId: string) => `project:${projectId}:assets`,
  videoStatus: (operationName: string) => `video:${operationName}:status`,
  signedUrl: (assetId: string) => `asset:${assetId}:signedUrl`,
} as const;

export const CacheTTL = {
  userProjects: 5 * 60 * 1000, // 5 minutes
  projectMetadata: 10 * 60 * 1000, // 10 minutes
  assetList: 3 * 60 * 1000, // 3 minutes
  videoStatus: 30 * 1000, // 30 seconds
  signedUrl: 50 * 60 * 1000, // 50 minutes (slightly less than URL expiry)
} as const;
```

### Cache Invalidation

**Pattern:**

```typescript
// lib/cacheInvalidation.ts
export async function invalidateProjectCache(projectId: string, userId: string): Promise<void> {
  await Promise.all([
    cache.delete(CacheKeys.projectMetadata(projectId)),
    cache.delete(CacheKeys.userProjects(userId)),
    cache.delete(CacheKeys.assetList(projectId)),
  ]);
}
```

**When to Invalidate:**

- After creating a resource
- After updating a resource
- After deleting a resource
- When data is stale (TTL expired)

---

## Performance Architecture

### Optimization Strategies

**1. Code Splitting**

```typescript
// app/editor/[projectId]/page.tsx
import dynamic from 'next/dynamic';

// Lazy load heavy components
const Timeline = dynamic(() => import('@/components/timeline/TimelineView'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});

const PreviewPlayer = dynamic(() => import('@/components/preview/PreviewPlayer'), {
  loading: () => <LoadingSpinner />,
  ssr: false,
});
```

**2. Memoization**

```typescript
// components/timeline/TimelineClip.tsx
import React from 'react';

export const TimelineClip = React.memo(({ clip, onUpdate }: TimelineClipProps) => {
  const handleDrag = useCallback((e: DragEvent) => {
    // Handle drag
  }, []);

  const duration = useMemo(() => clip.end - clip.start, [clip.start, clip.end]);

  return <div>{/* Render clip */}</div>;
});
```

**3. Debouncing**

```typescript
// lib/hooks/useAutosave.ts
export function useAutosave(data: unknown, interval: number = 5000) {
  const debouncedData = useDebounce(data, interval);

  useEffect(() => {
    // Save to server
    saveToServer(debouncedData);
  }, [debouncedData]);
}
```

**4. Virtual Scrolling**

- For long lists of assets
- For timeline with many clips
- Reduces DOM nodes

---

## Security Architecture

### Security Layers

**1. Transport Security**

- HTTPS only
- Secure cookies (HttpOnly, Secure, SameSite)

**2. Authentication**

- Supabase Auth
- JWT tokens in HTTP-only cookies
- Session refresh

**3. Authorization**

- Row Level Security (RLS) in database
- API-level ownership verification
- Role-based access control (RBAC)

**4. Input Validation**

- Type checking (TypeScript)
- Runtime validation (assertion functions)
- Sanitization

**5. Rate Limiting**

- Tiered rate limits by operation cost
- User-based and IP-based limiting
- Distributed rate limiting (Supabase-backed)

**6. Content Security**

- Content-Type validation
- File size limits
- MIME type checking

**7. Audit Logging**

- Security events logged
- Authentication attempts
- Admin actions

---

## Testing Architecture

### Test Pyramid

```
                    ┌───────────┐
                    │    E2E    │  10% (Playwright)
                    │  Testing  │
                ┌───┴───────────┴───┐
                │   Integration     │  20% (Jest + API)
                │    Testing        │
            ┌───┴───────────────────┴───┐
            │      Unit Testing         │  70% (Jest)
            │   (Components, Utilities, │
            │    Services, Stores)      │
            └───────────────────────────┘
```

### Test Organization

```
__tests__/
├── api/                    # API route tests
│   ├── video/
│   ├── projects/
│   └── ...
├── components/             # Component tests
│   ├── ui/
│   ├── editor/
│   └── ...
├── lib/                    # Utility tests
│   ├── utils/
│   ├── hooks/
│   └── validation/
├── services/               # Service layer tests
│   ├── projectService.test.ts
│   └── ...
├── state/                  # Store tests
│   ├── useTimelineStore.test.ts
│   └── ...
└── helpers/                # Test helpers
    └── mockSupabase.ts
```

### Test Patterns

**AAA Pattern:**

```typescript
it('should add clip to timeline', () => {
  // Arrange - Set up test data
  const store = useTimelineStore.getState();
  const mockClip = createMockClip();

  // Act - Perform action
  store.addClip(mockClip);

  // Assert - Verify result
  expect(store.timeline.clips).toHaveLength(1);
});
```

---

## Deployment Architecture

### Vercel Deployment

```
GitHub Repository
    ↓
Push to main branch
    ↓
Vercel CI/CD
    │
    ├─ Install dependencies
    ├─ Run type check
    ├─ Run linting
    ├─ Run tests
    ├─ Build Next.js app
    └─ Deploy to Vercel edge
    ↓
Production Environment
    │
    ├─ Edge Functions (API routes)
    ├─ Static assets (CDN)
    └─ Server-side rendering
```

### Environment Variables

**Required:**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key (server-only)
- `GOOGLE_CLOUD_PROJECT` - Google Cloud project ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account JSON

**Optional:**

- `STRIPE_SECRET_KEY` - Stripe API key
- `ELEVENLABS_API_KEY` - ElevenLabs API key
- `FAL_KEY` - FAL.ai API key
- `AXIOM_TOKEN` - Axiom logging token

---

## Key Architectural Decisions

### 1. Why Next.js App Router?

- Server-side rendering for better SEO and initial load
- API routes co-located with pages
- Built-in optimization (images, fonts, etc.)
- Middleware support for authentication

### 2. Why Zustand over Redux?

- Simpler API, less boilerplate
- Better TypeScript support
- Built-in Immer support
- Smaller bundle size
- No context provider required

### 3. Why Service Layer?

- Separates business logic from API handlers
- Makes code testable
- Enables reuse across multiple API routes
- Centralizes database access patterns

### 4. Why Supabase?

- Built-in authentication
- PostgreSQL database with real-time
- Row Level Security
- Object storage
- Good TypeScript support

### 5. Why Tiered Rate Limiting?

- Different operations have different costs
- Prevents abuse while allowing normal usage
- Flexible per-operation configuration

---

## Future Architecture Considerations

### Planned Improvements

1. **Real-time Collaboration**
   - WebSocket connections for live editing
   - Operational Transformation (OT) or CRDTs
   - Presence indicators

2. **Microservices for Heavy Processing**
   - Separate video processing service
   - Queue-based job processing
   - Dedicated worker nodes

3. **Advanced Caching**
   - Redis for distributed caching
   - CDN caching for static assets
   - Service worker for offline support

4. **Observability**
   - Distributed tracing
   - Performance monitoring
   - Error aggregation dashboard

---

## Related Documentation

- [Coding Best Practices](./CODING_BEST_PRACTICES.md)
- [Style Guide](./STYLE_GUIDE.md)
- [Service Layer Guide](./SERVICE_LAYER_GUIDE.md)
- [API Documentation](./api/)
- [Testing Guide](./TESTING.md)
- [Security Guide](./security/)

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
