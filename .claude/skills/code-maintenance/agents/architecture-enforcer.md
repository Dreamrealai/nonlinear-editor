# Agent 4: Architecture Enforcer

## Mission
Validate adherence to architectural patterns and coding best practices specific to this Next.js/React/TypeScript/Supabase video editor project.

## Core Responsibilities

1. **API Route Patterns** - Ensure auth middleware, rate limiting, error handling
2. **Branded Types** - Verify IDs use branded types, not plain strings
3. **Service Layer** - Check business logic is in services, not API routes
4. **State Management** - Validate Zustand patterns and conventions
5. **React Patterns** - Check forwardRef, hooks order, custom hooks extraction
6. **Error Handling** - Ensure consistent error handling patterns
7. **File Organization** - Verify files in correct directories

## Execution Steps

### Step 1: API Route Architecture Validation (4 min)

```typescript
Glob: "app/api/**/route.ts"

For each API route:
  Read: file content

  // Check 1: Authentication Middleware
  Check: Does it export POST/PUT/DELETE/PATCH?
  If YES:
    Check: Does it use withAuth wrapper?
    Pattern: "export const POST = withAuth("

    If NO_AUTH:
      // Verify if intentionally public
      Check: Is there a comment like "// Public endpoint"?

      If NO_COMMENT:
        Add Finding: {
          "severity": "P0",
          "category": "Architecture - Missing Auth",
          "location": "file:line",
          "issue": "API route handler not wrapped with withAuth middleware",
          "recommendation": "Wrap with withAuth(handler, { requireAuth: true })",
          "pattern": "See /docs/CODING_BEST_PRACTICES.md#api-routes"
        }

  // Check 2: Rate Limiting
  Check: Is rate limiting configured?
  Pattern: Look for "rateLimit" in withAuth options

  If NO_RATE_LIMIT:
    Add Finding: {
      "severity": "P1",
      "category": "Architecture - Missing Rate Limit",
      "location": "file",
      "issue": "API route missing rate limiting configuration",
      "recommendation": "Add rateLimit tier: 'standard' | 'strict' | 'relaxed'"
    }

  // Check 3: Input Validation
  Check: Does it validate request body?
  Pattern: Look for assertion functions or validation

  If NO_VALIDATION:
    Add Finding: {
      "severity": "P1",
      "category": "Architecture - Missing Validation",
      "location": "file",
      "issue": "API route not validating input",
      "recommendation": "Add assertion function to validate request body"
    }

  // Check 4: Service Layer Usage
  Check: Does it contain business logic?
  Pattern: Look for complex if/else, loops, calculations in route handler

  If BUSINESS_LOGIC_IN_ROUTE:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Business Logic in Route",
      "location": "file:line",
      "issue": "Business logic should be in service layer, not route handler",
      "recommendation": "Extract to /lib/services/ and call from route"
    }

  // Check 5: Error Handling
  Check: Does it use errorResponse helper?
  Pattern: "return errorResponse(error, 'message')"

  If RAW_ERROR_RESPONSE:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Inconsistent Error Handling",
      "location": "file:line",
      "issue": "Using custom error response instead of errorResponse helper",
      "recommendation": "Replace with errorResponse(error, context)"
    }
```

**Example Valid API Route:**
```typescript
import { withAuth } from '@/lib/auth/withAuth'
import { errorResponse } from '@/lib/utils/errorResponse'
import { assertValidVideoRequest } from '@/lib/utils/assertions'
import { VideoService } from '@/lib/services/VideoService'

export const POST = withAuth(async (req, { user }) => {
  try {
    const body = await req.json()
    assertValidVideoRequest(body) // Input validation

    const videoService = new VideoService() // Service layer
    const result = await videoService.generateVideo(body, user.id)

    return NextResponse.json(result)
  } catch (error) {
    return errorResponse(error, 'Failed to generate video')
  }
}, {
  requireAuth: true,
  rateLimit: 'strict'
})
```

### Step 2: Branded Types Validation (3 min)

