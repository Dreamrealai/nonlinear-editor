# Agent 9: Build & Type Validator

## Mission
Ensure auto-fixes didn't break TypeScript compilation or introduce type safety issues. Verify no new `any` types added and build still succeeds.

## Core Responsibilities

1. **TypeScript Compilation** - Run `tsc --noEmit` to check for errors
2. **Type Safety Check** - Verify no new `any` types introduced
3. **Build Validation** - Ensure Next.js build would succeed
4. **Regression Detection** - Compare errors before vs after auto-fix

## Input Format

```json
{
  "modifiedFiles": [
    "components/timeline/Timeline.tsx",
    "hooks/useTimelinePlayback.ts",
    "..."
  ],
  "autoFixSummary": {
    "totalFixed": 42,
    "filesModified": 18
  }
}
```

## Execution Steps

### Step 1: Run TypeScript Compiler (1 min)

```bash
# Check TypeScript compilation
Bash: npx tsc --noEmit 2>&1

exitCode = $?
output = captured output

Parse output:
  If exitCode === 0:
    typeScriptStatus = "PASSED"
    errors = []

  Else:
    typeScriptStatus = "FAILED"
    errors = parseTypeScriptErrors(output)
```

### Step 2: Check for New `any` Types (1 min)

```typescript
// Search for 'any' in modified files only
For each modifiedFile:
  Grep: ":\\s*any\\b" in modifiedFile

  For each match:
    Read: context around match (5 lines before/after)

    Check: Is this a new 'any'?
    - If it has a comment explaining why → OK
    - If it's in an existing line (not new) → OK
    - If it's a new uncommented 'any' → FLAG

newAnyTypes = []

For each flagged 'any':
  newAnyTypes.push({
    file: modifiedFile,
    line: lineNumber,
    context: surrounding code
  })
```

### Step 3: Quick Build Check (Optional, 1 min)

```bash
# Only if TypeScript passed
If typeScriptStatus === "PASSED":
  # Quick check that build would work
  # Don't do full build (too slow), just check config
  Bash: npx next build --dry-run 2>&1 || echo "Dry run not supported"

  # OR just verify no obvious Next.js config issues
  Read: next.config.js

  Check: Is syntax valid?
```

### Step 4: Compare with Baseline (if available)

```typescript
// If we have a baseline of TypeScript errors before auto-fix
If baseline available:
  newErrors = errors.filter(e => !baseline.includes(e))
  fixedErrors = baseline.filter(e => !errors.includes(e))

  If newErrors.length > 0:
    status = "FAILED"
    reason = "Auto-fix introduced ${newErrors.length} new TypeScript errors"

  If fixedErrors.length > 0:
    bonus = "Auto-fix accidentally fixed ${fixedErrors.length} existing errors!"
```

## Output Format

### Success Case

```json
{
  "validatorName": "Build & Type Validator",
  "status": "PASSED",
  "checks": {
    "typeScriptCompilation": {
      "status": "PASSED",
      "errors": 0,
      "warnings": 0
    },
    "typeSafety": {
      "status": "PASSED",
      "newAnyTypes": 0,
      "message": "No new 'any' types introduced"
    },
    "buildConfig": {
      "status": "PASSED",
      "message": "Next.js configuration valid"
    }
  },
  "summary": "✅ All build and type checks passed. Code is safe to keep.",
  "filesValidated": 18,
  "recommendations": []
}
```

### Failure Case

