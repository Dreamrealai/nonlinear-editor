# Testing Best Practices

**Comprehensive guide to writing effective, maintainable tests for the non-linear video editor project.**

Last Updated: 2025-10-24 (Updated with Round 3 lessons learned)
Maintained by: Engineering Team

---

## Table of Contents

1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Types](#test-types)
4. [API Route Testing](#api-route-testing)
5. [Component Testing](#component-testing)
6. [Service Layer Testing](#service-layer-testing)
7. [Integration Testing](#integration-testing)
8. [Lessons from Round 3](#lessons-from-round-3)
9. [Common Pitfalls and Solutions](#common-pitfalls-and-solutions)
10. [Test Maintenance Best Practices](#test-maintenance-best-practices)
11. [Test Monitoring and Health Tracking](#test-monitoring-and-health-tracking)
12. [Performance Considerations](#performance-considerations)
13. [Accessibility Testing](#accessibility-testing)

---

## Overview

This guide consolidates testing best practices learned from extensive testing efforts, including critical infrastructure fixes and pattern improvements discovered in Round 3 (October 2024).

**Key Achievements:**

- Service coverage: 58.92% → 70.3% (+11.38pp)
- Integration test pass rate: 87.7% → 95.2%
- Fixed critical P0 withAuth mock infrastructure issue
- Established regression prevention system

---

## Testing Philosophy

### Core Principles

1. **Test Behavior, Not Implementation**
   - Focus on what users see and do
   - Avoid testing internal state unless necessary
   - Tests should survive refactoring

2. **Write Tests That Give Confidence**
   - Prefer integration over unit for complex flows
   - Mock only external dependencies (APIs, services)
   - Use real implementations when practical

3. **Maintain Test Health**
   - Fix failing tests immediately
   - Remove flaky tests or fix them
   - Keep tests fast and focused
   - Document complex test scenarios

4. **Follow AAA Pattern**
   - **Arrange**: Set up test data and environment
   - **Act**: Execute the code under test
   - **Assert**: Verify the expected outcome

### Test Quality Metrics

**Target Metrics:**

- Pass rate: ≥95%
- Coverage: ≥70% for services, ≥50% overall
- Test execution time: <5s per test
- Flaky test rate: <1%

---

## Test Types

### Unit Tests

**Purpose:** Test individual functions in isolation

**When to use:**

- Pure functions
- Utility functions
- Validation logic
- Error handling paths

**Example:**

```typescript
describe('validateProjectTitle', () => {
  it('should accept valid title', () => {
    expect(validateProjectTitle('My Project')).toBe(true);
  });

  it('should reject empty title', () => {
    expect(() => validateProjectTitle('')).toThrow('Title required');
  });

  it('should reject title over 100 characters', () => {
    const longTitle = 'a'.repeat(101);
    expect(() => validateProjectTitle(longTitle)).toThrow('Title too long');
  });
});
```

### Integration Tests

**Purpose:** Test multiple components working together

**When to use:**

- API route workflows
- Multi-step user flows
- Database interactions
- Service layer operations

**Example:**

```typescript
describe('Video Generation Workflow', () => {
  it('should complete full generation workflow', async () => {
    // Arrange
    const { user, workflow } = createTestEnvironment('proTierUser');

    // Act - Create project
    const project = await workflow.createProjectWorkflow(user.id, {
      title: 'AI Video Project',
    });

    // Act - Generate video
    const video = await workflow.generateVideoWorkflow(project.id, user.id);

    // Assert
    expect(video.metadata.aiGenerated).toBe(true);
    expect(project.assets).toContain(video.id);
  });
});
```

### End-to-End (E2E) Tests

**Purpose:** Test complete user journeys in browser

**When to use:**

- Critical user flows
- Cross-browser compatibility
- Visual regression testing
- Pre-deployment validation

See: [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)

---

## API Route Testing

### The withAuth Mock Pattern (Critical)

**Background:** Round 3 discovered a critical P0 issue where ~49 test files were timing out due to incorrect withAuth mocking. This pattern is now the **standard for all authenticated API route tests**.

**Root Cause:** Jest mock factory functions cannot access external variables, and parameter passing was incorrect for routes with dynamic params.

### Correct Pattern

**Always use this pattern for authenticated API routes:**

```typescript
// 1. Mock withAuth BEFORE importing route
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    // IMPORTANT: Use require() inside factory to avoid scope issues
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

    const authContext = { user, supabase };

    // Handle both 2-param and 3-param signatures
    if (context?.params !== undefined) {
      // 3-param: handler(request, authContext, routeContext)
      return handler(req, authContext, { params: context.params });
    } else {
      // 2-param: handler(request, authContext)
      return handler(req, authContext);
    }
  },
}));

// 2. Mock Supabase client creator
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// 3. Mock logger
jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// 4. Import route AFTER mocks
import { GET, POST } from '@/app/api/projects/route';

describe('GET /api/projects', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock Supabase instance
    mockSupabase = createMockSupabaseClient();

    // Configure authenticated user
    mockSupabase.auth = {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null,
      }),
    };

    // Set up the mock to return our instance
    const { createServerSupabaseClient } = require('@/lib/supabase');
    createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('should return user projects', async () => {
    // Configure database response
    mockSupabase.from = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({
          data: [{ id: '1', title: 'Test Project' }],
          error: null,
        }),
      }),
    });

    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });

  it('should require authentication', async () => {
    // Configure unauthenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const request = new NextRequest('http://localhost/api/projects');
    const response = await GET(request);

    expect(response.status).toBe(401);
  });
});
```

### Key Points

1. **Mock scope isolation**: Define ALL mocks inline in factory functions
2. **No external variables**: Cannot reference variables outside jest.mock()
3. **Parameter handling**: Check `context?.params` to handle dynamic routes
4. **Import order**: Mock BEFORE importing route handler
5. **Configuration in beforeEach**: Configure mocks, don't create new ones

### Common Mistakes

❌ **WRONG - External variable reference:**

```typescript
const mockSupabase = createMockSupabaseClient(); // ❌ Outside factory

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn().mockResolvedValue(mockSupabase), // ❌ Can't access
}));
```

❌ **WRONG - Wrong parameter handling:**

```typescript
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    return handler(req, context); // ❌ Missing authContext for 2-param routes
  },
}));
```

✅ **CORRECT - Inline mock, proper parameters:**

```typescript
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(), // ✅ Inline, configure in beforeEach
}));

jest.mock('@/lib/api/withAuth', () => ({
  withAuth: (handler: any) => async (req: any, context: any) => {
    const supabase = await require('@/lib/supabase').createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const authContext = { user, supabase };

    // ✅ Proper parameter handling
    if (context?.params !== undefined) {
      return handler(req, authContext, { params: context.params });
    } else {
      return handler(req, authContext);
    }
  },
}));
```

### Alternative: Integration Testing Approach

For complex API routes, consider the integration testing approach which eliminates mock complexity:

```typescript
import { createTestUser, createTestSupabaseClient } from '@/test-utils/testWithAuth';

// Import handler directly (not withAuth-wrapped export)
import { handleProjectCreate } from '@/app/api/projects/route';

describe('POST /api/projects - Integration', () => {
  it('should create project', async () => {
    const user = createTestUser();
    const supabase = createTestSupabaseClient(user.id);
    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ title: 'Test Project' }),
    });

    const response = await handleProjectCreate(request, { user, supabase });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.title).toBe('Test Project');
  });
});
```

**Benefits:**

- No withAuth mocking required
- Tests real service layer
- More maintainable
- Better confidence

See: [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md)

---

## Component Testing

### General Principles

1. **Test user behavior, not implementation**
2. **Use semantic queries** (getByRole, getByLabelText)
3. **Avoid implementation details** (internal state, props)
4. **Test accessibility** (keyboard navigation, ARIA)

### HTML Validation Patterns

**Critical lesson from Round 3:** Invalid HTML causes hydration errors and test failures.

#### Pitfall: Nested Interactive Elements

❌ **WRONG - Nested buttons:**

```tsx
<button onClick={handleUpload}>
  Click to upload or <button onClick={handleLibrary}>select from library</button>
</button>
```

**Problems:**

- Invalid HTML (buttons cannot be nested)
- React hydration errors
- Accessibility violations

✅ **CORRECT - Use div with button role:**

```tsx
<div
  role="button"
  tabIndex={disabled ? -1 : 0}
  onClick={() => !disabled && handleUpload()}
  onKeyDown={(e) => {
    if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      handleUpload();
    }
  }}
  aria-disabled={disabled}
  aria-label="Upload reference image"
>
  Click to upload or <button onClick={handleLibrary}>select from library</button>
</div>
```

**Benefits:**

- Valid HTML
- Full keyboard accessibility
- Proper ARIA semantics
- No React errors

### Query Selector Best Practices

**Lesson from Round 3:** Ambiguous selectors cause test failures.

**Priority order for queries:**

1. `getByRole` - Accessible queries (best)
2. `getByLabelText` - Form inputs
3. `getByPlaceholderText` - Input fallback
4. `getByText` - Content queries
5. `getByTestId` - Last resort

#### When to use data-testid

Use `data-testid` when:

- Multiple similar elements exist
- Text content changes dynamically
- Role/label queries are ambiguous
- Complex component hierarchies

❌ **WRONG - Ambiguous selector:**

```typescript
// Matches multiple elements
screen.getByRole('button', { name: /video/i });
```

✅ **CORRECT - Specific selector:**

```typescript
// Option 1: Exact text
screen.getByRole('button', { name: 'Upload Video' });

// Option 2: Specific role + name
screen.getByRole('tab', { name: 'Videos' });

// Option 3: data-testid for disambiguation
screen.getByTestId('tab-videos');
```

### Async Component Testing

```typescript
test('loads and displays user data', async () => {
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);

  mockSupabase.mockResolvedValue({
    data: { id: 'user-123', name: 'John' },
    error: null,
  });

  render(<UserProfile />, { mockSupabase });

  // Wait for loading state to finish
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(screen.getByText('John')).toBeInTheDocument();
});
```

### Form Testing

```typescript
test('submits form with validation', async () => {
  const mockSupabase = createMockSupabaseClient();
  mockAuthenticatedUser(mockSupabase);

  const { user } = render(<ProjectForm />, { mockSupabase });

  // Fill form
  await user.type(screen.getByLabelText('Project Title'), 'My Project');
  await user.selectOptions(screen.getByLabelText('Template'), 'blank');

  // Submit
  await user.click(screen.getByRole('button', { name: 'Create Project' }));

  // Wait for API call
  await waitFor(() => {
    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });

  // Verify success message
  expect(screen.getByText('Project created successfully')).toBeInTheDocument();
});
```

### Error State Testing

```typescript
test('displays error on API failure', async () => {
  mockFetchError('Network error', 500);

  render(<DataLoader />);

  await waitFor(() => {
    expect(screen.getByRole('alert')).toHaveTextContent('Network error');
  });

  // Verify retry button appears
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});
```

---

## Service Layer Testing

### Test Structure

```typescript
describe('ProjectService', () => {
  let service: ProjectService;
  let mockSupabase: MockSupabaseChain;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ProjectService(mockSupabase);
  });

  describe('createProject', () => {
    it('should create project with valid data', async () => {
      const projectData = { title: 'Test Project', user_id: 'user-123' };

      mockSupabase.mockResolvedValue({
        data: { id: 'project-123', ...projectData },
        error: null,
      });

      const result = await service.createProject('user-123', projectData);

      expect(result).toEqual({
        id: 'project-123',
        title: 'Test Project',
        user_id: 'user-123',
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('projects');
    });

    it('should throw error on database failure', async () => {
      mockSupabase.mockResolvedValue({
        data: null,
        error: { message: 'Database error' },
      });

      await expect(service.createProject('user-123', { title: 'Test' })).rejects.toThrow(
        'Database error'
      );
    });
  });
});
```

### Coverage Targets

**Target: 70% minimum for service layer**

Focus coverage on:

1. **Happy paths** - Core functionality
2. **Error paths** - Database errors, validation failures
3. **Edge cases** - Boundary conditions, null/undefined
4. **Business logic** - Complex calculations, transformations

**Less critical to cover:**

- Simple getters/setters
- Pass-through functions
- Trivial utility functions

---

## Integration Testing

See [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md) for comprehensive guide.

### Key Principles

1. **Use test implementations, not mocks**
2. **Test real service layer execution**
3. **Mock only external APIs** (Stripe, Google Cloud, AI)
4. **Use in-memory test database**

### Example Integration Test

```typescript
describe('Video Generation Flow - Integration', () => {
  it('should complete end-to-end generation', async () => {
    const { user, workflow } = createTestEnvironment('proTierUser');

    // Create project
    const project = await workflow.createProjectWorkflow(user.id, {
      title: 'AI Video',
    });

    // Generate video
    const video = await workflow.generateVideoWorkflow(project.id, user.id, {
      prompt: 'A cat playing piano',
      duration: 10,
    });

    // Verify video created
    expect(video.metadata.aiGenerated).toBe(true);
    expect(video.duration_seconds).toBe(10);

    // Verify project updated
    const updatedProject = await workflow.getProject(project.id);
    expect(updatedProject.assets).toContain(video.id);
  });
});
```

---

## Lessons from Round 3

### 1. Jest Mock Factory Scope Issues (P0)

**Problem:** Mock factories cannot access external variables.

**Solution:** Define all mocks inline in factory functions.

**Impact:** Fixed ~49 timeout failures, unblocked 400-500 API tests.

**Reference:** `/archive/2025-10-24-analysis-reports/WITHAUTH_MOCK_FIX_SOLUTION.md`

### 2. Dynamic Import Pattern for Services

**Problem:** Services with module-level code caused import errors in tests.

**Solution:** Use dynamic imports in tests.

```typescript
// OLD - Fails if service has module-level code
import { SentryService } from '@/lib/services/sentryService';

// NEW - Works reliably
let SentryService: any;
beforeAll(async () => {
  const module = await import('@/lib/services/sentryService');
  SentryService = module.SentryService;
});
```

**Impact:** Fixed sentryService test failures.

### 3. Integration Testing vs Heavy Mocking

**Problem:** Complex withAuth mocking was brittle and hard to maintain.

**Solution:** Use integration tests with test implementations.

**Benefits:**

- 71% fewer mocks (7 → 2 per test)
- 55% less code
- 95% real logic tested
- No timeout issues

**Impact:** More maintainable, more confident tests.

### 4. HTML Validation Prevents Hydration Errors

**Problem:** Nested interactive elements caused React errors.

**Solution:** Use div with button role for outer element.

**Impact:** Fixed component integration test failures.

### 5. API Endpoint Verification Essential

**Problem:** Tests mocked wrong endpoints or response formats.

**Solution:** Always verify actual API contract before writing tests.

**Example:**

```typescript
// WRONG - Assumed endpoint
mockFetch('/api/video-generation/generate');

// CORRECT - Actual endpoint
mockFetch('/api/video/generate');
```

**Impact:** Fixed 15+ component integration tests.

### 6. Multi-Step API Flows Need Complete Mocks

**Problem:** Tests only mocked initial request, missing polling endpoints.

**Solution:** Mock all endpoints in the flow.

```typescript
beforeEach(() => {
  // Initial request
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ operationName: 'op-123' }),
  });

  // Status polling (called multiple times)
  (global.fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => ({ done: false }),
  });
});
```

**Impact:** Fixed async component test failures.

---

## Common Pitfalls and Solutions

### 1. Mock Not Being Called

**Symptom:** Mock function shows 0 calls in assertions.

**Causes:**

- Mock defined after import
- Mock not properly configured
- Code path not executed

**Solution:**

```typescript
// ✅ Mock BEFORE import
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// Then import
import { GET } from '@/app/api/projects/route';

// Configure in test
beforeEach(() => {
  const { createServerSupabaseClient } = require('@/lib/supabase');
  createServerSupabaseClient.mockResolvedValue(mockSupabase);
});
```

### 2. Test Timeouts

**Symptom:** Test exceeds timeout (usually 5000ms).

**Causes:**

- Unresolved promise
- Missing mock
- Infinite loop
- Missing waitFor

**Solutions:**

```typescript
// 1. Increase timeout for specific test
it('slow operation', async () => {
  // ...
}, 10000); // 10 second timeout

// 2. Use waitFor with custom timeout
await waitFor(() => expect(screen.getByText('Loaded')).toBeInTheDocument(), { timeout: 10000 });

// 3. Ensure all promises resolve
mockFetchSuccess({ data: 'test' });
```

### 3. Flaky Tests

**Symptom:** Test passes sometimes, fails other times.

**Causes:**

- Race conditions
- Shared state between tests
- Timing dependencies
- External dependencies

**Solutions:**

```typescript
// 1. Reset state between tests
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

// 2. Use waitFor for async assertions
await waitFor(() => {
  expect(element).toBeInTheDocument();
});

// 3. Mock timers
jest.useFakeTimers();
act(() => {
  jest.advanceTimersByTime(1000);
});
jest.useRealTimers();

// 4. Isolate tests
test.only('specific test', () => {
  // Run in isolation
});
```

### 4. Memory Leaks

**Symptom:** Tests slow down over time, process crashes.

**Causes:**

- Event listeners not removed
- Timers not cleared
- Mocks not reset

**Solution:**

```typescript
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();

  // Clean up React components
  cleanup();

  // Clear fake timers
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
    jest.useRealTimers();
  }
});
```

### 5. Import Order Issues

**Symptom:** "Cannot access before initialization" errors.

**Solution:**

```typescript
// ✅ CORRECT ORDER

// 1. Mock declarations (hoisted)
jest.mock('@/lib/api/withAuth');
jest.mock('@/lib/supabase');

// 2. Imports
import { GET } from '@/app/api/route';

// 3. Test setup
describe('API Route', () => {
  beforeEach(() => {
    // Configure mocks
  });
});
```

---

## Test Maintenance Best Practices

### 1. Fix Failures Immediately

**Never leave tests failing.** Broken tests lose value quickly.

**Options when tests fail:**

1. Fix the test (preferred)
2. Fix the bug the test found
3. Skip the test temporarily with TODO comment
4. Delete the test if no longer valid

```typescript
// Temporary skip with TODO
it.skip('should handle edge case', () => {
  // TODO: Fix after refactoring auth flow (Issue #123)
});
```

### 2. Keep Tests DRY

**Extract common setup to helpers:**

```typescript
// helpers/testSetup.ts
export function createAuthenticatedTestEnv() {
  const mockSupabase = createMockSupabaseClient();
  const user = mockAuthenticatedUser(mockSupabase);
  return { mockSupabase, user };
}

// test file
describe('Projects API', () => {
  let env: ReturnType<typeof createAuthenticatedTestEnv>;

  beforeEach(() => {
    env = createAuthenticatedTestEnv();
  });

  it('should create project', async () => {
    // Use env.mockSupabase, env.user
  });
});
```

### 3. Document Complex Tests

```typescript
describe('Export workflow with advanced timeline', () => {
  /**
   * This test verifies the export process handles:
   * - Multiple video tracks with overlapping clips
   * - Audio tracks with different sample rates
   * - Effects applied at timeline and clip levels
   * - Custom output settings (resolution, bitrate, codec)
   *
   * Known issues:
   * - Audio sync can be off by 1-2 frames (acceptable)
   * - Export may take >5s for complex timelines
   */
  it('should export multi-track timeline', async () => {
    // ...
  });
});
```

### 4. Use Test Tags

```typescript
// Mark slow tests
describe('Video processing @slow', () => {
  // ...
});

// Run only fast tests
// npm test -- --testNamePattern="^((?!@slow).)*$"

// Mark integration tests
describe('Full workflow @integration', () => {
  // ...
});
```

### 5. Monitor Test Health

**Track metrics:**

- Pass rate by category (components, API, services)
- Execution time trends
- Flaky test frequency
- Coverage trends

See: [REGRESSION_PREVENTION.md](./REGRESSION_PREVENTION.md)

---

## Test Monitoring and Health Tracking

### Overview

Monitoring test health is critical for maintaining a reliable test suite. We provide automated tools to detect flaky tests and identify performance bottlenecks.

### Flaky Test Detection

**Purpose:** Identify tests that pass/fail inconsistently without code changes.

**Usage:**

```bash
# Run with default settings (10 iterations)
npm run test:flaky

# Run with custom iterations (2-20)
npm run test:flaky 5

# Run on specific test pattern
npm run test:flaky 10 "api/**"
```

**How it works:**

1. Runs the test suite N times (default: 10)
2. Tracks pass/fail status for each test
3. Identifies tests with inconsistent results
4. Generates report with pass rate and failure patterns

**Output:**

- Console report with flaky tests ranked by severity
- JSON report saved to `test-reports/flaky-tests.json`
- Recommendations for fixing common flaky test causes

**Example output:**

```
═══════════════════════════════════════════
       Flaky Test Detection Report
═══════════════════════════════════════════

  Total Iterations:  10
  Flaky Tests Found: 3

  ⚠️  Flaky Tests (inconsistent results):
─────────────────────────────────────────

1. __tests__/api/projects/route.test.ts
   should create project with valid data
   Pass Rate: 60.0% (6/10)
   Average Duration: 234ms
   Results: ✓ ✗ ✓ ✗ ✓ ✓ ✓ ✓ ✗ ✗
```

**Common causes of flaky tests:**

1. Race conditions in async code
2. Missing await/Promise.resolve()
3. Shared mutable state between tests
4. Timing-dependent assertions
5. External dependencies (network, file system)
6. Insufficient test cleanup

**Fixing flaky tests:**

1. Review test for async/await patterns
2. Add proper test isolation (beforeEach/afterEach)
3. Use waitFor/findBy queries in React tests
4. Mock external dependencies completely
5. Increase test timeouts if needed
6. Consider using jest.retryTimes() as temporary measure

### Test Performance Monitoring

**Purpose:** Identify slow tests and track performance trends.

**Usage:**

```bash
# Run with default threshold (5000ms)
npm run test:perf

# Run with custom threshold
npm run test:perf 3000

# Run with higher threshold for complex tests
npm run test:perf 10000
```

**How it works:**

1. Runs the full test suite with verbose timing
2. Collects execution time for each test
3. Calculates performance statistics
4. Identifies tests exceeding threshold
5. Ranks slowest test suites

**Output:**

- Console report with performance statistics
- JSON report saved to `test-reports/test-performance.json`
- Top 10 slowest tests with execution times
- Suite-level performance breakdown

**Example output:**

```
═══════════════════════════════════════════
       Test Performance Report
═══════════════════════════════════════════

  Total Tests Analyzed: 3,847
  Slow Test Threshold:  5000ms
  Slow Tests Found:     12

  📊 Performance Statistics:
     Average Duration:  147ms
     Median Duration:   89ms
     95th Percentile:   892ms
     99th Percentile:   3,421ms
     Fastest Test:      12ms
     Slowest Test:      7,834ms

  ⚠️  Slow Tests (>= 5000ms):
─────────────────────────────────────────

1. 7834ms (+57%)
   __tests__/integration/video-generation.test.ts
   should generate video with AI model

2. 6234ms (+25%)
   __tests__/api/export/export.test.ts
   should export complex timeline
```

**Common causes of slow tests:**

1. Unnecessary setTimeout/delays
2. Large data fixtures or mock data
3. Complex DOM rendering in component tests
4. Excessive mock setup/teardown
5. Unoptimized database queries in integration tests
6. Heavy computation in test setup

**Optimizing slow tests:**

1. Use jest.useFakeTimers() for time-based tests
2. Reduce fixture data to minimum needed
3. Use shallow rendering when possible
4. Cache expensive mock setups
5. Consider splitting large test files
6. Use test.concurrent for independent tests
7. Profile tests with --detectLeaks flag

### Performance Targets

**Target execution times:**

- Unit tests: < 100ms
- Integration tests: < 1s
- API route tests: < 500ms
- Component tests: < 300ms
- E2E tests: < 10s

**Threshold recommendations:**

- Development: 5000ms (default)
- CI pipeline: 3000ms (stricter)
- Performance regression: 1000ms (very strict)

### Monitoring Best Practices

1. **Run flaky detection regularly**
   - After major refactoring
   - When adding new test infrastructure
   - When test suite shows inconsistent behavior
   - Weekly in CI (optional)

2. **Run performance monitoring**
   - Before/after performance optimizations
   - When tests feel slow
   - Monthly to track trends
   - In CI to prevent regressions

3. **Set up continuous monitoring**
   - Track metrics over time
   - Alert on degradation trends
   - Review reports in team meetings
   - Document and fix issues promptly

4. **Use reports for prioritization**
   - Fix tests with <50% pass rate first
   - Optimize tests >10x threshold
   - Document acceptable slow tests
   - Remove or skip broken tests

### Report Format

**Flaky tests report (`test-reports/flaky-tests.json`):**

```json
{
  "timestamp": "2025-10-24T20:00:00.000Z",
  "iterations": 10,
  "totalFlakyTests": 3,
  "flakyTests": [
    {
      "suite": "__tests__/api/projects/route.test.ts",
      "name": "should create project with valid data",
      "passRate": 60.0,
      "totalRuns": 10,
      "passCount": 6,
      "failCount": 4,
      "avgDuration": 234
    }
  ]
}
```

**Performance report (`test-reports/test-performance.json`):**

```json
{
  "timestamp": "2025-10-24T20:00:00.000Z",
  "threshold": 5000,
  "totalTests": 3847,
  "slowTests": 12,
  "avgDuration": 147,
  "medianDuration": 89,
  "p95Duration": 892,
  "p99Duration": 3421,
  "slowTestList": [
    {
      "suite": "__tests__/integration/video-generation.test.ts",
      "name": "should generate video with AI model",
      "duration": 7834,
      "threshold": 5000,
      "exceedBy": 2834
    }
  ],
  "suitePerformance": [
    {
      "suite": "__tests__/integration/",
      "totalTests": 146,
      "totalDuration": 45234,
      "avgDuration": 309,
      "slowTests": 5
    }
  ]
}
```

### Integration with CI/CD

Add monitoring to your CI pipeline:

```yaml
# .github/workflows/test-health.yml
name: Test Health Check

on:
  schedule:
    - cron: '0 0 * * 0' # Weekly on Sunday
  workflow_dispatch: # Manual trigger

jobs:
  test-health:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run flaky test detection
        run: npm run test:flaky 10
        continue-on-error: true

      - name: Run performance monitoring
        run: npm run test:perf 3000

      - name: Upload reports
        uses: actions/upload-artifact@v4
        with:
          name: test-health-reports
          path: test-reports/

      - name: Comment on PR (if applicable)
        if: github.event_name == 'pull_request'
        uses: actions/github-script@v7
        with:
          script: |
            // Post report summary as comment
```

---

## Performance Considerations

### 1. Parallelize Independent Tests

```typescript
// ✅ Tests run in parallel by default
describe('API Routes', () => {
  it('test 1', async () => {});
  it('test 2', async () => {});
  it('test 3', async () => {});
});

// ❌ Avoid serial execution unless required
describe.serial('Sequential tests', () => {
  // Only if tests have dependencies
});
```

### 2. Minimize Test Setup

```typescript
// ❌ SLOW - Creates new mock for each test
beforeEach(() => {
  mockSupabase = createMockSupabaseClient();
  // 50+ lines of configuration
});

// ✅ FAST - Reuse mock, reset state
beforeAll(() => {
  mockSupabase = createMockSupabaseClient();
});

beforeEach(() => {
  jest.clearAllMocks();
  // Minimal state reset
});
```

### 3. Use Fake Timers

```typescript
// ❌ SLOW - Real 5 second delay
it('should timeout after 5 seconds', async () => {
  await new Promise((resolve) => setTimeout(resolve, 5000));
});

// ✅ FAST - Instant with fake timers
it('should timeout after 5 seconds', () => {
  jest.useFakeTimers();

  const callback = jest.fn();
  setTimeout(callback, 5000);

  jest.advanceTimersByTime(5000);
  expect(callback).toHaveBeenCalled();

  jest.useRealTimers();
});
```

### 4. Skip Heavy Integration Tests in Development

```bash
# Fast feedback loop
npm test -- --testPathIgnorePatterns=integration

# Full test suite in CI
npm test
```

---

## Accessibility Testing

### 1. Keyboard Navigation

```typescript
test('should be keyboard accessible', async () => {
  const { user } = render(<MyComponent />);

  // Tab to button
  await user.tab();
  expect(screen.getByRole('button')).toHaveFocus();

  // Activate with Enter
  await user.keyboard('{Enter}');
  expect(onClickMock).toHaveBeenCalled();

  // Or activate with Space
  await user.keyboard(' ');
  expect(onClickMock).toHaveBeenCalledTimes(2);
});
```

### 2. Screen Reader Support

```typescript
test('should have proper ARIA labels', () => {
  render(<LoginForm />);

  expect(screen.getByRole('form')).toHaveAccessibleName('Login');
  expect(screen.getByLabelText('Email')).toBeInTheDocument();
  expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  expect(screen.getByRole('button', { name: 'Sign In' })).toBeEnabled();
});
```

### 3. Color Contrast

Use axe-core for automated accessibility testing:

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';
expect.extend(toHaveNoViolations);

test('should have no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

---

## Quick Reference

### Test Command Cheatsheet

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/file.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create"

# Run with coverage
npm test -- --coverage

# Run only changed files
npm test -- --onlyChanged

# Update snapshots
npm test -- -u

# Run in band (no parallelization)
npm test -- --runInBand
```

### Common Test Utilities

```typescript
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
  createMockSupabaseClient,
  mockAuthenticatedUser,
  createTestEnvironment,
} from '@/test-utils';
```

### Common Assertions

```typescript
// Element queries
expect(screen.getByText('Hello')).toBeInTheDocument();
expect(screen.queryByText('Missing')).not.toBeInTheDocument();
await screen.findByText('Async'); // Waits for element

// Accessibility
expect(element).toHaveAccessibleName('Submit');
expect(element).toHaveAccessibleDescription('Click to submit');

// Attributes
expect(input).toHaveValue('test');
expect(button).toBeDisabled();
expect(link).toHaveAttribute('href', '/home');

// CSS classes
expect(element).toHaveClass('active');
expect(element).toHaveStyle({ color: 'red' });

// Mock calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

---

## Additional Resources

- [TESTING_UTILITIES.md](./TESTING_UTILITIES.md) - Complete utility reference
- [INTEGRATION_TESTING_GUIDE.md](./INTEGRATION_TESTING_GUIDE.md) - Integration test patterns
- [TEST_MAINTENANCE_RUNBOOK.md](./TEST_MAINTENANCE_RUNBOOK.md) - Maintenance procedures
- [TEST_TROUBLESHOOTING.md](./TEST_TROUBLESHOOTING.md) - Common issues and fixes
- [REGRESSION_PREVENTION.md](./REGRESSION_PREVENTION.md) - CI/CD and monitoring
- [E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md) - End-to-end testing

---

**Questions or feedback?** Update this document or open an issue with the `testing` label.
