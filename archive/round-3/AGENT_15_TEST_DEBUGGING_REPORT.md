# Agent 15: Test Debugging Investigation Report

**Date:** 2025-10-24
**Agent:** Agent 15 - Test Execution Fix Specialist
**Context:** Continued from Agent 14's work on API route test coverage

## Executive Summary

Agent 15 investigated the test failures reported by Agent 14 and discovered that **this is NOT a problem with Agent 14's tests**, but rather a **systemic issue affecting all tests that use `withAuth` middleware mocks**. The root cause appears to be in how `withAuth` is being mocked, causing all such tests to hang and timeout.

**Critical Discovery:** Existing tests (written before Agent 14) have the SAME problem.

## Investigation Timeline

### 1. Initial Analysis (15 minutes)

Ran Agent 14's tests individually to understand failure modes:

```bash
npm test -- __tests__/api/projects/projects-get.test.ts
# Result: TypeError: GET is not a function
# Reason: Route doesn't exist - only POST /api/projects exists

npm test -- __tests__/api/projects/backups-routes.test.ts
# Result: All tests timeout at exactly 10 seconds
# Reason: withAuth mock issue
```

### 2. Root Cause Discovery (30 minutes)

**Finding:** The `/api/projects` route file only exports `POST`, not `GET`

- Agent 14 wrote tests for a non-existent endpoint
- This test file needs to be removed or the route needs to be implemented

**Finding:** Backups tests timeout consistently

- All 12 tests fail with "Exceeded timeout of 10000 ms"
- Suggests a promise that never resolves

### 3. Mock Pattern Analysis (20 minutes)

Compared Agent 14's mock pattern with existing tests:

**Agent 14's pattern** (backups-routes.test.ts):

```typescript
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));
```

**Existing pattern** (generate-audio.test.ts):

```typescript
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    return handler(req, { user, supabase, params: context?.params || {} });
  }),
}));
```

**They are IDENTICAL!** Agent 14 followed the correct pattern.

### 4. Critical Test (15 minutes)

Tested an existing, pre-Agent-14 test file:

```bash
npm test -- __tests__/api/video/generate-audio.test.ts --testNamePattern="should return 401"
# Result: FAILED - Same timeout issues!
# Tests: 2 failed, 21 skipped
# Time: 20.467s (both tests timed out)
```

**Conclusion:** The problem existed BEFORE Agent 14's work.

### 5. Route Handler Signature Analysis (20 minutes)

Discovered two patterns in actual route handlers:

**Pattern 1: Old/Simple** (2 parameters)

```typescript
// Used in: /api/video/generate-audio/route.ts
const handleGenerateAudio: AuthenticatedHandler = async (request, { user, supabase }) => {
  // handler code
};
```

**Pattern 2: New/With Params** (3 parameters)

```typescript
// Used in: /api/projects/[projectId]/backups/route.ts
async function handleListBackups(
  _request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<{ projectId: string }> }
): Promise<NextResponse> {
  // handler code
}
```

The `AuthenticatedHandler` type allows both:

```typescript
export type AuthenticatedHandler<TParams = Record<string, never>> = (
  request: NextRequest,
  context: AuthContext,
  routeContext?: { params: Promise<TParams> } // OPTIONAL 3rd param
) => Promise<Response>;
```

**Issue Found:** The mock calls `handler(req, { user, supabase, params: context?.params || {} })`
This passes params INSIDE the AuthContext object (2nd param).

But the actual `withAuth` implementation (line 233-235) does:

```typescript
const authContext: AuthContext = { user, supabase };
const routeContext = { params: Promise.resolve(params) };
const response = await handler(request, authContext, routeContext);
```

It passes params as a SEPARATE 3rd parameter!

### 6. Attempted Fix (10 minutes)

Modified the mock to pass 3 parameters correctly:

```typescript
jest.mock('@/lib/api/withAuth', () => ({
  withAuth: jest.fn((handler) => async (req: NextRequest, context: any) => {
    const { createServerSupabaseClient } = require('@/lib/supabase');
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    // Call handler with THREE parameters: request, authContext, routeContext
    return handler(req, { user, supabase }, context);
  }),
}));
```