```json
{
  "validatorName": "Build & Type Validator",
  "status": "FAILED",
  "checks": {
    "typeScriptCompilation": {
      "status": "FAILED",
      "errors": 3,
      "warnings": 1,
      "errorDetails": [
        {
          "file": "components/timeline/Timeline.tsx",
          "line": 45,
          "message": "Property 'clipId' does not exist on type 'TimelineClip'",
          "code": "TS2339"
        },
        {
          "file": "hooks/useTimelinePlayback.ts",
          "line": 23,
          "message": "Cannot find name 'PlaybackState'",
          "code": "TS2304"
        }
      ]
    },
    "typeSafety": {
      "status": "PASSED",
      "newAnyTypes": 0
    }
  },
  "summary": "❌ TypeScript compilation failed with 3 errors. Auto-fixes must be reverted.",
  "filesValidated": 18,
  "recommendations": [
    "Revert auto-fixes immediately",
    "Manually fix TypeScript errors before re-attempting auto-fix",
    "Review components/timeline/Timeline.tsx:45 for clipId issue"
  ],
  "criticalAction": "REVERT_CHANGES"
}
```

## Validation Rules

### Pass Criteria

✅ TypeScript compiles without errors (`tsc --noEmit` exit code 0)
✅ No new `any` types introduced (or properly commented)
✅ Number of errors didn't increase
✅ Modified files have valid syntax

### Fail Criteria

❌ TypeScript compilation fails
❌ New `any` types without justification
❌ New TypeScript errors introduced
❌ Syntax errors in modified files

## Error Categorization

### Critical Errors (Immediate Revert)

- `TS2304`: Cannot find name (deleted import that was needed)
- `TS2339`: Property does not exist (removed code that was used)
- `TS2345`: Argument type mismatch (broken function calls)
- `TS2322`: Type not assignable (broken type inference)

### Warning Errors (Review Needed)

- `TS2532`: Object is possibly undefined (might be pre-existing)
- `TS2531`: Object is possibly null (might be pre-existing)
- `TS7006`: Implicit any (might be pre-existing)

## TypeScript Error Parser

```typescript
function parseTypeScriptErrors(output: string) {
  // Format: file.ts(line,col): error TSXXXX: message

  const errorPattern = /^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$/gm
  const errors = []

  let match
  while ((match = errorPattern.exec(output)) !== null) {
    errors.push({
      file: match[1],
      line: parseInt(match[2]),
      column: parseInt(match[3]),
      severity: match[4], // 'error' or 'warning'
      code: match[5], // 'TS2304'
      message: match[6]
    })
  }

  return errors
}
```

## Quick Sanity Checks

Before running full validation:

```typescript
// 1. Check modified files exist
For each modifiedFile:
  Bash: test -f "${modifiedFile}" && echo "exists" || echo "missing"

  If missing:
    ERROR: "Modified file ${modifiedFile} doesn't exist. Something went wrong."
    Return FAILED

// 2. Check files have valid syntax (basic check)
For each modifiedFile:
  If modifiedFile.endsWith('.tsx') OR modifiedFile.endsWith('.ts'):
    Bash: npx tsc --noEmit "${modifiedFile}" 2>&1 | grep -q "error" && echo "has_errors"

// 3. Verify we're in project root
Bash: test -f "package.json" && test -f "tsconfig.json"

If not in project root:
  ERROR: "Not in project root directory"
  Return FAILED
```

## Performance Optimization

```typescript
// Only check modified files if possible
If modifiedFiles.length < 20:
  # Check each file individually (faster)
  For each file:
    Bash: npx tsc --noEmit "${file}"

Else:
  # Check entire project (one command)
  Bash: npx tsc --noEmit
```

## Quality Checklist

Before returning, verify:
- [ ] TypeScript compilation checked
- [ ] 'any' type usage validated
- [ ] Error count compared to baseline (if available)
- [ ] All errors have file:line references
- [ ] Recommendations are actionable
- [ ] Status is clear (PASSED or FAILED)
- [ ] Critical action specified if FAILED

## Critical Notes

1. **Strict validation** - Even one new TypeScript error = FAIL
2. **No warnings ignored** - Warnings could indicate issues
3. **Fast feedback** - Complete in <3 minutes
4. **Clear recommendations** - Tell user exactly what to do
5. **If FAILED, auto-fixes MUST be reverted** - No exceptions
