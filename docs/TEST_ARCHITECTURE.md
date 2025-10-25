# Test Architecture

## Overview

This document defines the standardized testing patterns and architecture for the project. All tests must follow these patterns to ensure consistency, maintainability, and reliability.

## Test Infrastructure

### Directory Structure

```
/
├── __mocks__/                      # Global Jest mocks (auto-discovered)
│   ├── lib/                       # Library mocks
│   │   ├── browserLogger.ts       # Browser logger mock
│   │   ├── serverLogger.ts        # Server logger mock
│   │   ├── auditLog.ts           # Audit log mock
│   │   └── cache.ts              # Cache mock
│   ├── @google-cloud/            # Third-party service mocks
│   │   ├── storage.ts
│   │   └── vertexai.ts
│   ├── posthog-js.ts             # Analytics mock
│   ├── stripe.ts                 # Payment mock
│   └── ...                       # Other global mocks
├── test-utils/                    # Test utilities (import from here)
│   ├── index.ts                  # Main export point
│   ├── mockSupabase.ts           # Supabase mocking
│   ├── testWithAuth.ts           # Auth test helpers
│   ├── formDataHelpers.ts        # FormData helpers
│   ├── mockStripe.ts             # Stripe mocking
│   ├── mockFetch.ts              # Fetch API mocking
│   └── testHelpers.ts            # General helpers
└── __tests__/                    # Test files
    ├── api/                      # API route tests
    ├── components/               # Component tests
    ├── lib/                      # Library tests
    └── integration/              # Integration tests
```

### Configuration Files

- **jest.config.js** - Main Jest configuration
- **jest.setup.js** - Global test environment setup (runs BEFORE test files)
- **jest.setup-after-env.js** - Setup after test environment (runs AFTER test environment)
- **jest-environment-jsdom-fix.js** - Custom JSDOM environment

## Mocking Strategy

### **Use Consolidated Test Utilities ONLY**

**ALWAYS import from `/test-utils`:**

```typescript
// ✅ CORRECT - Import from consolidated test-utils
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  createAuthenticatedRequest,
  createTestFormData,
} from '@/test-utils';

// ❌ WRONG - Don't import from deprecated helpers
import { createMockSupabaseClient } from '@/__tests__/helpers/apiMocks';
import { mockSupabase } from '@/__tests__/integration/helpers/integration-helpers';
```

### Global Mocks vs Local Mocks

**Decision: Use BOTH with clear separation**

#### Global Mocks (`__mocks__/`)

Use for:

- Third-party libraries (Stripe, Google Cloud, PostHog)
- System utilities (loggers, cache)
- Libraries that need consistent mocking across all tests

```typescript
// Automatically loaded by Jest
// No explicit jest.mock() needed
```

#### Local Mocks (`jest.mock()`)

Use for:

- Module-specific mocking within test files
- Mocking internal modules (`@/lib/*`, `@/app/*`)
- Test-specific behavior overrides

```typescript
// In test file - explicit mock needed
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));
```

### Mocking Patterns by Type

#### 1. API Route Tests

```typescript
import { NextRequest } from 'next/server';
import { GET, POST } from '@/app/api/example/route';
import {
  createMockSupabaseClient,
  mockAuthenticatedUser,
  mockUnauthenticatedUser,
} from '@/test-utils';

// Mock Supabase client
jest.mock('@/lib/supabase', () => {
  const { createMockSupabaseClient } = require('@/test-utils');
  const mockClient = createMockSupabaseClient();

  return {
    createServerSupabaseClient: jest.fn(async () => mockClient),
    __getMockClient: () => mockClient,
  };
});

// Mock withAuth wrapper
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
      });
    }

    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));

describe('GET /api/example', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup mock after clearAllMocks
    const { __getMockClient, createServerSupabaseClient } = require('@/lib/supabase');
    mockSupabase = __getMockClient();
    createServerSupabaseClient.mockResolvedValue(mockSupabase);

    // Setup default auth
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    });
  });

  it('should return 401 when unauthenticated', async () => {
    mockUnauthenticatedUser(mockSupabase);
    const request = new NextRequest('http://localhost/api/example');

    const response = await GET(request);

    expect(response.status).toBe(401);
  });

  it('should return data when authenticated', async () => {
    mockAuthenticatedUser(mockSupabase);
    mockSupabase.select.mockResolvedValue({
      data: [{ id: '1', name: 'Test' }],
      error: null,
    });

    const request = new NextRequest('http://localhost/api/example');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

#### 2. Component Tests

```typescript
import { render, screen, waitFor } from '@/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