```typescript
// Check 1: Type Definitions
Glob: "types/**/*.ts" "lib/**/*.ts"

For each file with ID types:
  Grep: "(UserId|ProjectId|AssetId|ClipId).*=.*string"

  Check: Is it a branded type?
  Pattern: "type UserId = string & { readonly __brand: 'UserId' }"

  If NOT_BRANDED:
    Add Finding: {
      "severity": "P1",
      "category": "Architecture - Missing Branded Type",
      "location": "file:line",
      "issue": "ID type should be branded, not plain string",
      "recommendation": "Change to: type UserId = string & { readonly __brand: 'UserId' }"
    }

// Check 2: Usage in Function Signatures
Grep: "userId.*:\s*string" in app/**/*.ts lib/**/*.ts components/**/*.tsx

For each match:
  Check: Is this a function parameter or prop?

  If ID_PARAMETER:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Untyped ID Parameter",
      "location": "file:line",
      "issue": "Function parameter using 'string' instead of branded type",
      "recommendation": "Change type from 'string' to 'UserId'"
    }

// Check 3: Supabase Foreign Keys
Glob: "supabase/migrations/**/*.sql"

For recent migrations:
  Check: Are foreign key columns using UUID?
  Check: Are corresponding TypeScript types branded?

  Cross-reference: Migration column name with TypeScript types
```

### Step 3: Service Layer Pattern Validation (4 min)

```typescript
Glob: "lib/services/**/*.ts"

For each service file:
  Read: file content

  // Check 1: Dependency Injection Pattern
  Check: Does class constructor accept dependencies?
  Pattern: "constructor(private supabase: SupabaseClient)"

  If NO_DI:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing Dependency Injection",
      "location": "file:line",
      "issue": "Service should accept dependencies via constructor",
      "recommendation": "Add constructor with dependencies as parameters"
    }

  // Check 2: Error Tracking
  Check: Do methods track errors?
  Pattern: Look for "trackError(error, context)"

  If NO_ERROR_TRACKING:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing Error Tracking",
      "location": "file:line",
      "issue": "Service method not tracking errors",
      "recommendation": "Add trackError() call in catch blocks"
    }

  // Check 3: Return Types
  Check: Do all methods have explicit return types?

  If IMPLICIT_RETURN:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing Return Type",
      "location": "file:line",
      "issue": "Service method missing explicit return type",
      "recommendation": "Add return type annotation"
    }

// Check 4: Service Layer Usage
Check: Is business logic properly in services vs routes?

Grep: "new.*Service" in app/api/**/*.ts

For each usage:
  Verify: Service is instantiated and used correctly
  Check: No business logic duplicated in route handler
```

**Example Valid Service:**
```typescript
export class VideoService {
  constructor(
    private supabase: SupabaseClient = createClient()
  ) {}

  async generateVideo(
    request: GenerateVideoRequest,
    userId: UserId
  ): Promise<GenerateVideoResponse> {
    try {
      // Business logic here
    } catch (error) {
      trackError(error, { context: 'VideoService.generateVideo', userId })
      throw error
    }
  }
}
```

### Step 4: Zustand Store Pattern Validation (3 min)

```typescript
Glob: "stores/**/*.ts"

For each store file:
  Read: file content

  // Check 1: Immer Middleware
  Check: Does store use Immer for immutability?
  Pattern: "create<State>()(immer("

  If NO_IMMER:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing Immer Middleware",
      "location": "file",
      "issue": "Zustand store not using Immer middleware",
      "recommendation": "Wrap with immer(): create<State>()(immer(...))"
    }

  // Check 2: Store Separation
  Check: Is store focused on single domain?
  Count: Number of top-level state properties

  If TOO_MANY_PROPERTIES (>10):
    Add Finding: {
      "severity": "P3",
      "category": "Architecture - Monolithic Store",
      "location": "file",
      "issue": "Store has ${count} properties, consider splitting",
      "recommendation": "Split into domain-specific stores"
    }

  // Check 3: Exported Selectors
  Check: Are selectors exported for performance?
  Pattern: "export const selectTimelineClips = (state: State) => state.clips"

  If NO_SELECTORS:
    Add Finding: {
      "severity": "P3",
      "category": "Architecture - Missing Selectors",
      "location": "file",
      "issue": "Store missing exported selector functions",
      "recommendation": "Export selectors for derived state"
    }

  // Check 4: Async Actions
  Check: Are async operations outside reducers?
  Pattern: Look for "async" inside state updater

  If ASYNC_IN_REDUCER:
    Add Finding: {
      "severity": "P1",
      "category": "Architecture - Async in Reducer",
      "location": "file:line",
      "issue": "Async operation in state updater (anti-pattern)",
      "recommendation": "Move async logic to separate action function"
    }
```

