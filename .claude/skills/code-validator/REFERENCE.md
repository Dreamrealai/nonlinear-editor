# Code Validator Skill - Reference Guide

## Quick Command Reference

### Validation Commands

```bash
# Full validation suite
npm run build && npm run lint && npm test

# TypeScript check only
npx tsc --noEmit

# Find 'any' types
grep -rn ": any" --include="*.ts" --include="*.tsx" app/ components/ lib/ | grep -v node_modules

# ESLint check
npm run lint

# Format check
npm run format:check

# Vercel deployment
vercel --yes --prod

# Check deployment status
vercel ls --yes | head -10
```

### Git Commands for Validation

```bash
# Check what changed
git status
git diff --stat

# Check recent commits
git log --oneline -5

# Show files changed in last commit
git show --name-only HEAD

# Check for merge conflicts
git diff --check
```

## Common Issues and Fixes

### Issue 1: TypeScript `any` Types

**Detection:**

```bash
grep -rn ": any" app/ components/ lib/ --include="*.ts" --include="*.tsx"
```

**Fix:**
Replace `any` with proper types:

```typescript
// ❌ Bad
function process(data: any) {}

// ✅ Good
function process(data: unknown) {
  // Use type guards
  if (typeof data === 'string') {
  }
}

// ✅ Better - branded type
type UserId = string & { readonly __brand: 'UserId' };
function process(userId: UserId) {}
```

### Issue 2: Missing withAuth Middleware

**Detection:**

```bash
grep -rn "export const (GET|POST|PUT|DELETE|PATCH) =" app/api/ | grep -v "withAuth"
```

**Fix:**

```typescript
// ❌ Bad
export async function POST(req: NextRequest) {}

// ✅ Good
export const POST = withAuth(
  async (req, { user, supabase }) => {
    // handler logic
  },
  {
    route: '/api/example',
    rateLimit: RATE_LIMITS.tier2_resource_creation,
  }
);
```

### Issue 3: Duplicate Code

**Detection:**
Look for similar patterns:

```bash
# Find duplicate function names
find . -name "*.ts" -o -name "*.tsx" | xargs grep -h "function \w\+" | sort | uniq -c | sort -rn

# Find duplicate helper patterns
grep -rn "export const.*=.*=>" lib/ --include="*.ts" | cut -d: -f2 | sort | uniq -c | sort -rn
```

**Fix:**
Extract to shared utilities:

```typescript
// ❌ Bad - duplicate in multiple files
const formatDate = (date: Date) => date.toISOString();

// ✅ Good - centralized in lib/utils/
// lib/utils/dateUtils.ts
export const formatDate = (date: Date): string => date.toISOString();
```

### Issue 4: Missing Input Validation

**Detection:**

```bash
grep -rn "req.json()" app/api/ | grep -v "validate"
```

**Fix:**

```typescript
// ❌ Bad
const body = await req.json();
const { email } = body;

// ✅ Good
const body = await req.json();
validateEmail(body.email, 'email', { required: true });
const email = body.email;
```

### Issue 5: Vercel Build Errors

**Common causes:**

1. TypeScript errors
2. Missing dependencies
3. Environment variables
4. Build timeout

**Fix process:**

```bash
# 1. Check build locally first
npm run build

# 2. Check for TypeScript errors
npx tsc --noEmit

# 3. Check dependencies
npm ci

# 4. If build succeeds locally, push and monitor Vercel
git push
vercel ls --yes

# 5. Check logs if build fails
vercel logs <deployment-url>
```

## Validation Checklist Templates

### API Route Checklist

- [ ] Uses `withAuth` middleware
- [ ] Has proper AuthOptions object with `route` and `rateLimit`
- [ ] Validates all input parameters
- [ ] Uses service layer for business logic
- [ ] Handles errors with custom error classes
- [ ] Returns standardized responses
- [ ] Has appropriate rate limiting tier
- [ ] Includes logging for errors
- [ ] TypeScript strict mode compliant

### React Component Checklist

- [ ] Uses `'use client'` directive if needed (at top of file)
- [ ] Props interface defined
- [ ] No `any` types used
- [ ] ForwardRef used if component accepts ref
- [ ] Proper hook ordering (context → state → refs → effects → custom)
- [ ] Memoization for expensive computations
- [ ] Accessibility attributes (aria-labels, roles)
- [ ] No inline styles (use Tailwind classes)
- [ ] Error boundaries for error handling

### Service Layer Checklist

