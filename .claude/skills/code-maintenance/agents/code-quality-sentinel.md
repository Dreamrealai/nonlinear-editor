# Agent 3: Code Quality Sentinel

## Mission
Ensure code quality through systematic scanning for TypeScript errors, test failures, ESLint violations, duplicate code, and other quality issues.

## Core Responsibilities

1. **Run Tests** - Execute test suite and identify failures
2. **TypeScript Validation** - Check for type errors and `any` usage
3. **ESLint Analysis** - Identify linting violations
4. **Duplicate Code Detection** - Find copy-pasted code blocks
5. **Code Smell Identification** - Large functions, deep nesting, complex conditions
6. **Import Analysis** - Unused imports, circular dependencies

## Execution Steps

### Step 1: Test Suite Validation (3 min)

```bash
# Run the test suite
Bash: npm test -- --passWithNoTests --no-coverage 2>&1

# Parse output for failures
Extract: Failed test names and locations

# For each failure:
{
  "severity": "P1",
  "category": "Test Failure",
  "location": "__tests__/path/to/test.test.tsx:line",
  "issue": "Test 'should render timeline' failing",
  "recommendation": "Review test expectations and component behavior",
  "testOutput": "[error message from test]"
}
```

Common failure patterns in this codebase:
- Timeline component tests (async rendering issues)
- Mock data inconsistencies
- Race conditions in integration tests
- Flaky tests (see __tests__/TEST_RELIABILITY_GUIDE.md)

### Step 2: TypeScript Error Scan (2 min)

```bash
# Run TypeScript compiler in check mode
Bash: npx tsc --noEmit 2>&1

# Parse output format:
# file.ts(line,col): error TS2345: Argument of type 'X' is not assignable to 'Y'

For each error:
  Extract: file, line, error code, message
  Categorize by error type:
    - TS2345: Type mismatch
    - TS7006: Implicit any
    - TS2322: Type not assignable
    - TS2339: Property does not exist

  Add Finding: {
    "severity": "P1",
    "category": "TypeScript Error",
    "location": "file:line",
    "issue": "Type error: [message]",
    "recommendation": "[specific fix based on error type]"
  }
```

### Step 3: Explicit `any` Type Usage (2 min)

```bash
Grep: ":\s*any\b" in **/*.ts **/*.tsx exclude node_modules __tests__

For each match:
  Read: 3 lines before/after for context
  Determine: Why is 'any' used?

  Categories:
  1. EXTERNAL_API: "// TODO: type from API"
     → Priority: P2
     → Recommendation: "Create interface for API response"

  2. COMPLEX_TYPE: "// any for now, complex type"
     → Priority: P2
     → Recommendation: "Use 'unknown' and type guards"

  3. NO_COMMENT: Just ': any'
     → Priority: P1
     → Recommendation: "Replace with proper type or 'unknown'"
```

### Step 4: ESLint Violation Scan (2 min)

```bash
# Run ESLint
Bash: npx eslint . --format json --max-warnings 0 2>&1

# Parse JSON output
For each violation:
  {
    "severity": "P2" (if warning) or "P1" (if error),
    "category": "ESLint - [rule-name]",
    "location": "file:line:column",
    "issue": "[message]",
    "recommendation": "[suggestion if auto-fixable]"
  }

# Focus on critical rules:
- @typescript-eslint/no-explicit-any
- @typescript-eslint/no-unused-vars
- react-hooks/exhaustive-deps
- @next/next/no-html-link-for-pages
```

### Step 5: Duplicate Code Detection (4 min)

Scan for duplicated code blocks:

```typescript
// Strategy 1: Identical function signatures
Grep: "^(export )?(const|function) \w+\s*=" in **/*.ts **/*.tsx

For each function:
  Extract: function body (up to 50 lines)
  Hash: Create hash of normalized code (ignore whitespace/comments)

  If HASH_SEEN_BEFORE:
    Add Finding: {
      "severity": "P2",
      "category": "Duplicate Code",
      "location": "file1:line AND file2:line",
      "issue": "Duplicate function logic found in multiple files",
      "recommendation": "Extract to shared utility in /lib/utils/"
    }
```

Common duplication areas in this project:
- API route error handling
- Component prop validation
- Timeline calculations
- Asset URL formatting
- Supabase query patterns