#### 3. Service Layer Tests

```typescript
import { createMockSupabaseClient } from '@/test-utils';
import { MyService } from '@/lib/services/MyService';

describe('MyService', () => {
  let service: MyService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new MyService(mockSupabase);
  });

  it('should fetch data', async () => {
    mockSupabase.select.mockResolvedValue({
      data: [{ id: '1' }],
      error: null,
    });

    const result = await service.getData();

    expect(result).toEqual([{ id: '1' }]);
  });
});
```

## Test Helper Reference

### Available from `@/test-utils`

**React Testing:**

- `render()` - Custom render with providers
- `renderHook()` - Render React hooks
- `screen` - Query DOM elements
- `waitFor()` - Wait for async updates
- `userEvent` - Simulate user interactions

**Supabase Mocking:**

- `createMockSupabaseClient()` - Full Supabase client mock
- `createMockUser()` - Mock user object
- `createMockProject()` - Mock project object
- `createMockAsset()` - Mock asset object
- `mockAuthenticatedUser()` - Setup authenticated user
- `mockUnauthenticatedUser()` - Setup unauthenticated user
- `mockQuerySuccess()` - Mock successful query
- `mockQueryError()` - Mock query error
- `resetAllMocks()` - Clear all mocks

**Auth Testing:**

- `createTestAuthHandler()` - Wrap handler with auth
- `createAuthenticatedRequest()` - Create authenticated request
- `createUnauthenticatedRequest()` - Create unauthenticated request
- `createTestUser()` - Create test user in memory DB
- `createTestSupabaseClient()` - Test Supabase client

**FormData Testing:**

- `createTestFormData()` - Create FormData for tests
- `createAuthFormDataRequest()` - Create authenticated FormData request
- `createTestFile()` - Create test file blob
- `createFormDataWithFiles()` - FormData with file uploads

**General Helpers:**

- `createMockRouter()` - Mock Next.js router
- `createMockFetchResponse()` - Mock fetch responses
- `mockConsole()` - Mock console methods
- `waitForAsync()` - Wait for async operations

**Stripe Mocking:**

- `createMockCheckoutSession()` - Mock Stripe checkout
- `createMockSubscription()` - Mock subscription
- `createMockCustomer()` - Mock customer
- `createMockWebhookEvent()` - Mock webhook event

**Environment Mocking:**

- `mockEnv()` - Mock environment variables
- `restoreEnv()` - Restore original env vars
- `withTestEnv()` - Run test with specific env

**Fetch Mocking:**

- `mockFetch()` - Mock global fetch
- `mockFetchSuccess()` - Mock successful fetch
- `mockFetchError()` - Mock fetch error
- `mockFetchByUrl()` - Mock specific URL patterns

## Authentication in Tests

### BYPASS_AUTH Configuration

**IMPORTANT:** `BYPASS_AUTH` is set to `false` in `jest.setup.js` globally.

```javascript
// jest.setup.js
process.env.BYPASS_AUTH = 'false';
```

This ensures all tests properly authenticate through the `withAuth` middleware.

### Testing with Authentication

```typescript
// Setup authenticated user
beforeEach(() => {
  const mockUser = mockAuthenticatedUser(mockSupabase);
  // mockUser is now { id: 'test-user-id', email: 'test@example.com', ... }
});

// Test authenticated requests
it('should access protected resource', async () => {
  mockAuthenticatedUser(mockSupabase);
  const response = await GET(request);
  expect(response.status).toBe(200);
});

// Test unauthenticated requests
it('should reject unauthenticated request', async () => {
  mockUnauthenticatedUser(mockSupabase);
  const response = await GET(request);
  expect(response.status).toBe(401);
});
```

## Common Patterns

### Pattern: beforeEach Mock Setup

