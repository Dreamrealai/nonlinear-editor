# Testing Guide

**Comprehensive guide for writing, running, and maintaining tests in the Non-Linear Editor project.**

Last Updated: 2025-10-25
Maintained by: Engineering Team

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Testing Patterns](#testing-patterns)
5. [Test Utilities](#test-utilities)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [Test Maintenance](#test-maintenance)

---

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Verify test utilities available
ls test-utils/  # Should show mockSupabase.ts, render.tsx, etc.
```

### Run Your First Test

```bash
# Run all tests
npm test

# Run specific file
npm test __tests__/components/LoadingSpinner.test.tsx

# Run with coverage
npm test -- --coverage

# Watch mode (auto-rerun on changes)
npm test -- --watch
```

### Project Test Structure

```
__tests__/
├── api/                    # API route tests
├── components/            # Component tests
├── integration/          # Integration tests
├── lib/                  # Library/utility tests
└── services/             # Service layer tests

test-utils/               # Shared test utilities
├── mockSupabase.ts      # Supabase mocking
├── mockWithAuth.ts      # Auth middleware mocking
├── render.tsx           # Component rendering
└── templates/           # Test templates
```

### Current Status

- **Total Tests:** 926 (2 skipped)
- **Passing:** 807 (87.3%)
- **Coverage:** 22.67% overall, 70.3% services
- **Test Suites:** 47 total

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run specific file
npm test path/to/file.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create project"

# Run by category
npm test __tests__/api/              # API tests only
npm test __tests__/components/       # Component tests only
npm test __tests__/services/         # Service tests only

# Watch mode for rapid iteration
npm test -- --watch

# Run only changed files
npm test -- --onlyChanged

# Update snapshots
npm test -- -u
```

### Debugging Tests

```bash
# Verbose output
npm test -- --verbose

# Detect open handles (memory leaks)
npm test -- --detectOpenHandles

# Run in band (no parallel execution)
npm test -- --runInBand

# Show full error messages
npm test -- --no-coverage --verbose
```

### Coverage Reports

```bash
# Generate coverage report
npm test -- --coverage

# Coverage for specific directory
npm test -- --coverage --collectCoverageFrom="lib/services/**"

# Open HTML coverage report
open coverage/lcov-report/index.html
```

---

## Writing Tests

### Test Structure (AAA Pattern)

Always follow the **Arrange-Act-Assert** pattern:

```typescript
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';

describe('MyFeature', () => {
  it('should do something', async () => {
    // ARRANGE - Set up test data and mocks
    const mockSupabase = createMockSupabaseClient();
    const user = mockAuthenticatedUser(mockSupabase);
    mockSupabase.mockResolvedValue({ data: [], error: null });

    // ACT - Perform the action being tested
    const result = await myFunction(user.id);

    // ASSERT - Verify the outcome
    expect(result).toBeDefined();
    expect(mockSupabase.from).toHaveBeenCalledWith('my_table');
  });
});
```

### Component Test Example

```typescript
import { render, screen, waitFor } from '@/test-utils';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('renders with user data', async () => {
    // Arrange
    const mockSupabase = createMockSupabaseClient();
    mockAuthenticatedUser(mockSupabase, { email: 'test@example.com' });

    // Act
    render(<MyComponent />, { mockSupabase });

    // Assert
    await waitFor(() => {
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
    });
  });
});
```

### API Route Test Example

```typescript
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/projects/route';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';
import { mockWithAuth } from '@/test-utils/mockWithAuth';

// Mock the auth middleware
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

// Mock Supabase client creator
jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

describe('GET /api/projects', () => {
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
  });

  it('returns user projects', async () => {
    // Arrange
    mockAuthenticatedUser(mockSupabase);
    mockSupabase.mockResolvedValue({
      data: [{ id: '1', title: 'Test Project' }],
      error: null,
    });

    // Act
    const request = new NextRequest('http://localhost:3000/api/projects');
    const response = await GET(request);

    // Assert
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toHaveLength(1);
  });
});
```

### Service Test Example

```typescript
import { createMockSupabaseClient } from '@/test-utils';
import { ProjectService } from '@/lib/services/projectService';

describe('ProjectService', () => {
  let service: ProjectService;
  let mockSupabase: ReturnType<typeof createMockSupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabaseClient();
    service = new ProjectService(mockSupabase);
  });

  it('creates project with valid data', async () => {
    // Arrange
    mockSupabase.mockResolvedValue({
      data: { id: 'project-123', title: 'Test Project' },
      error: null,
    });

    // Act
    const result = await service.createProject('user-123', { title: 'Test Project' });

    // Assert
    expect(result).toEqual({
      id: 'project-123',
      title: 'Test Project',
    });
    expect(mockSupabase.from).toHaveBeenCalledWith('projects');
  });
});
```

---

## Testing Patterns

### Pattern 1: Testing withAuth Protected Routes

```typescript
// Always use this pattern for authenticated API routes
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

beforeEach(() => {
  const mockSupabase = createMockSupabaseClient();
  require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);
});
```

### Pattern 2: Testing Async Component Updates

```typescript
import { render, screen, waitFor } from '@/test-utils';

it('updates after async operation', async () => {
  render(<MyComponent />);

  // Wait for async updates
  await waitFor(() => {
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  expect(screen.getByText('Data loaded')).toBeInTheDocument();
});
```

### Pattern 3: Testing Form Submissions

```typescript
import { render, screen } from '@/test-utils';
import userEvent from '@testing-library/user-event';

it('submits form with validation', async () => {
  const user = userEvent.setup();
  render(<MyForm />);

  // Fill form fields
  await user.type(screen.getByLabelText('Title'), 'My Project');
  await user.click(screen.getByRole('button', { name: 'Create' }));

  // Verify submission
  await waitFor(() => {
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });
});
```

### Pattern 4: Testing Error Handling

```typescript
it('displays error message on failure', async () => {
  // Mock error response
  mockSupabase.mockResolvedValue({
    data: null,
    error: { message: 'Database error' },
  });

  render(<MyComponent />);

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument();
  });
});
```

---

## Test Utilities

### Essential Imports

```typescript
// Most common imports for tests
import { render, screen, waitFor } from '@/test-utils';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';
import userEvent from '@testing-library/user-event';
```

### Supabase Mocking

```typescript
// Create mock client
const mockSupabase = createMockSupabaseClient();

// Mock authenticated user
const user = mockAuthenticatedUser(mockSupabase);

// Mock unauthenticated
mockUnauthenticatedUser(mockSupabase);

// Mock query success
mockSupabase.mockResolvedValue({
  data: [{ id: '1', title: 'Test' }],
  error: null,
});

// Mock query error
mockSupabase.mockResolvedValue({
  data: null,
  error: { message: 'Error' },
});
```

### Component Rendering

```typescript
// Basic render
render(<MyComponent />);

// With mock Supabase
render(<MyComponent />, { mockSupabase });

// With router props
render(<MyComponent />, {
  routerProps: {
    pathname: '/editor/123',
    query: { id: '123' },
  }
});
```

### Query Selectors

```typescript
// Find elements
screen.getByText('Submit')                    // By text content
screen.getByRole('button', { name: 'Submit' }) // By role and name
screen.getByLabelText('Email')                // By form label
screen.getByTestId('my-element')              // By test ID
screen.getByPlaceholderText('Search...')      // By placeholder

// Query variants
getBy...    // Throws if not found (assertions)
queryBy...  // Returns null if not found (checking absence)
findBy...   // Async, waits for element (async operations)
```

### Common Assertions

```typescript
// Element queries
expect(screen.getByText('Hello')).toBeInTheDocument();
expect(screen.queryByText('Missing')).not.toBeInTheDocument();

// Attributes
expect(input).toHaveValue('test');
expect(button).toBeDisabled();
expect(link).toHaveAttribute('href', '/home');

// Mock calls
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
```

---

## Best Practices

### 1. Test Behavior, Not Implementation

```typescript
// ✅ GOOD - Test what users see
expect(screen.getByText('Welcome, John')).toBeInTheDocument();

// ❌ BAD - Test internal state
expect(component.state.userName).toBe('John');
```

### 2. Use Semantic Queries

```typescript
// ✅ GOOD - Accessible queries
screen.getByRole('button', { name: 'Submit' });
screen.getByLabelText('Email');

// ❌ BAD - Implementation details
screen.getByClassName('submit-btn');
container.querySelector('#email-input');
```

### 3. Always Clean Up

```typescript
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});
```

### 4. Avoid Hardcoded Delays

```typescript
// ❌ BAD - Hardcoded delay
await new Promise((resolve) => setTimeout(resolve, 1000));

// ✅ GOOD - Wait for specific condition
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

### 5. Test One Thing Per Test

```typescript
// ✅ GOOD - Focused test
it('should create project with valid title', async () => {
  // Test project creation only
});

it('should validate project title length', () => {
  // Test validation only
});

// ❌ BAD - Testing everything
it('should handle all project operations', async () => {
  // Creates, updates, deletes, validates...
});
```

### 6. Write Descriptive Test Names

```typescript
// ✅ GOOD - Clear what's being tested
it('should return 401 when user is not authenticated', async () => {});
it('should create project with valid data', async () => {});

// ❌ BAD - Vague names
it('should work', async () => {});
it('test1', () => {});
```

---

## Troubleshooting

### Issue: Test Timeouts

**Symptom:** `Timeout - Async callback was not invoked within 5000ms`

**Solutions:**

```typescript
// 1. Ensure async operations are awaited
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// 2. Increase timeout if needed
it('long operation', async () => {
  // test code
}, 15000); // 15 second timeout

// 3. Check mocks are properly configured
mockSupabase.mockResolvedValue({ data: [], error: null });
```

### Issue: "Cannot find module '@/test-utils'"

**Solution:**

```typescript
// ✅ Correct import
import { render } from '@/test-utils';

// ❌ Wrong import
import { render } from '../../../test-utils';
```

### Issue: "Act warnings"

**Solution:**

```typescript
// Wrap state updates in waitFor
await waitFor(() => {
  expect(screen.getByText('Updated')).toBeInTheDocument();
});

// Use userEvent instead of fireEvent
const user = userEvent.setup();
await user.click(button); // ✅ Handles act() automatically
```

### Issue: Flaky Tests

**Solution:**

```typescript
// 1. Add proper waitFor with timeout
await waitFor(
  () => {
    expect(element).toBeInTheDocument();
  },
  { timeout: 10000 }
);

// 2. Reset state between tests
afterEach(() => {
  jest.clearAllMocks();
  cleanup();
});

// 3. Use fake timers for deterministic timing
jest.useFakeTimers();
act(() => {
  jest.advanceTimersByTime(1000);
});
jest.useRealTimers();
```

---

## Test Maintenance

### Daily Checklist

```bash
# 1. Run full test suite
npm test

# 2. Check pass rate (target: ≥95%)
npm test 2>&1 | grep "Tests:"

# 3. Review any failures
# If failures found, fix immediately
```

### Pre-Commit Checklist

Before committing code:

- [ ] Run tests for changed files: `npm test -- --onlyChanged`
- [ ] All tests pass
- [ ] Build succeeds: `npm run build`
- [ ] Coverage maintained: `npm test -- --coverage --onlyChanged`

### When Tests Fail

1. **Reproduce the failure**

   ```bash
   npm test -- path/to/failing-test.test.ts
   ```

2. **Read the error message carefully**
   - What was expected vs received?
   - Is it a timeout, assertion, or import error?

3. **Check recent changes**

   ```bash
   git log -p -- path/to/failing-test.test.ts
   ```

4. **Add debug output**

   ```typescript
   console.log('Debug:', result);
   screen.debug(); // Prints current DOM
   ```

5. **Fix the issue**
   - Fix the test if it's outdated
   - Fix the bug if test found a real issue
   - Skip temporarily only if blocking deployment

### Skipping Tests

```typescript
// Temporary skip with TODO
it.skip('should handle edge case', () => {
  // TODO: Fix after refactoring auth flow (Issue #123)
});

// Skip entire suite
describe.skip('Legacy API Routes', () => {
  // TODO: Migrate to new API structure (Issue #456)
});
```

---

## Quick Reference Card

### Most Common Commands

```bash
npm test                              # Run all tests
npm test -- --watch                   # Watch mode
npm test path/to/file.test.ts        # Specific file
npm test -- --testNamePattern="name"  # Pattern match
npm test -- --coverage                # With coverage
npm test -- --onlyChanged             # Only changed files
```

### Most Common Patterns

```typescript
// 1. Set up mock Supabase
const mockSupabase = createMockSupabaseClient();
mockAuthenticatedUser(mockSupabase);

// 2. Mock successful query
mockSupabase.mockResolvedValue({ data: [/* data */], error: null });

// 3. Render component
render(<MyComponent />, { mockSupabase });

// 4. Wait for async updates
await waitFor(() => {
  expect(screen.getByText('Expected')).toBeInTheDocument();
});

// 5. User interactions
const user = userEvent.setup();
await user.click(screen.getByRole('button'));
```

---

## Additional Resources

- **[Test Utilities Documentation](/docs/TESTING_UTILITIES.md)** - Complete utility reference
- **[Integration Testing Guide](/docs/INTEGRATION_TESTING_GUIDE.md)** - Integration test patterns
- **[E2E Testing Guide](/docs/E2E_TESTING_GUIDE.md)** - End-to-end testing
- **[Test Troubleshooting](/docs/TEST_TROUBLESHOOTING.md)** - Detailed troubleshooting guide
- **[Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)** - General best practices

### Test Templates

- `/test-utils/templates/api-route.template.test.ts` - API route template
- `/test-utils/templates/component.template.test.tsx` - Component template
- `/test-utils/templates/service.template.test.ts` - Service template
- `/test-utils/templates/integration.template.test.ts` - Integration template

---

**Remember**: Good tests are readable, focused, and maintainable. When in doubt, keep it simple!

---

**Document Version:** 2.0 (Consolidated)
**Last Updated:** 2025-10-25
**Consolidation:** Merged TESTING.md, TESTING_QUICK_START.md, TESTING_BEST_PRACTICES.md, TEST_ARCHITECTURE.md, and TEST_MAINTENANCE_RUNBOOK.md