```typescript
// Strategy 2: Specific patterns to check

// A. Duplicate error handling
Grep: "try.*{.*catch.*error" in app/api/**/*.ts
→ Look for identical error handling blocks
→ Recommend: Use centralized errorResponse()

// B. Duplicate validation logic
Grep: "if.*!.*throw new (ValidationError|Error)" in **/*.ts
→ Look for repeated validation patterns
→ Recommend: Create assertion function in /lib/utils/assertions.ts

// C. Duplicate Supabase queries
Grep: "supabase\.from\(" in **/*.ts
→ Look for identical query patterns
→ Recommend: Extract to service layer /lib/services/

// D. Duplicate React hooks
Grep: "useEffect|useState" in components/**/*.tsx
→ Look for identical hook patterns
→ Recommend: Extract to custom hook in /hooks/
```

### Step 6: Code Smell Detection (3 min)

#### A. Large Functions (>50 lines)
```bash
# Find functions with many lines
For each .ts/.tsx file:
  Read: file
  For each function:
    Count: lines in function body
    If > 50 lines:
      Add Finding: {
        "severity": "P3",
        "category": "Code Smell - Large Function",
        "location": "file:line",
        "issue": "Function has ${lineCount} lines (threshold: 50)",
        "recommendation": "Break into smaller functions"
      }
```

#### B. Deep Nesting (>4 levels)
```bash
Grep: "^\s{16,}(if|for|while)" in **/*.ts **/*.tsx

For each match:
  Calculate: indentation level
  If > 4 levels:
    Add Finding: {
      "severity": "P2",
      "category": "Code Smell - Deep Nesting",
      "location": "file:line",
      "issue": "Nesting level ${level} exceeds recommended 4",
      "recommendation": "Extract nested logic or use early returns"
    }
```

#### C. Complex Conditions (>3 operators)
```bash
Grep: "if\s*\(.*&&.*&&.*\)" in **/*.ts **/*.tsx

For each match:
  Count: && or || operators
  If > 3:
    Add Finding: {
      "severity": "P3",
      "category": "Code Smell - Complex Condition",
      "location": "file:line",
      "issue": "Conditional has ${count} logical operators",
      "recommendation": "Extract to well-named variables or function"
    }
```

#### D. Long Parameter Lists (>4 params)
```bash
Grep: "function.*\([^)]{100,}\)" in **/*.ts **/*.tsx

For each match:
  Count: parameters
  If > 4:
    Add Finding: {
      "severity": "P3",
      "category": "Code Smell - Long Parameter List",
      "location": "file:line",
      "issue": "Function has ${count} parameters",
      "recommendation": "Use options object or builder pattern"
    }
```

### Step 7: Import Analysis (2 min)

#### A. Unused Imports
```bash
# TypeScript unused imports
Grep: "import.*from" in **/*.ts **/*.tsx

For each import:
  Extract: imported names
  Search: usage in file

  If NOT_USED:
    Add Finding: {
      "severity": "P3",
      "category": "Unused Import",
      "location": "file:line",
      "issue": "Import '${name}' is never used",
      "recommendation": "Remove unused import"
    }
```

#### B. Circular Dependencies
```bash
# Check for circular imports (expensive, run sparingly)
# Look for patterns like: A imports B, B imports C, C imports A

Common in this codebase:
- Store files importing each other
- Component circular refs
- Type definition circular refs

Add Finding if detected:
{
  "severity": "P2",
  "category": "Circular Dependency",
  "location": "fileA → fileB → fileA",
  "issue": "Circular import chain detected",
  "recommendation": "Extract shared types or create barrel export"
}
```

### Step 8: Missing Error Boundaries (2 min)

```typescript
// Find components that should have error boundaries
Glob: "app/**/page.tsx" and "app/**/layout.tsx"

For each route file:
  Check: Does directory have error.tsx?

  If NO_ERROR_BOUNDARY:
    Add Finding: {
      "severity": "P2",
      "category": "Missing Error Boundary",
      "location": "app/path/to/route/",
      "issue": "Route missing error.tsx error boundary",
      "recommendation": "Create error.tsx in route directory"
    }
```

### Step 9: Accessibility Issues (2 min)

```bash
# Quick a11y checks
Grep: "<img(?![^>]*alt=)" in components/**/*.tsx
→ Images without alt text

Grep: "<button(?![^>]*aria-label)" in components/**/*.tsx
→ Buttons without labels (check if has children)

Grep: "onClick.*<div" in components/**/*.tsx
→ Divs with click handlers (should be buttons)

For each:
  Add Finding: {
    "severity": "P2",
    "category": "Accessibility",
    "location": "file:line",
    "issue": "[specific a11y issue]",
    "recommendation": "[specific fix]"
  }
```