```typescript
beforeEach(() => {
  jest.clearAllMocks();

  // Re-setup Supabase mock after clearAllMocks
  const { __getMockClient, createServerSupabaseClient } = require('@/lib/supabase');
  mockSupabase = __getMockClient();
  createServerSupabaseClient.mockResolvedValue(mockSupabase);

  // Setup default mocks
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    error: null,
  });

  // Setup chainable query methods
  mockSupabase.from.mockReturnValue(mockSupabase);
  mockSupabase.select.mockReturnValue(mockSupabase);
  mockSupabase.insert.mockReturnValue(mockSupabase);
  mockSupabase.update.mockReturnValue(mockSupabase);
  mockSupabase.delete.mockReturnValue(mockSupabase);
  mockSupabase.eq.mockReturnValue(mockSupabase);
});
```

### Pattern: Rate Limiting Mock

```typescript
jest.mock('@/lib/rateLimit', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    resetAt: Date.now() + 60_000,
  }),
  RATE_LIMITS: {
    tier3_status_read: { max: 30, windowMs: 60_000 },
  },
}));
```

### Pattern: Error Handling Tests

```typescript
it('should handle database errors', async () => {
  mockAuthenticatedUser(mockSupabase);

  mockSupabase.select.mockResolvedValue({
    data: null,
    error: { message: 'Database error', code: 'DB_ERROR' },
  });

  const response = await GET(request);

  expect(response.status).toBe(500);
  const data = await response.json();
  expect(data.error).toBe('Failed to fetch data');
});
```

## Timeout Configuration

### Default Timeout

Tests have a 15-second timeout configured in `jest.config.js`:

```javascript
testTimeout: 15000, // 15 seconds
```

### Per-Test Timeout Override

For slow tests, override timeout explicitly:

```typescript
it('should complete slow operation', async () => {
  // Test code
}, 30000); // 30 second timeout
```

### Preventing Timeouts

**Common causes:**

1. Missing mock setup
2. Async operations without proper awaits
3. Promise chains that don't resolve
4. Missing `jest.clearAllMocks()` in beforeEach

**Solutions:**

```typescript
// 1. Always await async operations
await GET(request);

// 2. Mock all external dependencies
jest.mock('@/lib/external-service');

// 3. Use waitFor for async assertions
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// 4. Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
```

## Test Quality Checklist

Before committing tests, verify:

- [ ] Imports from `@/test-utils` (not deprecated helpers)
- [ ] `BYPASS_AUTH` not overridden in test file
- [ ] `beforeEach` clears and re-setups mocks
- [ ] All async operations are awaited
- [ ] Tests follow AAA pattern (Arrange-Act-Assert)
- [ ] Descriptive test names
- [ ] Error cases tested
- [ ] Edge cases covered
- [ ] No hardcoded delays (`setTimeout`)
- [ ] Tests run in isolation
- [ ] No flaky tests

## Troubleshooting

### Tests Timing Out

1. Check mock setup in `beforeEach`
2. Verify all mocks are properly configured
3. Ensure async operations are awaited
4. Check for missing `jest.clearAllMocks()`

### Authentication Failing

1. Verify `BYPASS_AUTH='false'` in jest.setup.js
2. Check `mockAuthenticatedUser()` is called
3. Verify mock is re-setup after `clearAllMocks()`

### Import Errors

1. Use `@/test-utils` not `@/__tests__/helpers/`
2. Check `jest.config.js` module name mapper
3. Verify TypeScript paths in `tsconfig.json`

### Mock Not Working

1. Ensure `jest.mock()` is at top level (not inside describe)
2. Use `jest.requireActual()` for partial mocks
3. Call `jest.clearAllMocks()` in `beforeEach`
4. Check mock is being re-setup after clear

## Migration from Deprecated Helpers

### Old Pattern (Deprecated)

```typescript
// ❌ Don't use this
import { createMockSupabaseClient } from '@/__tests__/helpers/apiMocks';
```

### New Pattern (Correct)

```typescript
// ✅ Use this
import { createMockSupabaseClient } from '@/test-utils';
```

### Migration Steps

1. Replace imports from `@/__tests__/helpers/` with `@/test-utils`
2. Remove any custom mock implementations
3. Use consolidated helper functions
4. Verify tests still pass

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Project Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)
- [Test Utils Index](/test-utils/index.ts)