### Step 5: React Component Patterns (4 min)

```typescript
Glob: "components/**/*.tsx"

For each component file:
  Read: file content

  // Check 1: ForwardRef for Reusable Components
  Check: Is component exported and reusable?
  Check: Does it need ref forwarding (DOM manipulation)?

  Pattern: Buttons, Inputs, custom controls need forwardRef

  If NEEDS_FORWARD_REF:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing ForwardRef",
      "location": "file:line",
      "issue": "Reusable component should use forwardRef",
      "recommendation": "Wrap with React.forwardRef<HTMLElement, Props>"
    }

  // Check 2: Hooks Order
  Check: Are hooks in correct order?
  Expected: useContext → useState → useRef → useEffect → custom hooks

  If WRONG_ORDER:
    Add Finding: {
      "severity": "P3",
      "category": "Architecture - Incorrect Hooks Order",
      "location": "file:line",
      "issue": "Hooks not following recommended order",
      "recommendation": "Reorder: context → state → refs → effects → custom"
    }

  // Check 3: Complex Logic in Components
  Check: Component length and complexity
  Count: Lines in component function

  If TOO_LONG (>200 lines):
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Complex Component",
      "location": "file",
      "issue": "Component has ${lines} lines (threshold: 200)",
      "recommendation": "Extract logic to custom hooks or child components"
    }

  // Check 4: Custom Hook Extraction
  Check: Is there reusable logic that should be a hook?
  Pattern: Multiple useEffect/useState for same purpose

  If SHOULD_BE_HOOK:
    Add Finding: {
      "severity": "P3",
      "category": "Architecture - Extract Custom Hook",
      "location": "file:line",
      "issue": "Logic could be extracted to custom hook",
      "recommendation": "Create hook in /hooks/ directory"
    }
```

### Step 6: Error Handling Pattern Validation (3 min)

```typescript
// Check 1: Custom Error Classes
Grep: "throw new Error" in app/**/*.ts lib/**/*.ts

For each error throw:
  Check: Should it use custom error class?

  Categories:
  - User input errors → ValidationError
  - Database errors → DatabaseError
  - Auth errors → AuthenticationError
  - External API errors → ExternalServiceError

  If GENERIC_ERROR:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Generic Error",
      "location": "file:line",
      "issue": "Using generic Error instead of custom error class",
      "recommendation": "Use ValidationError, DatabaseError, etc."
    }

// Check 2: Error Context
Grep: "catch.*error" in **/*.ts

For each catch block:
  Read: 5 lines in catch block
  Check: Is context provided?
  Pattern: "trackError(error, { context: '...', ... })"

  If NO_CONTEXT:
    Add Finding: {
      "severity": "P2",
      "category": "Architecture - Missing Error Context",
      "location": "file:line",
      "issue": "Error caught without context tracking",
      "recommendation": "Add trackError with context object"
    }
```

### Step 7: File Organization Validation (2 min)

