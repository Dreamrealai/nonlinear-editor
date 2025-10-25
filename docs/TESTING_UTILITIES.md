# Testing Utilities Documentation

**Comprehensive guide to all test utilities, helpers, and patterns in the codebase.**

Last Updated: 2025-10-24 (Updated by Agent 30 with patterns from Agents 21-29)
Maintained by: Engineering Team

**Recent Additions:**

- withAuth middleware mock pattern (Agent 21, Batch 2)
- Common pitfalls and solutions (Agent 25)
- HTML validation patterns
- Query selector best practices
- API mocking for multi-step flows

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Test Utility Categories](#test-utility-categories)
4. [Mocking Utilities](#mocking-utilities)
5. [Factory Functions](#factory-functions)
6. [Test Helpers](#test-helpers)
7. [Component Testing](#component-testing)
8. [API Route Testing](#api-route-testing)
9. [Integration Testing](#integration-testing)
10. [Custom Matchers](#custom-matchers)
11. [Test Templates](#test-templates)
12. [Best Practices](#best-practices)
13. [Common Patterns](#common-patterns)
14. [Troubleshooting](#troubleshooting)

---

## Overview

The test utilities in this project provide a comprehensive toolkit for writing consistent, maintainable tests across all layers of the application. All utilities are located in `/test-utils/` and can be imported from a single entry point.

### Philosophy

- **DRY (Don't Repeat Yourself)**: Reuse test utilities instead of duplicating setup code
- **Type Safety**: All utilities are fully typed with TypeScript
- **Consistency**: Standard patterns across all test types
- **Documentation**: All utilities have JSDoc comments with examples
- **Composability**: Utilities can be combined for complex scenarios

### Import Patterns

```typescript
// Import from main entry point (recommended)
import {
  render,
  screen,
  waitFor,
  createMockSupabaseClient,
  mockAuthenticatedUser,
} from '@/test-utils';

// Import specific categories
import { createMockSupabaseClient } from '@/test-utils/mockSupabase';
import { mockFetch } from '@/test-utils/mockFetch';
import { render } from '@/test-utils/render';
```

---

## Quick Start

### Component Test Example

```typescript
import { render, screen, waitFor } from '@/test-utils';

describe('MyComponent', () => {
  it('renders with user data', async () => {
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase, { email: 'test@example.com' });

    render(<MyComponent />, { mockSupabase });

    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
```

### API Route Test Example

```typescript
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('GET /api/projects', () => {
  it('returns user projects', async () => {
    const mockSupabase = createMockSupabaseClient();
    const user = mockAuthenticatedUser(mockSupabase);

    mockSupabase.mockResolvedValue({
      data: [{ id: '1', title: 'Test Project' }],
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });
});
```

### Integration Test Example

```typescript
import { createTestEnvironment, IntegrationWorkflow } from '@/test-utils/integration-helpers';

describe('Video Editor Workflow', () => {
  it('completes full editing workflow', async () => {
    const { mockSupabase, user, workflow } = createTestEnvironment('proTierUser');

    // Create project
    const project = await workflow.createProjectWorkflow(user.id, {
      title: 'My Video',
    });

    // Upload asset
    const asset = await workflow.uploadAssetWorkflow(project.id, user.id, 'video');

    // Generate AI video
    const aiVideo = await workflow.generateVideoWorkflow(project.id, user.id);

    expect(project).toBeDefined();
    expect(asset).toBeDefined();
    expect(aiVideo.metadata.aiGenerated).toBe(true);
  });
});
```

---

## Test Utility Categories

### 1. Mocking Utilities (`/test-utils/`)

| File                 | Purpose               | Key Exports                                           |
| -------------------- | --------------------- | ----------------------------------------------------- |
| `mockSupabase.ts`    | Supabase client mocks | `createMockSupabaseClient`, `mockAuthenticatedUser`   |
| `mockFetch.ts`       | Fetch API mocking     | `mockFetch`, `mockFetchSuccess`, `mockFetchError`     |
| `mockEnv.ts`         | Environment variables | `mockEnv`, `restoreEnv`, `setTestEnv`                 |
| `mockStripe.ts`      | Stripe API mocks      | `createMockCheckoutSession`, `createMockSubscription` |
| `mockWithAuth.ts`    | Auth middleware mock  | `mockWithAuth`                                        |
| `mockApiResponse.ts` | API response helpers  | `mockApiResponse`, `createApiResponseMock`            |

### 2. Test Helpers (`/test-utils/`)

| File             | Purpose             | Key Exports                                  |
| ---------------- | ------------------- | -------------------------------------------- |
| `testHelpers.ts` | General utilities   | `createMockFile`, `waitForAsync`, `testData` |
| `render.tsx`     | Component rendering | `render`, `renderHook`                       |

### 3. Legacy Helpers (`/test-utils/legacy-helpers/`)

**Note**: These are being consolidated but remain available for backward compatibility.

| File             | Purpose            | Key Exports                                           |
| ---------------- | ------------------ | ----------------------------------------------------- |
| `api.ts`         | API testing        | `createAuthenticatedRequest`, `expectSuccessResponse` |
| `components.tsx` | Component helpers  | `renderWithProviders`, `waitForLoadingToFinish`       |
| `mocks.ts`       | Browser API mocks  | `mockIntersectionObserver`, `mockLocalStorage`        |
| `supabase.ts`    | Supabase utilities | Detailed Supabase mocking                             |

### 4. Integration Helpers (`/__tests__/integration/helpers/`)

| File                     | Purpose                | Key Exports                                            |
| ------------------------ | ---------------------- | ------------------------------------------------------ |
| `integration-helpers.ts` | Workflow orchestration | `IntegrationWorkflow`, `UserPersonas`, `AssetFixtures` |

---

## Mocking Utilities

### withAuth Middleware (`mockWithAuth.ts`)

#### Recommended Pattern for API Route Tests

**Always use this pattern when testing authenticated API routes** (established by Agent 21 and Batch 2):

```typescript
import { mockWithAuth } from '@/test-utils/mockWithAuth';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';

// Mock withAuth middleware BEFORE importing the route
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

// Mock Supabase client creator
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('API Route', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('requires authentication', async () => {
    mockUnauthenticatedUser(mockSupabase);

    const response = await GET(request);
    expect(response.status).toBe(401);
  });

  it('processes authenticated request', async () => {
    mockAuthenticatedUser(mockSupabase);
    mockSupabase.mockResolvedValue({ data: [], error: null });

    const response = await GET(request);
    expect(response.status).toBe(200);
  });
});
```

**Key Points:**

- Mock `withAuth` and `createServerSupabaseClient` BEFORE importing route handler
- Use `mockAuthenticatedUser()` or `mockUnauthenticatedUser()` in each test
- Reset mocks in `beforeEach` to ensure test isolation
- Pattern works for all authenticated routes (33/33 routes verified)

### Supabase Client (`mockSupabase.ts`)

#### createMockSupabaseClient()

Creates a fully functional mock Supabase client with chainable query methods.

```typescript
const mockSupabase = createMockSupabaseClient();

// Configure query response
mockSupabase.mockResolvedValue({
  data: [{ id: '1', title: 'Test' }],
  error: null,
  count: 1,
});

// Test chainable queries
const result = await mockSupabase.from('projects').select('*').eq('user_id', 'user-123').single();

expect(result.data).toBeDefined();
```

**Key Features:**

- Chainable query builder (select, insert, update, delete, eq, neq, in, etc.)
- Promise-compatible (can be awaited directly)
- Storage API mocks
- Auth API mocks
- Realtime channel mocks

#### Factory Functions

```typescript
// Create mock user
const user = createMockUser({
  email: 'custom@example.com',
  id: 'custom-id',
});

// Create mock project
const project = createMockProject({
  title: 'My Project',
  user_id: user.id,
});

// Create mock asset
const asset = createMockAsset({
  type: 'video',
  storage_url: 'supabase://bucket/video.mp4',
});

// Create mock user profile
const profile = createMockUserProfile({
  tier: 'pro',
  video_minutes_limit: 500,
});
```

#### Helper Functions

```typescript
// Mock authenticated user
const user = mockAuthenticatedUser(mockSupabase, {
  email: 'test@example.com',
});

// Mock unauthenticated user
mockUnauthenticatedUser(mockSupabase, 'Session expired');

// Mock successful query
mockQuerySuccess(mockSupabase, [{ id: '1' }], 'single', 1);

// Mock query error
mockQueryError(mockSupabase, 'Database error', 'single');

// Mock storage operations
mockStorageUploadSuccess(mockSupabase, 'path/to/file');
mockStorageUploadError(mockSupabase, 'Upload failed');

// Reset all mocks
resetAllMocks(mockSupabase);
```

### Fetch API (`mockFetch.ts`)

#### Basic Usage

```typescript
// Mock successful response
mockFetchSuccess({ data: 'test' });

const response = await fetch('/api/test');
const data = await response.json();
expect(data).toEqual({ data: 'test' });

// Mock error response
mockFetchError('Not found', 404);

// Mock network error (rejection)
mockFetchReject(new Error('Network failure'));
```

#### Advanced Usage

```typescript
// Sequential responses
mockFetchSequence([
  { ok: true, status: 200, json: { id: '1' } },
  { ok: false, status: 500, json: { error: 'Server error' } },
]);

// URL-based responses
mockFetchByUrl({
  '/api/projects': { ok: true, json: { projects: [] } },
  '/api/assets/.*': (url) => ({ ok: true, json: { asset: { url } } }),
});

// Spy on fetch calls
const { spy, getCalls, wasCalledWith } = createFetchSpy();

await fetch('/api/test');
expect(wasCalledWith('/api/test')).toBe(true);
expect(getCalls()).toHaveLength(1);

// Cleanup
resetFetchMocks();
```

### Environment Variables (`mockEnv.ts`)

```typescript
// Mock specific variables
mockEnv({
  NEXT_PUBLIC_API_URL: 'http://test.com',
  STRIPE_SECRET_KEY: 'sk_test_mock',
});

// Set complete test environment
setTestEnv(); // Sets all common test variables

// Restore original environment
restoreEnv();

// Scoped environment (auto-restore)
withTestEnv({ API_KEY: 'test' }, () => {
  expect(process.env.API_KEY).toBe('test');
});

// Async scoped environment
await withTestEnvAsync({ API_KEY: 'test' }, async () => {
  // ... async operations
});

// Assert required variables
assertTestEnv(['SUPABASE_URL', 'STRIPE_KEY']);
```

### Stripe (`mockStripe.ts`)

```typescript
// Mock checkout session
const session = createMockCheckoutSession({
  id: 'cs_test_123',
  customer: 'cus_test_123',
  status: 'complete',
});

// Mock subscription
const subscription = createMockSubscription({
  status: 'active',
  current_period_end: Date.now() + 30 * 24 * 60 * 60,
});

// Mock customer
const customer = createMockCustomer({
  email: 'test@example.com',
});

// Mock webhook event
const event = createMockWebhookEvent('checkout.session.completed', {
  id: 'cs_test_123',
});

// Mock Stripe client
const stripe = createMockStripeClient();
stripe.checkout.sessions.create.mockResolvedValue(session);
```

---

## Factory Functions

### Test Data Generators (`testHelpers.ts`)

```typescript
// Generate test data with defaults
const asset = testData.asset({
  type: 'video',
  duration_seconds: 60,
});

const project = testData.project({
  title: 'Custom Title',
});

const message = testData.message({
  role: 'assistant',
  content: 'AI response',
});

const activity = testData.activity({
  activity_type: 'export',
});
```

### File Creation

```typescript
// Create mock file
const videoFile = createMockFile('video.mp4', 'video/mp4', 1024 * 1024);
const imageFile = createMockFile('image.jpg', 'image/jpeg', 512 * 1024);

// Create FileList
const files = createMockFileList([videoFile, imageFile]);

// Create Blob
const blob = createMockBlob('test content', 'text/plain');
```

---

## Test Helpers

### Async Utilities

```typescript
// Wait for condition
await asyncUtils.waitForCondition(
  () => state.isReady,
  5000, // timeout
  50 // interval
);

// Flush promises
await asyncUtils.flushPromises();

// Simple wait
await waitForAsync(100);

// Next tick
await nextTick();
```

### Console Mocking

```typescript
// Mock all console methods
const originalConsole = { ...console };
mockConsole();

console.log('test'); // Silent

// Restore
restoreConsole(originalConsole);

// Mock specific methods
const { log, error } = mockConsole(['log', 'error']);

console.log('test');
expect(log).toHaveBeenCalledWith('test');
```

### Browser API Mocks

```typescript
// IntersectionObserver
mockIntersectionObserver(true); // Elements intersecting

// ResizeObserver
mockResizeObserver();

// matchMedia
mockMatchMedia(true); // Matches

// URL APIs
const { createObjectURL, revokeObjectURL } = mockURL();
const url = createObjectURL(blob);

// Storage
const localStorage = mockLocalStorage();
localStorage.setItem('key', 'value');

const sessionStorage = mockSessionStorage();
```

### Timer Mocking

```typescript
const timers = mockTimers();

setTimeout(callback, 1000);

timers.advanceTimersByTime(1000);
expect(callback).toHaveBeenCalled();

timers.runAllTimers();
timers.clearAllTimers();
timers.restore();
```

---

## Component Testing

### Custom Render (`render.tsx`)

```typescript
import { render, screen } from '@/test-utils';

// Basic render
const { container } = render(<MyComponent />);

// With mock Supabase
const mockSupabase = createMockSupabaseClient();
render(<MyComponent />, { mockSupabase });

// With router props
render(<MyComponent />, {
  routerProps: {
    pathname: '/editor/123',
    query: { id: '123' },
  }
});

// With custom wrapper
render(<MyComponent />, {
  wrapper: ({ children }) => (
    <ThemeProvider>{children}</ThemeProvider>
  )
});
```

### Render Hook

```typescript
import { renderHook } from '@/test-utils';

const { result, rerender } = renderHook(() => useMyHook(), {
  mockSupabase: createMockSupabaseClient(),
});

expect(result.current.value).toBe(expected);
```

### Legacy Component Helpers

**From `/test-utils/legacy-helpers/components.tsx`:**

```typescript
// Render with providers
const { getByText, user } = renderWithProviders(<MyComponent />);

// Wait for loading
await waitForLoadingToFinish();

// Wait for element
const button = await waitForElement(
  () => screen.getByRole('button')
);

// Fill form
await fillForm(user, {
  email: 'test@example.com',
  password: 'password123',
});

// Click button
await clickButton(user, 'Submit');

// Submit form
await submitForm(user, 'form[name="login"]');

// Expectations
expectToHaveClasses(button, 'bg-blue-500', 'text-white');
expectToBeInteractive(button);
expectToBeDisabled(input);
expectTextContent(heading, 'Welcome');
expectNoErrors();
expectErrorMessage('Email is required');

// Dialog mocks
const alertMock = mockAlert();
const confirmMock = mockConfirm(true);
const promptMock = mockPrompt('User input');
```

---

## API Route Testing

### Creating Requests

```typescript
import { NextRequest } from 'next/server';

// Basic request
const request = new NextRequest('http://localhost:3000/api/test');

// JSON request
const request = new NextRequest('http://localhost:3000/api/projects', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Test' }),
});

// With authentication (using legacy helper)
import { createAuthenticatedRequest } from '@/test-utils/legacy-helpers/api';

const request = createAuthenticatedRequest('user-123', {
  method: 'POST',
  url: 'http://localhost:3000/api/projects',
  body: JSON.stringify({ title: 'Test' }),
});
```

### Response Assertions

```typescript
import {
  expectSuccessResponse,
  expectErrorResponse,
  expectUnauthorized,
  expectNotFound,
  expectBadRequest,
} from '@/test-utils/legacy-helpers/api';

// Success response
const data = await expectSuccessResponse(response, {
  id: expect.any(String),
  title: 'Test Project',
});

// Error response
await expectErrorResponse(response, 400, 'Invalid input');

// Specific error types
await expectUnauthorized(response);
await expectNotFound(response);
await expectBadRequest(response, 'Missing required field');

// Header assertions
expectHeaders(response, {
  'content-type': 'application/json',
  'cache-control': 'no-store',
});

expectHeaderContains(response, 'content-type', 'application/json');
```

### Mocking withAuth Middleware

```typescript
import { mockWithAuth } from '@/test-utils/mockWithAuth';

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(() => mockSupabase),
}));

describe('API Route', () => {
  it('requires authentication', async () => {
    const mockSupabase = createMockSupabaseClient();
    mockUnauthenticatedUser(mockSupabase);

    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

---

## Integration Testing

### Test Environment Setup

```typescript
import {
  createTestEnvironment,
  UserPersonas,
  IntegrationWorkflow,
} from '@/__tests__/integration/helpers/integration-helpers';

// Create environment with specific user persona
const { mockSupabase, user, workflow } = createTestEnvironment('proTierUser');

// Available personas:
// - freeTierUser: Limited resources
// - proTierUser: Ample resources
// - enterpriseUser: Maximum resources
// - newUser: No usage

// Custom user
const env = createTestEnvironment('freeTierUser');
const customUser = createMockUser({
  ...UserPersonas.freeTierUser(),
  email: 'custom@example.com',
});
```

### Workflow Orchestration

```typescript
const workflow = new IntegrationWorkflow(mockSupabase);

// Create project
const project = await workflow.createProjectWorkflow(user.id, {
  title: 'My Video Project',
});

// Upload asset
const asset = await workflow.uploadAssetWorkflow(
  project.id,
  user.id,
  'video' // or 'image', 'audio'
);

// Generate video
const aiVideo = await workflow.generateVideoWorkflow(project.id, user.id);

// Update timeline
const updatedProject = await workflow.updateTimelineWorkflow(project.id, user.id, timelineState);
```

### Project Templates

```typescript
import { ProjectTemplates } from '@/__tests__/integration/helpers/integration-helpers';

// Empty project
const project = ProjectTemplates.empty(user.id);

// Basic video project
const project = ProjectTemplates.basicVideo(user.id, [asset1.id, asset2.id]);

// Multi-track project
const project = ProjectTemplates.multiTrack(
  user.id,
  [video1.id, video2.id],
  [audio1.id, audio2.id]
);

// AI-generated project
const project = ProjectTemplates.aiGenerated(user.id);
```

### Asset Fixtures

```typescript
import { AssetFixtures } from '@/__tests__/integration/helpers/integration-helpers';

// Single assets
const video = AssetFixtures.video(projectId, userId);
const audio = AssetFixtures.audio(projectId, userId);
const image = AssetFixtures.image(projectId, userId);
const aiVideo = AssetFixtures.aiVideo(projectId, userId);

// Batch of assets
const videos = AssetFixtures.batch(projectId, userId, 5, 'video');
```

### Timeline Builders

```typescript
import { TimelineBuilders } from '@/__tests__/integration/helpers/integration-helpers';

// Single track
const timeline = TimelineBuilders.singleTrack(projectId, assets);

// Multi-track
const timeline = TimelineBuilders.multiTrack(projectId, videoAssets, audioAssets);

// Overlapping clips
const timeline = TimelineBuilders.overlapping(projectId, assets);

// Trimmed clips
const timeline = TimelineBuilders.trimmed(projectId, assets);
```

### Assertions

```typescript
import {
  assertTimelineValid,
  assertProjectValid,
  assertAssetValid,
} from '@/__tests__/integration/helpers/integration-helpers';

assertProjectValid(project);
assertAssetValid(asset);
assertTimelineValid(timeline);
```

---

## Custom Matchers

### Tailwind Class Matcher

```typescript
import { customMatchers } from '@/test-utils';

// Extend Jest matchers
expect.extend(customMatchers);

// Use in tests
const button = screen.getByRole('button');
expect(button).toHaveTailwindClasses('bg-blue-500', 'text-white');
```

---

## Test Templates

Test templates are located in `/test-utils/templates/` and provide boilerplate for common test types.

### Available Templates

1. **API Route Test** (`api-route.template.test.ts`)
2. **Component Test** (`component.template.test.tsx`)
3. **Integration Test** (`integration.template.test.ts`)
4. **Service Test** (`service.template.test.ts`)
5. **Hook Test** (`hook.template.test.ts`)

### Usage

Copy a template to your test directory and customize:

```bash
cp test-utils/templates/component.template.test.tsx __tests__/components/MyComponent.test.tsx
```

Then replace `TODO` comments with your actual test logic.

---

## Best Practices

### 1. Use Centralized Imports

```typescript
// Good: Import from main entry point
import { render, screen, createMockSupabaseClient } from '@/test-utils';

// Avoid: Direct file imports (unless necessary)
import { render } from '@/test-utils/render';
```

### 2. Reset Mocks Between Tests

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
```

### 3. Use Factory Functions

```typescript
// Good: Use factory with overrides
const user = createMockUser({ email: 'custom@example.com' });

// Avoid: Creating objects manually
const user = {
  id: 'user-123',
  email: 'test@example.com',
  // ... many more fields
};
```

### 4. Follow AAA Pattern

```typescript
test('user can create project', async () => {
  // Arrange
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);
  mockSupabase.mockResolvedValue({ data: project, error: null });

  // Act
  render(<CreateProjectButton />, { mockSupabase });
  await user.click(screen.getByText('Create'));

  // Assert
  expect(mockSupabase.from).toHaveBeenCalledWith('projects');
});
```

### 5. Use Descriptive Test Names

```typescript
// Good
test('shows error message when API call fails');
test('disables submit button while loading');
test('redirects to dashboard after successful login');

// Avoid
test('test1');
test('it works');
test('check button');
```

### 6. Test User Behavior, Not Implementation

```typescript
// Good: Test what user sees/does
await user.click(screen.getByRole('button', { name: 'Submit' }));
expect(screen.getByText('Success!')).toBeInTheDocument();

// Avoid: Testing internal state
expect(component.state.isSubmitting).toBe(true);
```

---

## Common Patterns

### Pattern 1: Authenticated API Test

```typescript
describe('GET /api/projects', () => {
  let mockSupabase: MockSupabaseChain;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('returns user projects', async () => {
    mockAuthenticatedUser(mockSupabase);
    mockSupabase.mockResolvedValue({
      data: [{ id: '1', title: 'Test' }],
      error: null,
    });

    const request = new NextRequest('http://localhost:3000/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
```

### Pattern 2: Component with Async Data

```typescript
test('loads and displays user data', async () => {
  const mockSupabase = createMockSupabaseClient();
  const user = mockAuthenticatedUser(mockSupabase);

  mockSupabase.mockResolvedValue({
    data: { id: user.id, name: 'John' },
    error: null,
  });

  render(<UserProfile />, { mockSupabase });

  // Wait for loading to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(screen.getByText('John')).toBeInTheDocument();
});
```

### Pattern 3: Form Submission

```typescript
test('submits form with validation', async () => {
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);

  const { user } = renderWithProviders(<ProjectForm />, { mockSupabase });

  // Fill form
  await user.type(screen.getByLabelText('Title'), 'My Project');
  await user.click(screen.getByRole('button', { name: 'Create' }));

  // Assert
  await waitFor(() => {
    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });
});
```

### Pattern 4: Error Handling

```typescript
test('displays error message on failure', async () => {
  mockFetchError('Network error', 500);

  render(<DataFetcher />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

### Pattern 5: Integration Test

```typescript
test('complete video editing workflow', async () => {
  const { mockSupabase, user, workflow } = createTestEnvironment('proTierUser');

  // Create project
  const project = await workflow.createProjectWorkflow(user.id, {
    title: 'My Video',
  });

  // Upload assets
  const video = await workflow.uploadAssetWorkflow(project.id, user.id, 'video');
  const audio = await workflow.uploadAssetWorkflow(project.id, user.id, 'audio');

  // Build timeline
  const timeline = TimelineBuilders.multiTrack(project.id, [video], [audio]);

  // Update project
  await workflow.updateTimelineWorkflow(project.id, user.id, timeline);

  // Assertions
  assertProjectValid(project);
  assertTimelineValid(timeline);
});
```

---

## Troubleshooting

### Common Pitfalls (Discovered by Agent 25)

#### Pitfall 1: Nested Interactive Elements

**Problem**: Nesting buttons inside buttons causes React hydration errors.

**Bad:**

```tsx
<button onClick={() => handleClick()}>
  <span>
    Click to upload or{' '}
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleOther();
      }}
    >
      select from library
    </button>
  </span>
</button>
```

**Solution**: Use div with button role for outer element

```tsx
<div
  role="button"
  tabIndex={disabled ? -1 : 0}
  onClick={() => !disabled && handleClick()}
  onKeyDown={(e) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleClick();
    }
  }}
  aria-disabled={disabled}
  aria-label="Upload reference image"
>
  <span>
    Click to upload or{' '}
    <button
      onClick={(e) => {
        e.stopPropagation();
        handleOther();
      }}
    >
      select from library
    </button>
  </span>
</div>
```

**Benefits:**

- Valid HTML structure
- No React hydration errors
- Full keyboard accessibility (Enter/Space support)
- Proper ARIA attributes for screen readers

#### Pitfall 2: Query Selector Ambiguity

**Problem**: Multiple elements match the same query, causing test failures.

**Bad:**

```typescript
// Too ambiguous - may match multiple elements
screen.getByRole('button', { name: /video/i });
```

**Solution**: Use more specific queries

```typescript
// Good: Specific with data-testid
screen.getByTestId('tab-videos');

// Good: Exact text match
screen.getByRole('button', { name: 'Upload Video' });

// Good: More specific role + name combination
screen.getByRole('tab', { name: 'Videos' });
```

**When to use data-testid:**

- Multiple similar elements on page
- Complex component hierarchies
- Elements that change text content
- When role/label queries are ambiguous

#### Pitfall 3: API Endpoint Mismatches

**Problem**: Tests mock wrong endpoint or expect wrong response format.

**Example from Agent 25:**

```typescript
// Bad: Wrong endpoint
mockFetch('/api/video-generation/generate');  // ❌

// Good: Correct endpoint
mockFetch('/api/video/generate');  // ✅

// Bad: Wrong response format
{ videoId: 'video-123', status: 'pending' }  // ❌

// Good: Actual API format
{ operationName: 'operation-video-123' }  // ✅
```

**Solution**: Always verify actual API endpoints and response formats before writing tests.

#### Pitfall 4: Incomplete Fetch Mocks

**Problem**: Missing mocks for polling or multi-step API flows.

**Bad:**

```typescript
// Only mocks initial request, missing status polling
mockFetch('/api/video/generate', { operationName: 'op-123' });
```

**Good:**

```typescript
beforeEach(() => {
  // Mock video generation API
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ operationName: 'operation-video-123' }),
  });

  // Mock status polling API (will be called multiple times)
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ done: false }),
  });
});
```

### Mock not being called

**Problem**: Mock function isn't being called in test.

**Solution**:

```typescript
// Ensure mock is set before code runs
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Then set implementation in test
beforeEach(() => {
  require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
});
```

### Chainable mock not working

**Problem**: Supabase query chain returns undefined.

**Solution**:

```typescript
// Use createMockSupabaseClient which handles chaining
const mockSupabase = createMockSupabaseClient();

// Configure the response
mockSupabase.mockResolvedValue({ data: [], error: null });

// Chain works correctly
await mockSupabase.from('table').select('*');
```

### Test timeout

**Problem**: Test times out waiting for async operation.

**Solution**:

```typescript
// Use waitFor with increased timeout
await waitFor(
  () => {
    expect(screen.getByText('Loaded')).toBeInTheDocument();
  },
  { timeout: 10000 }
);

// Or mock the async operation
mockFetchSuccess({ data: 'test' });
```

### Memory leaks in tests

**Problem**: Tests leave resources open.

**Solution**:

```typescript
afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  cleanup(); // from @testing-library/react
});
```

### Environment variables not set

**Problem**: process.env values are undefined.

**Solution**:

```typescript
// Set test environment
import { setTestEnv } from '@/test-utils';

beforeAll(() => {
  setTestEnv();
});

// Or mock specific variables
mockEnv({
  NEXT_PUBLIC_API_URL: 'http://test.com',
});
```

---

## Contributing

When adding new test utilities:

1. Add the utility to the appropriate file in `/test-utils/`
2. Export from `/test-utils/index.ts`
3. Add TypeScript types and JSDoc comments
4. Include usage examples in the JSDoc
5. Update this documentation
6. Add template if it's a common pattern
7. Write tests for the utility itself (if complex)

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Project Coding Standards](/docs/CODING_BEST_PRACTICES.md)

---

**Questions or Issues?**

If you encounter issues with test utilities or have suggestions for improvements, please:

1. Check this documentation first
2. Search existing tests for examples
3. Ask in the team chat
4. Create an issue with the `testing` label
