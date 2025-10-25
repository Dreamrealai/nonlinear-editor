# Testing Quick Start Guide

**Quick reference for writing and running tests in the Non-Linear Editor project.**

Last Updated: 2025-10-24
Maintained by: Engineering Team

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Running Tests](#running-tests)
3. [Writing Your First Test](#writing-your-first-test)
4. [Common Test Patterns](#common-test-patterns)
5. [Test Utilities Quick Reference](#test-utilities-quick-reference)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Best Practices Checklist](#best-practices-checklist)

---

## Getting Started

### Prerequisites

```bash
# Install dependencies
npm install

# Ensure test utilities are available
ls test-utils/  # Should show mockSupabase.ts, render.tsx, etc.
```

### Project Test Structure

```
__tests__/
├── api/                    # API route tests
│   ├── projects/          # Project endpoints
│   ├── assets/            # Asset endpoints
│   └── video/             # Video generation endpoints
├── components/            # Component tests
│   ├── editor/           # Editor components
│   └── ui/               # UI components
├── integration/          # Integration tests
│   └── helpers/          # Integration test utilities
└── services/             # Service layer tests

test-utils/               # Shared test utilities
├── mockSupabase.ts      # Supabase mocking
├── mockWithAuth.ts      # Auth middleware mocking
├── render.tsx           # Component rendering
└── templates/           # Test templates
```

---

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific file
npm test path/to/file.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="should create project"

# Watch mode
npm test -- --watch

# Run only changed files
npm test -- --onlyChanged
```

### Category-Specific Tests

```bash
# Service tests only
npm test -- --testMatch='**/__tests__/services/*.test.ts'

# Integration tests only
npm test -- --testMatch='**/__tests__/integration/*.test.ts'

# Component tests only
npm test -- --testMatch='**/__tests__/components/*.test.tsx'

# API route tests only
npm test -- --testMatch='**/__tests__/api/**/*.test.ts'
```

### Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Detect open handles (memory leaks)
npm test -- --detectOpenHandles

# Run in band (no parallel execution)
npm test -- --runInBand

# Show full error messages
npm test -- --no-coverage --verbose
```

---

## Writing Your First Test

### 1. Choose the Right Template

```bash
# Copy appropriate template to your test file
cp test-utils/templates/service.template.test.ts __tests__/services/myService.test.ts
cp test-utils/templates/component.template.test.tsx __tests__/components/MyComponent.test.tsx
cp test-utils/templates/api-route.template.test.ts __tests__/api/my-route.test.ts
```

### 2. Basic Test Structure (AAA Pattern)

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

### 3. Component Test Example

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

### 4. API Route Test Example

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

---

## Common Test Patterns

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

### Pattern 5: Testing Integration Workflows

```typescript
import {
  createTestEnvironment,
  IntegrationWorkflow,
} from '@/__tests__/integration/helpers/integration-helpers';

it('completes full workflow', async () => {
  const { mockSupabase, user, workflow } = createTestEnvironment('proTierUser');

  // Create project
  const project = await workflow.createProjectWorkflow(user.id, {
    title: 'My Video',
  });

  // Upload asset
  const asset = await workflow.uploadAssetWorkflow(project.id, user.id, 'video');

  // Verify workflow
  expect(project).toBeDefined();
  expect(asset.project_id).toBe(project.id);
});
```

---

## Test Utilities Quick Reference

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

### Factory Functions

```typescript
// Create mock entities
const user = createMockUser({ email: 'custom@example.com' });
const project = createMockProject({ title: 'My Project' });
const asset = createMockAsset({ type: 'video' });
```

### Fetch Mocking

```typescript
// Mock successful response
mockFetchSuccess({ data: 'test' });

// Mock error
mockFetchError('Not found', 404);

// Sequential responses
mockFetchSequence([
  { ok: true, json: { id: '1' } },
  { ok: false, json: { error: 'Failed' } },
]);
```

---

## Common Issues & Solutions

### Issue 1: "Cannot find module '@/test-utils'"

**Solution:**

```typescript
// Use correct import path
import { render } from '@/test-utils'; // ✅ Correct

// Not this:
import { render } from '../../../test-utils'; // ❌ Avoid
```

### Issue 2: "TypeError: Cannot read property 'from' of undefined"

**Solution:**

```typescript
// Mock Supabase before using it
const mockSupabase = createMockSupabaseClient();
require('@/lib/supabase').createServerSupabaseClient.mockResolvedValue(mockSupabase);

// Then configure response
mockSupabase.mockResolvedValue({ data: [], error: null });
```

### Issue 3: "Test timeout exceeded"

**Solution:**

```typescript
// 1. Ensure async operations are awaited
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});

// 2. Increase timeout if needed
it('long operation', async () => {
  // test code
}, 15000); // 15 second timeout

// 3. Mock slow operations
mockSupabase.mockResolvedValue({ data: [], error: null }); // Instant response
```

### Issue 4: "Act warnings"

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

### Issue 5: "withAuth mock not working"

**Solution:**

```typescript
// Use the correct pattern - mock BEFORE importing route
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: mockWithAuth,
}));

jest.mock('@/lib/supabase', () => ({
  createServerSupabaseClient: jest.fn(),
}));

// THEN import the route
import { GET } from '@/app/api/my-route/route';
```

### Issue 6: "Query chain not working"

**Solution:**

```typescript
// createMockSupabaseClient handles chaining automatically
const mockSupabase = createMockSupabaseClient();

// Configure final response
mockSupabase.mockResolvedValue({ data: [], error: null });

// Chain works correctly
await mockSupabase.from('table').select('*').eq('id', '1'); // ✅
```

---

## Best Practices Checklist

Before submitting your test, ensure:

- [ ] **Test follows AAA pattern** (Arrange, Act, Assert)
- [ ] **Test name describes what it does** (not "test1" or "works")
- [ ] **Mocks are reset between tests** (`beforeEach` with `jest.clearAllMocks()`)
- [ ] **Async operations are awaited** (use `waitFor` for async assertions)
- [ ] **No hardcoded delays** (no `setTimeout`, use `waitFor` instead)
- [ ] **Test one thing per test** (focused, not testing everything)
- [ ] **Error cases are tested** (not just happy path)
- [ ] **Mocks are specific** (mock exactly what you need, no more)
- [ ] **Uses test utilities** (not duplicating mock code)
- [ ] **TypeScript types are correct** (no `any`, use proper types)

### Code Quality Checks

```bash
# Before committing tests
npm run type-check    # TypeScript validation
npm run lint          # ESLint checks
npm run format:check  # Prettier formatting
npm test -- path/to/your.test.ts  # Run your test
```

---

## Quick Reference Card

### Most Common Imports

```typescript
// Essential imports for most tests
import { render, screen, waitFor } from '@/test-utils';
import { createMockSupabaseClient, mockAuthenticatedUser } from '@/test-utils';
import userEvent from '@testing-library/user-event';
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

### Most Common Queries

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

---

## Need More Help?

### Documentation

- **[Full Testing Utilities Guide](/docs/TESTING_UTILITIES.md)** - Comprehensive reference
- **[Testing Best Practices](/docs/CODING_BEST_PRACTICES.md)** - General guidelines
- **[Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md)** - Service testing patterns

### Test Templates

- `/test-utils/templates/api-route.template.test.ts`
- `/test-utils/templates/component.template.test.tsx`
- `/test-utils/templates/integration.template.test.ts`
- `/test-utils/templates/service.template.test.ts`
- `/test-utils/templates/hook.template.test.tsx`

### Example Tests

Look at existing tests for examples:

- **Service tests**: `__tests__/services/projectService.test.ts`
- **Component tests**: `__tests__/components/ui/Button.test.tsx`
- **API tests**: `__tests__/api/projects/route.test.ts`
- **Integration tests**: `__tests__/integration/project-workflow.test.ts`

---

**Remember**: Good tests are readable, focused, and maintainable. When in doubt, keep it simple!

---

**Document Version:** 1.0
**Last Updated:** 2025-10-24
**Maintained By:** Agent 30 - Documentation and Cleanup Specialist