- [ ] Located in `/lib/services/`
- [ ] Dependencies passed via constructor
- [ ] Returns typed responses
- [ ] Error tracking implemented
- [ ] Caching implemented where appropriate
- [ ] Cache invalidation on mutations
- [ ] Handles edge cases
- [ ] Has corresponding tests

### Test Checklist

- [ ] Follows AAA pattern (Arrange-Act-Assert)
- [ ] Descriptive test names
- [ ] Tests both success and error cases
- [ ] Covers edge cases
- [ ] Uses helper functions for setup
- [ ] No hard-coded values (use constants)
- [ ] Proper cleanup in afterEach/afterAll
- [ ] Async tests properly await

## Automation Scripts

### Script: validate-code.sh

```bash
#!/bin/bash
# Comprehensive code validation script

set -e

echo "🔍 Starting code validation..."

# 1. TypeScript check
echo "\n📝 Checking TypeScript..."
npx tsc --noEmit || exit 1

# 2. Find 'any' types
echo "\n🔎 Checking for 'any' types..."
ANY_COUNT=$(grep -rn ": any" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 0 ]; then
  echo "⚠️  Found $ANY_COUNT instances of 'any' type"
  grep -rn ": any" app/ components/ lib/ --include="*.ts" --include="*.tsx" 2>/dev/null | head -10
fi

# 3. ESLint
echo "\n🔧 Running ESLint..."
npm run lint || exit 1

# 4. Format check
echo "\n💅 Checking code formatting..."
npm run format:check || exit 1

# 5. Build
echo "\n🏗️  Building project..."
npm run build || exit 1

echo "\n✅ All validation checks passed!"
```

### Script: check-duplicates.sh

```bash
#!/bin/bash
# Check for duplicate code patterns

echo "🔍 Checking for duplicate code..."

# Find duplicate function names
echo "\n📊 Duplicate function names:"
find . -path ./node_modules -prune -o -name "*.ts" -o -name "*.tsx" | \
  xargs grep -h "^\s*\(export \)\?function \w\+" 2>/dev/null | \
  sed 's/export //' | sed 's/function //' | cut -d'(' -f1 | \
  sort | uniq -c | sort -rn | awk '$1 > 1'

# Find duplicate type definitions
echo "\n📊 Duplicate type definitions:"
find . -path ./node_modules -prune -o -name "*.ts" -o -name "*.tsx" | \
  xargs grep -h "^\s*\(export \)\?type \w\+" 2>/dev/null | \
  sed 's/export //' | sed 's/type //' | cut -d'=' -f1 | \
  sort | uniq -c | sort -rn | awk '$1 > 1'

echo "\n✅ Duplication check complete"
```

## Integration Examples

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Run validation before commit
echo "🔍 Running pre-commit validation..."

# Quick checks only (skip build for speed)
npx tsc --noEmit
npm run lint

echo "✅ Pre-commit checks passed"
```

### GitHub Actions Workflow

```yaml
name: Code Validation

on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm run build
      - run: npm test
```

## Performance Optimization

### Parallel Validation

Run checks in parallel for faster validation:

```bash
# Run in parallel using &
(npx tsc --noEmit) &
(npm run lint) &
(npm test -- --maxWorkers=4) &

# Wait for all to complete
wait

echo "All parallel checks completed"
```

### Incremental Validation

Validate only changed files:

```bash
# Get list of changed files
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD | grep -E '\.(ts|tsx)$')

# Lint only changed files
echo "$CHANGED_FILES" | xargs npx eslint

# Type check only changed files (requires project references)
echo "$CHANGED_FILES" | xargs npx tsc --noEmit
```

## Troubleshooting

### Issue: Validation takes too long

**Solution:**

- Use incremental validation
- Run checks in parallel
- Skip build check for quick iterations
- Use `--no-coverage` flag for tests

### Issue: False positives in duplication check

**Solution:**

- Review context of duplicates
- Some duplication is acceptable (constants, type guards)
- Focus on business logic duplication
- Use allowlist for known acceptable duplicates

### Issue: Vercel build succeeds locally but fails remotely

**Solution:**

- Check environment variables
- Verify all dependencies in package.json
- Check for platform-specific code
- Review build logs on Vercel dashboard

## Best Practices

1. **Run validation frequently** - After every significant change
2. **Fix issues immediately** - Don't accumulate technical debt
3. **Automate where possible** - Use pre-commit hooks
4. **Monitor build times** - Optimize if builds slow down
5. **Keep validation fast** - Quick feedback loop is crucial
6. **Document exceptions** - Note when rules can be bent

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [ESLint Rules](https://eslint.org/docs/latest/rules/)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- Repository docs: `/docs/CODING_BEST_PRACTICES.md`