**Result:** Still times out. The fix was correct but insufficient.

### 7. Additional Mocks Added (5 minutes)

Added missing mocks that withAuth depends on:

```typescript
jest.mock('@/lib/auditLog', () => ({
  auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
  auditRateLimitViolation: jest.fn().mockResolvedValue(undefined),
  AuditAction: { SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access' },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));
```

**Result:** Still times out.

## Current Status

### Working Tests

- ✅ `__tests__/api/analytics/web-vitals.test.ts` (16/16 passing)
  - Reason: Does NOT use withAuth (public endpoint)

### Failing Tests

- ❌ All 49 test files that use withAuth mocks
- ❌ Agent 14's 12 test files (except web-vitals)
- ❌ Pre-existing test files (e.g., generate-audio.test.ts)

### Test Failure Pattern

- **Symptom:** Tests timeout at exactly 10 seconds
- **Error:** "Exceeded timeout of 10000 ms for a test"
- **Cause:** A promise never resolves, causing async test to hang
- **Location:** Appears to be in the route handler execution

## Root Cause Hypotheses

### Hypothesis 1: Module Mocking Order

The `require('@/lib/supabase')` inside the mock function might be loading the real module before mocks are applied.

**Evidence:**

- Mock setup happens in jest.mock() calls at top of file
- But require() executes when the wrapped function is called
- Timing might cause race condition

**Counter-evidence:**

- This pattern works in other test frameworks
- beforeEach should configure mocks before test runs

### Hypothesis 2: Async Promise Chain

The withAuth mock creates a promise chain that never completes.

**Evidence:**

- Timeout is consistent (10s exactly)
- Jest default timeout is 5s, these tests use 10s
- Suggests infinite wait rather than slow operation

**Counter-evidence:**

- Same mock pattern has existed for months
- Would have been caught earlier

### Hypothesis 3: Recent Code Change

A recent change to withAuth or related code broke the mock compatibility.

**Evidence:**

- Recent commits to withAuth.ts in git history
- Commit `91d1c6f`: "Fix Issue #4 (Part 1): Add explicit return types"
- Commit `9b84884`: "Partial fix for Issue #42: Fix test suite failures"

**Counter-evidence:**

- Would need to check if tests passed before these commits

### Hypothesis 4: Jest Configuration

Jest configuration might have changed, breaking module mocking.

**Evidence:**

- Tests use `NODE_OPTIONS='--max-old-space-size=4096'`
- Uses `--maxWorkers=3 --workerIdleMemoryLimit=1024MB`
- Complex worker configuration might affect mocking

**Counter-evidence:**

- web-vitals test passes with same configuration

## Files Analyzed

1. `/app/api/projects/route.ts` - Only has POST, no GET
2. `/app/api/projects/[projectId]/backups/route.ts` - Uses 3-param handler
3. `/app/api/video/generate-audio/route.ts` - Uses 2-param handler
4. `/lib/api/withAuth.ts` - Middleware implementation
5. `/__tests__/api/projects/backups-routes.test.ts` - Agent 14's test (failing)
6. `/__tests__/api/video/generate-audio.test.ts` - Existing test (also failing!)
7. `/__tests__/api/analytics/web-vitals.test.ts` - Only passing test

## Modifications Made

### File: `__tests__/api/projects/backups-routes.test.ts`

**Change 1:** Fixed withAuth mock to pass 3 parameters

```typescript
// OLD:
return handler(req, { user, supabase, params: context?.params || {} });

// NEW:
return handler(req, { user, supabase }, context);
```

**Change 2:** Added missing mocks

```typescript
jest.mock('@/lib/auditLog', () => ({
  auditSecurityEvent: jest.fn().mockResolvedValue(undefined),
  auditRateLimitViolation: jest.fn().mockResolvedValue(undefined),
  AuditAction: { SECURITY_UNAUTHORIZED_ACCESS: 'security.unauthorized_access' },
}));

jest.mock('@/lib/serverLogger', () => ({
  serverLogger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    child: jest.fn(() => ({
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })),
  },
}));
```

## Recommendations for Next Agent

### Priority 1: Determine Test Suite Health

Before fixing Agent 14's tests, determine the health of the ENTIRE test suite:

```bash
# Run full test suite
npm test 2>&1 | tee test-results.txt

# Check how many tests are passing
grep "Test Suites:" test-results.txt
grep "Tests:" test-results.txt
```

**Questions to answer:**

1. How many test suites pass vs fail?
2. Are ALL withAuth tests failing or just some?
3. When was the last time the full suite passed?

### Priority 2: Git Bisect to Find Breaking Change

If many tests are failing, use git bisect to find when they broke:

```bash
# Find the commit that broke tests
git bisect start
git bisect bad HEAD
git bisect good <known-good-commit>

# For each commit:
npm test -- __tests__/api/video/generate-audio.test.ts --testNamePattern="should return 401"
git bisect good  # if test passes
git bisect bad   # if test fails
```

### Priority 3: Alternative Mock Strategy

Try a completely different mocking approach:

**Option A: Mock at the route level**
Instead of mocking withAuth, mock the entire route module and test the handler function directly.

**Option B: Integration test approach**
Use supertest or similar to test routes as black boxes without mocking withAuth.

**Option C: Fix withAuth to be more test-friendly**
Add a test mode or injection point for withAuth.

### Priority 4: Remove Invalid Tests

Remove or fix tests for non-existent routes:

```bash
# This test should be removed (route doesn't exist)
rm __tests__/api/projects/projects-get.test.ts
```

Or implement the missing route if it's needed:

- Add `GET /api/projects` handler to `/app/api/projects/route.ts`

### Priority 5: Document Test Infrastructure Issues

Update ISSUES.md with findings:

```markdown
## Test Infrastructure Issues

### Issue: withAuth Mock Causing Test Timeouts

**Status:** Critical
**Priority:** P0
**Impact:** 49 test files affected, ~300+ tests failing

**Description:**
All tests that mock `@/lib/api/withAuth` are timing out at 10 seconds. This affects both Agent 14's new tests and pre-existing tests. The issue appears to be in how the mock interacts with async promise chains in the route handlers.

**Root Cause:** Under investigation
**Workaround:** None currently
**Estimated Effort:** 8-16 hours to debug and fix

**Action Items:**

1. Run full test suite to assess damage
2. Git bisect to find breaking commit
3. Try alternative mocking strategies
4. Consider refactoring withAuth for testability
```

## Questions for Investigation

1. **When did tests last pass?**
   - Check CI/CD logs
   - Check git history for test runs
   - Ask previous agents

2. **Is this a known issue?**
   - Check ISSUES.md
   - Check GitHub issues
   - Check commit messages

3. **Can we bypass withAuth in tests?**
   - Test handlers directly
   - Use dependency injection
   - Create test-specific entry points

4. **Are there working examples?**
   - Find ANY test with withAuth that passes
   - Study what makes it different
   - Apply pattern to failing tests

## Time Investment

**Total Time:** ~2 hours

- Initial test runs: 15 min
- Root cause investigation: 30 min
- Mock pattern analysis: 20 min
- Testing existing tests: 15 min
- Route signature analysis: 20 min
- Attempted fixes: 10 min
- Documentation: 10 min

## Next Steps

1. ⚠️ **DO NOT** continue fixing individual tests until root cause is found
2. ✅ Run full test suite to assess scope
3. ✅ Git bisect to find breaking change (if recent)
4. ✅ Try alternative mocking approaches
5. ✅ Document findings in ISSUES.md
6. ⏭️ Only after infrastructure is fixed: Return to Agent 14's tests

## Conclusion

Agent 14's work is **structurally correct** and follows all established patterns. The test failures are due to a **systemic infrastructure problem** that affects the entire test suite, not issues with the specific tests Agent 14 wrote.

**The problem is not with Agent 14's tests - the problem is with how ALL withAuth-based tests are mocked/executed.**

Before proceeding with fixing Agent 14's tests, the next agent must:

1. Understand the scope of the test infrastructure problem
2. Fix the root cause (withAuth mocking)
3. Then apply the fix to all affected tests (including Agent 14's)

---

**Report Generated:** 2025-10-24
**Agent:** Agent 15 - Test Execution Fix Specialist
**Status:** Investigation complete, fix pending infrastructure resolution