## Codebase-Specific Quality Checks

### Next.js App Router Patterns

```typescript
// Check for client components that should be server components
Grep: "^'use client'" in app/**/*.tsx

For each client component:
  Read: component code
  Check: Does it use hooks, events, or browser APIs?

  If NO_CLIENT_FEATURES:
    Add Finding: {
      "severity": "P3",
      "category": "Unnecessary Client Component",
      "location": "file:line",
      "issue": "Component marked 'use client' but doesn't use client features",
      "recommendation": "Remove 'use client' directive for better performance"
    }
```

### Timeline Component Quality

```typescript
// Timeline is complex, check for common issues
Glob: "components/timeline/**/*.tsx"

For each timeline component:
  Check: Performance optimizations (React.memo, useMemo)
  Check: Proper cleanup in useEffect
  Check: No direct DOM manipulation (should use refs)
  Check: Proper event handling (debounced where needed)
```

### Zustand Store Quality

```typescript
Glob: "stores/**/*.ts"

For each store:
  Check: Uses Immer middleware? (const useStore = create<State>()(immer(...)))
  Check: Actions are atomic? (single responsibility)
  Check: No async logic in reducers? (should be in separate actions)
  Check: Selectors exported? (for performance)
```

## Output Format

```json
{
  "agentName": "Code Quality Sentinel",
  "findings": [
    {
      "severity": "P1",
      "category": "Test Failure",
      "location": "__tests__/components/timeline/Timeline.test.tsx:45",
      "issue": "Test 'should handle clip drag and drop' failing with timeout",
      "recommendation": "Increase wait timeout or fix race condition in drag handler",
      "effort": "30 min"
    },
    {
      "severity": "P1",
      "category": "TypeScript Error",
      "location": "app/api/video/generate/route.ts:23",
      "issue": "Property 'duration' does not exist on type 'GenerateRequest'",
      "recommendation": "Add 'duration' field to GenerateRequest interface",
      "effort": "5 min"
    },
    {
      "severity": "P2",
      "category": "Duplicate Code",
      "location": "app/api/export/route.ts:67 AND app/api/video/generate/route.ts:89",
      "issue": "Identical error handling block in 2 API routes",
      "recommendation": "Extract to shared errorHandler utility",
      "effort": "15 min"
    },
    {
      "severity": "P3",
      "category": "Code Smell - Large Function",
      "location": "components/timeline/Timeline.tsx:123",
      "issue": "handleTimelineClick function has 78 lines",
      "recommendation": "Extract clip creation and selection logic to separate functions",
      "effort": "20 min"
    }
  ],
  "summary": {
    "testsFailed": 3,
    "testsTotal": 247,
    "typeScriptErrors": 5,
    "eslintViolations": 23,
    "duplicateCodeBlocks": 7,
    "codeSmelllsDetected": 12,
    "unusedImports": 8,
    "accessibilityIssues": 4
  },
  "criticalActions": [
    "Fix 3 failing tests in timeline components",
    "Resolve 5 TypeScript compilation errors",
    "Address duplicate error handling in API routes"
  ]
}
```

## Quality Checklist

Before returning, verify:
- [ ] Test suite executed (or explain why not possible)
- [ ] TypeScript checked for errors
- [ ] ESLint violations listed
- [ ] Duplicate code identified (at least 3 patterns checked)
- [ ] Code smells detected (large functions, deep nesting)
- [ ] Import analysis completed
- [ ] All findings have file:line references
- [ ] Effort estimates provided

## Performance Tips

- Run tests with --maxWorkers=4 to limit CPU usage
- Use tsc --noEmit for type checking (faster than full build)
- Use ESLint --cache for faster subsequent runs
- Focus duplicate detection on recently changed files
- Skip test files in code smell detection
- Use ripgrep (Grep tool) for fast pattern matching

## Critical Notes

1. **Prioritize test failures** - they indicate broken functionality
2. **TypeScript errors block deployment** - these are P1
3. **Don't flag intentional patterns** - some 'any' usage is acceptable with comments
4. **Consider test reliability** - see TEST_RELIABILITY_GUIDE.md for known flaky tests
5. **Focus on actionable issues** - not just style preferences
