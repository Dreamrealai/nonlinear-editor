# Test Environment Guide

**Complete guide to the test environment setup, mocks, utilities, and best practices.**

---

## Table of Contents

1. [Overview](#overview)
2. [Environment Configuration](#environment-configuration)
3. [Mock Files](#mock-files)
4. [Test Utilities](#test-utilities)
5. [Testing Patterns](#testing-patterns)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

This project uses **Jest** with **React Testing Library** for unit and integration testing. The test environment is configured to:

- Mock external dependencies (Supabase, Google AI, Stripe, etc.)
- Provide test utilities for common scenarios
- Support both unit and integration testing
- Run in Node.js environment with jsdom for DOM simulation

### Test Configuration Files

- **`jest.config.js`** - Main Jest configuration
- **`jest.setup.js`** - Global polyfills and environment setup (runs before any tests)
- **`jest.setup-after-env.js`** - Setup after environment is ready (runs before each test file)
- **`.env.test`** - Test environment variables

---

## Environment Configuration

### Environment Variables

Test environment variables are defined in **`.env.test`**. This file contains mock values for all configuration needed by the application.

**Key variables:**

```bash
NODE_ENV=test
NEXT_PUBLIC_SUPABASE_URL=https://test.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
STRIPE_SECRET_KEY=sk_test_mock
GOOGLE_CLOUD_PROJECT_ID=test-project-id
```

**Usage in tests:**

```ts
import { mockEnv, restoreEnv } from '@/test-utils/mockEnv';

beforeEach(() => {
  mockEnv({ NEXT_PUBLIC_APP_URL: 'http://test.com' });
});

afterEach(() => {
  restoreEnv();
});
```

### Global Setup

**`jest.setup.js`** provides:

- Polyfills for Node.js (TextEncoder, ReadableStream, etc.)
- Browser API mocks (IntersectionObserver, ResizeObserver, etc.)
- Web API polyfills (Request, Response, FormData, etc.)

**`jest.setup-after-env.js`** provides:

- Jest DOM matchers (@testing-library/jest-dom)
- Window.matchMedia mock
- Console output suppression for cleaner test runs
- File API polyfills

---

## Mock Files

### Directory Structure

```
__mocks__/
├── @google/
│   └── generative-ai.ts          # Google Gemini AI mock
├── @google-cloud/
│   ├── storage.ts                # Google Cloud Storage mock
│   └── vertexai.ts               # Vertex AI video generation mock
├── next/
│   ├── link.tsx                  # Next.js Link component mock
│   └── image.tsx                 # Next.js Image component mock
├── lib/
│   ├── api/
│   │   └── response.ts           # API response helpers mock
│   ├── auditLog.ts               # Audit logging mock
│   ├── browserLogger.ts          # Browser logger mock
│   ├── cache.ts                  # Cache module mock
│   └── serverLogger.ts           # Server logger mock
├── lucide-react.js               # Icon library mock
├── next-navigation.ts            # Next.js navigation hooks mock
├── posthog-js.ts                 # PostHog analytics mock
├── stripe.ts                     # Stripe payment mock
├── supabase.ts                   # Supabase client mock
├── tailwind-merge.js             # Tailwind CSS merge utility mock
└── uuid.js                       # UUID generator mock
```

### Next.js Mocks

**Navigation (`__mocks__/next-navigation.ts`):**

```ts
export const useRouter = jest.fn().mockReturnValue({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  pathname: '/',
  query: {},
});

export const usePathname = jest.fn().mockReturnValue('/');
export const useSearchParams = jest.fn();
```

**Link and Image (`__mocks__/next/`):**

- `Link` - Renders as `<a>` tag
- `Image` - Renders as `<img>` tag

### Supabase Mock

**Location:** `__mocks__/supabase.ts` and `test-utils/mockSupabase.ts`

**Features:**

- Chainable query builder
- Auth API mocking
- Storage API mocking
- Realtime subscriptions

**Usage:**

```ts
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';

const mockSupabase = createMockSupabaseClient();

// Mock authenticated user
mockAuthenticatedUser(mockSupabase, { email: 'test@example.com' });

// Mock query response
mockSupabase.from('projects').select().single.mockResolvedValue({
  data: { id: '123', title: 'Test Project' },
  error: null,
});
```

### Google AI Mocks

**Gemini AI (`__mocks__/@google/generative-ai.ts`):**

```ts
import { mockGenerateContentSuccess } from '@/__mocks__/@google/generative-ai';

mockGenerateContentSuccess('Generated response text');
```

**Vertex AI (`__mocks__/@google-cloud/vertexai.ts`):**

```ts
import {
  mockVideoGenerationInitiated,
  mockOperationComplete,
} from '@/__mocks__/@google-cloud/vertexai';

mockVideoGenerationInitiated('operations/video-gen-123');
mockOperationComplete(Buffer.from('video-data').toString('base64'));
```

**Cloud Storage (`__mocks__/@google-cloud/storage.ts`):**

```ts
import { mockUploadSuccess } from '@/__mocks__/@google-cloud/storage';

mockUploadSuccess('https://storage.googleapis.com/bucket/file.mp4');
```

### Stripe Mock

**Location:** `__mocks__/stripe.ts` and `test-utils/mockStripe.ts`

**Usage:**

```ts
import { createMockCheckoutSession } from '@/test-utils/mockStripe';
import { mockCreateCheckoutSession } from '@/__mocks__/stripe';

const session = createMockCheckoutSession({ id: 'cs_test_123' });
mockCreateCheckoutSession.mockResolvedValue(session);
```

### PostHog Analytics Mock

**Location:** `__mocks__/posthog-js.ts`

```ts
import { mockCapture, mockIdentify } from '@/__mocks__/posthog-js';

// Verify analytics events
expect(mockCapture).toHaveBeenCalledWith('event_name', { property: 'value' });
```

---

## Test Utilities

### Custom Render Function

**Location:** `test-utils/render.tsx`

Wraps React Testing Library's render with providers and mocks.

**Usage:**

```tsx
import { render, screen } from '@/test-utils';

test('renders component', () => {
  render(<MyComponent />);
  expect(screen.getByText('Hello')).toBeInTheDocument();
});

// With router props
test('renders with routing', () => {
  render(<MyComponent />, {
    routerProps: { pathname: '/dashboard' }
  });
});

// With Supabase mock
test('renders with auth', () => {
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);

  render(<MyComponent />, { mockSupabase });
});
```

### Test Data Generators

**Location:** `test-utils/testHelpers.ts`

```ts
import { testData } from '@/test-utils';

const asset = testData.asset({ type: 'video', duration_seconds: 30 });
const project = testData.project({ title: 'My Project' });
const message = testData.message({ content: 'Hello AI' });
```

### Mock Fetch Utilities

**Location:** `test-utils/mockFetch.ts`

```ts
import { mockFetchSuccess, mockFetchError, resetFetchMocks } from '@/test-utils';

beforeEach(() => {
  mockFetchSuccess({ data: 'test' });
});

afterEach(() => {
  resetFetchMocks();
});

test('fetches data', async () => {
  const response = await fetch('/api/test');
  const data = await response.json();
  expect(data).toEqual({ data: 'test' });
});
```

### Environment Mocking

**Location:** `test-utils/mockEnv.ts`

```ts
import { mockEnv, restoreEnv } from '@/test-utils';

test('uses custom env', () => {
  mockEnv({ API_URL: 'http://custom.com' });
  expect(process.env.API_URL).toBe('http://custom.com');
  restoreEnv();
});
```

### Integration Test Helpers

**Location:** `__tests__/integration/helpers/integration-helpers.ts`

Provides:

- **UserPersonas** - Pre-configured user types (free, pro, enterprise)
- **ProjectTemplates** - Common project configurations
- **AssetFixtures** - Test asset data
- **TimelineBuilders** - Timeline state generators
- **IntegrationWorkflow** - Orchestrates complex test scenarios

**Usage:**

```ts
import {
  UserPersonas,
  ProjectTemplates,
  createTestEnvironment,
} from '@/__tests__/integration/helpers/integration-helpers';

const { mockSupabase, user, workflow } = createTestEnvironment('proTierUser');

const project = await workflow.createProjectWorkflow(user.id, {
  title: 'Test Project',
});
```

---

## Testing Patterns

### Unit Testing Components

```tsx
import { render, screen, userEvent } from '@/test-utils';
import { Button } from '@/components/ui/Button';

describe('Button', () => {
  test('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  test('handles click events', async () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### Testing Hooks

```ts
import { renderHook, waitFor } from '@/test-utils';
import { useAssets } from '@/hooks/useAssets';

test('loads assets', async () => {
  const mockSupabase = createMockSupabaseClient();
  mockSupabase.from().select().mockResolvedValue({
    data: [{ id: '1', type: 'video' }],
    error: null,
  });

  const { result } = renderHook(() => useAssets('project-123'), {
    mockSupabase,
  });

  await waitFor(() => {
    expect(result.current.assets).toHaveLength(1);
  });
});
```

### Testing API Routes

```ts
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/projects/route';

test('creates project', async () => {
  const request = new NextRequest('http://localhost:3000/api/projects', {
    method: 'POST',
    body: JSON.stringify({ title: 'New Project' }),
  });

  const response = await POST(request);
  const data = await response.json();

  expect(response.status).toBe(201);
  expect(data).toHaveProperty('id');
});
```

### Integration Testing

```ts
import { createTestEnvironment, AssetFixtures } from '@/__tests__/integration/helpers';

describe('Asset Upload Workflow', () => {
  let env: ReturnType<typeof createTestEnvironment>;

  beforeEach(() => {
    env = createTestEnvironment('proTierUser');
  });

  test('uploads and stores asset', async () => {
    const asset = await env.workflow.uploadAssetWorkflow(
      'project-123',
      env.user.id,
      'video'
    );

    expect(asset).toBeDefined();
    expect(asset.type).toBe('video');
    expect(env.mockSupabase.storage.upload).toHaveBeenCalled();
  });
});
```

---

## Best Practices

### 1. Use Test Utilities

Always import from `@/test-utils` for consistent setup:

```ts
// Good
import { render, screen, createMockSupabaseClient } from '@/test-utils';

// Avoid
import { render } from '@testing-library/react';
```

### 2. Clean Up After Tests

```ts
afterEach(() => {
  jest.clearAllMocks();
  resetFetchMocks();
  restoreEnv();
});
```

### 3. Use Descriptive Test Names

```ts
// Good
test('displays error message when API call fails', () => {});

// Avoid
test('error', () => {});
```

### 4. Follow AAA Pattern

```ts
test('example', () => {
  // Arrange - Setup test data and mocks
  const mockData = { id: '123' };
  mockFetchSuccess(mockData);

  // Act - Execute the code being tested
  const result = await fetchData();

  // Assert - Verify the outcome
  expect(result).toEqual(mockData);
});
```

### 5. Mock at the Appropriate Level

- **Unit tests** - Mock all external dependencies
- **Integration tests** - Mock only external services (APIs, databases)
- **E2E tests** - Minimize mocking

### 6. Use Integration Test Helpers

For complex scenarios, use the integration helpers:

```ts
import { createTestEnvironment } from '@/__tests__/integration/helpers';

const env = createTestEnvironment('proTierUser');
```

### 7. Test Error Paths

```ts
test('handles API errors gracefully', async () => {
  mockFetchError('Network error', 500);

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Common Issues

#### 1. "Cannot find module" errors

**Solution:** Ensure module name mappings in `jest.config.js` are correct:

```js
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/$1',
}
```

#### 2. ESM module errors (especially with lucide-react)

**Solution:** Mocks are already configured in `jest.config.js`. Ensure you're using the mocked version:

```js
transformIgnorePatterns: [
  'node_modules/(?!(lucide-react|@radix-ui)/)',
]
```

#### 3. Async operations not completing

**Solution:** Use `waitFor` from React Testing Library:

```ts
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

#### 4. Memory leaks in tests

**Solution:**

- Clear all mocks in `afterEach`
- Ensure cleanup of timers and subscriptions
- Use `jest.clearAllTimers()` if using fake timers

#### 5. Environment variables not available

**Solution:** Ensure `.env.test` is loaded or use `mockEnv`:

```ts
import { setTestEnv } from '@/test-utils/mockEnv';

beforeAll(() => {
  setTestEnv();
});
```

### Debug Tips

**1. View rendered output:**

```ts
import { screen, debug } from '@/test-utils';

render(<MyComponent />);
screen.debug(); // Prints DOM tree
```

**2. Check what was called:**

```ts
console.log(mockFetch.mock.calls);
```

**3. Use verbose mode:**

```bash
npm test -- --verbose
```

**4. Run single test:**

```bash
npm test -- path/to/test.test.ts
```

---

## Summary

This test environment provides:

- **Complete mocking** of external dependencies
- **Utilities** for common test scenarios
- **Helpers** for integration testing
- **Patterns** for consistent, maintainable tests

**Key files:**

- `test-utils/` - Reusable test utilities
- `__mocks__/` - Module mocks
- `.env.test` - Test environment configuration
- `jest.config.js` - Jest configuration
- `jest.setup.js` - Global polyfills
- `jest.setup-after-env.js` - Test environment setup

For examples, see existing tests in `__tests__/` directory.