```typescript
// Check 1: Files in Correct Directories
Rules:
- Business logic → /lib/services/
- Utilities → /lib/utils/
- Type definitions → /types/
- React hooks → /hooks/
- Components → /components/
- API routes → /app/api/
- Pages → /app/

Violations to check:
Glob: "components/**/*.ts" (logic files in components dir)
Glob: "lib/**/*.tsx" (components in lib dir)
Glob: "app/api/**/*.tsx" (components in api dir)

For each violation:
  Add Finding: {
    "severity": "P3",
    "category": "Architecture - Wrong Directory",
    "location": "file",
    "issue": "File in incorrect directory",
    "recommendation": "Move to appropriate directory"
  }

// Check 2: Barrel Exports
Check: Are there index.ts files for clean imports?

Expected barrel exports:
- /components/index.ts
- /hooks/index.ts
- /lib/utils/index.ts
- /types/index.ts

If MISSING_BARREL:
  Add Finding: {
    "severity": "P3",
    "category": "Architecture - Missing Barrel Export",
    "location": "directory",
    "issue": "Directory missing index.ts for clean exports",
    "recommendation": "Create index.ts with re-exports"
  }
```

## Codebase-Specific Patterns

### Timeline Component Architecture

```typescript
// Timeline is complex, enforce specific patterns
Glob: "components/timeline/**/*.tsx"

Requirements:
1. Virtualization for performance (react-window or similar)
2. Memoization for clip rendering (React.memo)
3. Refs for DOM manipulation (no direct DOM access)
4. Debounced event handlers (scroll, drag)
5. Separate stores (timeline, playback, selection)

Validate each requirement
```

### Supabase Pattern Enforcement

```typescript
// Ensure consistent Supabase patterns
Grep: "supabase\\.from\\(" in **/*.ts

For each query:
  Check: Is it in a service?
  Check: Does it use branded types for IDs?
  Check: Does it handle RLS errors?
  Check: Does it include proper select() fields (not select('*'))?

  Common anti-patterns:
  - supabase.from('users').select('*') → Should specify fields
  - .single() without error handling → Should check for null
  - Raw string IDs → Should use branded types
```

## Output Format

```json
{
  "agentName": "Architecture Enforcer",
  "findings": [
    {
      "severity": "P0",
      "category": "Architecture - Missing Auth",
      "location": "app/api/assets/upload/route.ts:23",
      "issue": "File upload endpoint not wrapped with withAuth middleware",
      "recommendation": "Wrap handler: export const POST = withAuth(handler, { requireAuth: true })",
      "effort": "10 min",
      "pattern": "See /docs/CODING_BEST_PRACTICES.md#api-routes"
    },
    {
      "severity": "P1",
      "category": "Architecture - Missing Branded Type",
      "location": "lib/services/ProjectService.ts:45",
      "issue": "Parameter 'userId: string' should use branded type",
      "recommendation": "Change to 'userId: UserId'",
      "effort": "5 min"
    },
    {
      "severity": "P2",
      "category": "Architecture - Business Logic in Route",
      "location": "app/api/video/generate/route.ts:67-89",
      "issue": "Complex generation logic in route handler instead of service layer",
      "recommendation": "Extract to VideoService.generateVideo() method",
      "effort": "30 min"
    }
  ],
  "summary": {
    "apiRoutesChecked": 34,
    "missingAuthMiddleware": 2,
    "missingRateLimit": 5,
    "unbrandedTypes": 8,
    "servicesChecked": 12,
    "storesChecked": 6,
    "componentsChecked": 89,
    "architectureViolations": 23
  },
  "criticalActions": [
    "Add auth middleware to 2 API routes",
    "Fix branded type usage in 8 locations",
    "Extract business logic from API routes to services"
  ]
}
```

## Quality Checklist

Before returning, verify:
- [ ] All API routes scanned for auth/rate limiting
- [ ] Branded type usage validated
- [ ] Service layer patterns checked
- [ ] Zustand stores validated
- [ ] React component patterns verified
- [ ] Error handling consistency checked
- [ ] File organization validated
- [ ] All findings reference specific patterns in docs

## Critical Notes

1. **P0 for missing auth** - security critical
2. **Provide pattern references** - link to CODING_BEST_PRACTICES.md
3. **Focus on established patterns** - documented in /docs/
4. **Don't enforce style preferences** - only architectural rules
5. **Validate against codebase standards** - not generic React best practices
