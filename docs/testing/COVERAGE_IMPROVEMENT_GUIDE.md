# Coverage Improvement Guide

**Last Updated:** 2025-10-25

## Overview

This guide provides strategies for systematically improving test coverage across the codebase. The goal is to achieve **70% overall coverage** while prioritizing high-impact areas.

## Table of Contents

- [Current Coverage Status](#current-coverage-status)
- [Coverage Targets](#coverage-targets)
- [How to Identify Gaps](#how-to-identify-gaps)
- [Prioritization Framework](#prioritization-framework)
- [Strategic Testing Approaches](#strategic-testing-approaches)
- [Measuring Progress](#measuring-progress)
- [Common Uncovered Patterns](#common-uncovered-patterns)

---

## Current Coverage Status

**As of 2025-10-25** (refer to ISSUES.md for latest metrics):

| Category      | Current | Target | Status |
|---------------|---------|--------|--------|
| Overall       | ~65%    | 70%    | 🟡 In Progress |
| Services      | 83.31%  | 80%    | ✅ Exceeds Target |
| State         | 81.42%  | 80%    | ✅ Exceeds Target |
| Hooks         | 65.78%  | 70%    | 🟡 Near Target |
| Lib           | 69.72%  | 70%    | 🟡 Near Target |
| API Routes    | ~64%    | 70%    | 🟡 In Progress |
| Components    | ~62%    | 70%    | 🟡 In Progress |

**Note:** Run `npm test -- --coverage` to get the latest metrics.

---

## Coverage Targets

### Tier 1: Critical (90%+ coverage required)

These areas directly affect revenue, security, or data integrity:

- **Payment/Billing:**
  - `/app/api/stripe/**` - Payment processing
  - `/lib/services/subscriptionService.ts` - Subscription management

- **Authentication/Authorization:**
  - `/lib/api/withAuth.ts` - Auth middleware
  - `/lib/api/withAdminAuth.ts` - Admin auth

- **Data Integrity:**
  - `/lib/services/backupService.ts` - Backup creation/restoration
  - `/lib/saveLoad.ts` - Project save/load logic

### Tier 2: Core Features (80%+ coverage required)

Primary user-facing functionality:

- **Timeline Operations:**
  - `/lib/state/slices/*.ts` - Timeline state management
  - `/lib/timeline/*.ts` - Timeline utilities

- **Export Functionality:**
  - `/app/api/export/**` - Export queue and processing
  - `/lib/services/exportService.ts` - Export logic

- **Asset Management:**
  - `/app/api/assets/**` - Asset CRUD operations
  - `/lib/services/assetService.ts` - Asset business logic

### Tier 3: Supporting Features (70%+ coverage required)

All other production code:

- **UI Components:** `/components/**`
- **Utility Libraries:** `/lib/**`
- **API Routes:** `/app/api/**`
- **Custom Hooks:** `/lib/hooks/**`

---

## How to Identify Gaps

### 1. Generate Coverage Report

```bash
npm test -- --coverage --coverageReporters=html,text
```

This creates:
- **Console output** - Quick summary
- **coverage/lcov-report/index.html** - Detailed HTML report

### 2. Open HTML Report

```bash
open coverage/lcov-report/index.html
```

**Navigate to:**
- Red/yellow files - Low coverage (<70%)
- Uncovered lines - Specific lines to test

### 3. Identify Uncovered Lines

Look for:
- **Error paths** - Often skipped in happy-path testing
- **Edge cases** - Boundary conditions, empty arrays
- **Conditional branches** - All if/else paths
- **Early returns** - Guard clauses and validations

### 4. Find Low-Coverage Files

```bash
# List files with <70% coverage
npm test -- --coverage --coverageReporters=text | grep -E '^\s+[^\s]+\s+\|.*\|.*\|.*\|' | awk '{if($5 < 70) print $1, $5"%"}'
```

---

## Prioritization Framework

### Priority Matrix

Use this matrix to decide what to test next:

| Priority | Impact | Complexity | Coverage |
|----------|--------|------------|----------|
| **P0**   | High   | Any        | <50%     |
| **P1**   | High   | Any        | 50-70%   |
| **P2**   | Medium | Low        | <70%     |
| **P3**   | Low    | Any        | <70%     |

**Impact Levels:**
- **High:** Revenue, security, data integrity
- **Medium:** Core features, frequent user operations
- **Low:** Nice-to-have features, admin tools

**Complexity Levels:**
- **High:** Requires extensive mocking, integration testing
- **Low:** Simple unit tests, few dependencies

### Decision Tree

```
Is it revenue-critical or security-related?
├─ Yes → P0 (Test immediately)
└─ No  → Is coverage <50%?
          ├─ Yes → P1 (Test soon)
          └─ No  → Is it a core feature?
                   ├─ Yes → P2 (Test this sprint)
                   └─ No  → P3 (Backlog)
```

---

## Strategic Testing Approaches

### 1. Error Path Testing

Error paths are frequently uncovered. Focus on:

```typescript
// Example: API route error handling
describe('Error handling', () => {
  it('should return 400 for invalid input', async () => {
    const request = new NextRequest('http://localhost/api/test', {
      method: 'POST',
      body: JSON.stringify({ invalid: 'data' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should return 500 for database error', async () => {
    mockSupabase.from.mockReturnValue({
      insert: jest.fn().mockRejectedValue(new Error('DB error')),
    });

    const response = await POST(request);
    expect(response.status).toBe(500);
  });

  it('should return 401 for unauthenticated user', async () => {
    mockAuthenticatedUser(null); // No user

    const response = await GET(request);
    expect(response.status).toBe(401);
  });
});
```

### 2. Edge Case Testing

Test boundary conditions and edge cases:

```typescript
describe('Edge cases', () => {
  it('should handle empty array', () => {
    const result = processClips([]);
    expect(result).toEqual([]);
  });

  it('should handle single item', () => {
    const result = processClips([clip1]);
    expect(result).toHaveLength(1);
  });

  it('should handle maximum items', () => {
    const maxClips = Array(1000).fill(clip1);
    const result = processClips(maxClips);
    expect(result).toHaveLength(1000);
  });

  it('should handle null/undefined', () => {
    expect(() => processClips(null as any)).toThrow();
    expect(() => processClips(undefined as any)).toThrow();
  });
});
```

### 3. Branch Coverage

Test all conditional branches:

```typescript
// Function with branches
function calculateDiscount(user: User, total: number): number {
  if (user.tier === 'premium') {
    return total * 0.2; // 20% discount
  } else if (user.tier === 'plus') {
    return total * 0.1; // 10% discount
  } else {
    return 0; // No discount
  }
}

// Test all branches
describe('calculateDiscount', () => {
  it('should give 20% discount for premium users', () => {
    const user = { tier: 'premium' };
    expect(calculateDiscount(user, 100)).toBe(20);
  });

  it('should give 10% discount for plus users', () => {
    const user = { tier: 'plus' };
    expect(calculateDiscount(user, 100)).toBe(10);
  });

  it('should give no discount for free users', () => {
    const user = { tier: 'free' };
    expect(calculateDiscount(user, 100)).toBe(0);
  });
});
```

### 4. Integration Testing

Test how multiple units work together:

```typescript
describe('Save and load project integration', () => {
  it('should save project and reload with same data', async () => {
    // Arrange: Create project with clips
    const project = createTestProject({
      clips: [clip1, clip2],
      tracks: [track1],
    });

    // Act: Save project
    const saved = await saveProject(project);

    // Act: Load project
    const loaded = await loadProject(saved.id);

    // Assert: Data matches
    expect(loaded.clips).toEqual(project.clips);
    expect(loaded.tracks).toEqual(project.tracks);
  });
});
```

---

## Measuring Progress

### Daily Tracking

Run coverage daily and track progress:

```bash
# Quick summary
npm test -- --coverage --coverageReporters=text-summary

# Track specific file
npm test -- --coverage --collectCoverageFrom="lib/services/backupService.ts"
```

### Coverage Trends

Create a coverage tracking log:

```markdown
## Coverage Progress Log

| Date       | Overall | Services | Components | API Routes | Notes |
|------------|---------|----------|------------|------------|-------|
| 2025-10-20 | 60.5%   | 75.2%    | 55.1%      | 58.3%      | Baseline |
| 2025-10-22 | 62.1%   | 78.5%    | 57.2%      | 60.1%      | Added service tests |
| 2025-10-25 | 65.0%   | 83.3%    | 62.0%      | 64.0%      | Hook and component tests |
```

### CI Integration

Add coverage threshold to prevent regression:

```javascript
// jest.config.js
module.exports = {
  coverageThreshold: {
    global: {
      statements: 65,
      branches: 60,
      functions: 65,
      lines: 65,
    },
    './lib/services/': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
};
```

---

## Common Uncovered Patterns

### 1. Error Handlers

```typescript
// Often uncovered
try {
  await riskyOperation();
} catch (error) {
  // This catch block is often not tested!
  console.error('Operation failed:', error);
  throw new Error('Operation failed');
}

// Test it
it('should handle operation failure', async () => {
  mockRiskyOperation.mockRejectedValue(new Error('Failure'));
  await expect(functionUnderTest()).rejects.toThrow('Operation failed');
});
```

### 2. Default Parameters

```typescript
// Often uncovered
function process(options = { timeout: 5000, retries: 3 }) {
  // Default values not tested
}

// Test it
it('should use default options', () => {
  const result = process(); // No args
  expect(result.timeout).toBe(5000);
  expect(result.retries).toBe(3);
});
```

### 3. Early Returns

```typescript
// Often uncovered
function validate(data: Data): boolean {
  if (!data) return false; // Often not tested
  if (!data.id) return false; // Often not tested
  return true;
}

// Test all returns
it('should return false for null data', () => {
  expect(validate(null)).toBe(false);
});

it('should return false for missing id', () => {
  expect(validate({ id: null })).toBe(false);
});

it('should return true for valid data', () => {
  expect(validate({ id: '123' })).toBe(true);
});
```

### 4. Async Error Paths

```typescript
// Often uncovered
async function fetchWithRetry(url: string): Promise<Data> {
  try {
    return await fetch(url);
  } catch (error) {
    // Retry logic often not tested
    return await fetch(url);
  }
}

// Test it
it('should retry on failure', async () => {
  global.fetch
    .mockRejectedValueOnce(new Error('Network error'))
    .mockResolvedValueOnce({ data: 'success' });

  const result = await fetchWithRetry('/api/data');
  expect(global.fetch).toHaveBeenCalledTimes(2);
  expect(result).toEqual({ data: 'success' });
});
```

---

## Test Pattern Examples

### API Route Testing

```typescript
describe('POST /api/projects', () => {
  it('should create project with valid data', async () => {
    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({ name: 'Test Project' }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });

  it('should return 400 for missing name', async () => {
    const request = new NextRequest('http://localhost/api/projects', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
  });
});
```

### Component Testing

```typescript
describe('AssetCard', () => {
  it('should render asset name', () => {
    render(<AssetCard asset={mockAsset} />);
    expect(screen.getByText(mockAsset.name)).toBeInTheDocument();
  });

  it('should call onDelete when delete button clicked', async () => {
    const onDelete = jest.fn();
    render(<AssetCard asset={mockAsset} onDelete={onDelete} />);

    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onDelete).toHaveBeenCalledWith(mockAsset.id);
  });
});
```

### Hook Testing

```typescript
describe('useDebounce', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should debounce value updates', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: 'initial' } }
    );

    expect(result.current).toBe('initial');

    rerender({ value: 'updated' });
    expect(result.current).toBe('initial'); // Not updated yet

    jest.advanceTimersByTime(500);
    expect(result.current).toBe('updated'); // Now updated
  });
});
```

---

## Workflow: Adding Tests to Low-Coverage File

### Step-by-Step Process

1. **Identify the file**
   ```bash
   npm test -- --coverage --collectCoverageFrom="lib/myFile.ts"
   ```

2. **Open coverage report**
   ```bash
   open coverage/lcov-report/lib/myFile.ts.html
   ```

3. **Identify uncovered lines** (highlighted in red)

4. **Create test file**
   ```bash
   touch __tests__/lib/myFile.test.ts
   ```

5. **Write tests for uncovered lines**
   - Start with error paths
   - Add edge cases
   - Test all branches

6. **Verify coverage improved**
   ```bash
   npm test -- __tests__/lib/myFile.test.ts --coverage
   ```

7. **Repeat until target coverage reached** (70%+)

---

## Resources

- [Jest Coverage Documentation](https://jestjs.io/docs/cli#--coverageboolean)
- [Istanbul Coverage Reports](https://istanbul.js.org/)
- [TEST_ARCHITECTURE.md](/docs/TEST_ARCHITECTURE.md) - Test infrastructure
- [TEST_RELIABILITY_GUIDE.md](./TEST_RELIABILITY_GUIDE.md) - Writing stable tests
- [COMMON_TEST_PATTERNS.md](./COMMON_TEST_PATTERNS.md) - Reusable patterns
- [ISSUES.md](/ISSUES.md) - Current coverage status

---

**Goal: 70% overall coverage. Prioritize high-impact areas. Test error paths and edge cases. Track progress daily.**
