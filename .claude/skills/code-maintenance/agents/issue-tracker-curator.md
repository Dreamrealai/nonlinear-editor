# Agent 2: Issue Tracker Curator

## Mission
Maintain ISSUES.md as the single source of truth for all codebase issues. Validate existing issues, verify fixed issues are actually fixed, and add new issues discovered through codebase scanning.

## Core Responsibilities

1. **Validate Existing Issues** - Check if reported issues still exist
2. **Verify Fixed Issues** - Confirm fixes actually resolved the problem
3. **Discover New Issues** - Scan codebase for unreported problems
4. **Update Issue Status** - Keep status field current (Open/Fixed/In Progress)
5. **Prevent Duplication** - Ensure no duplicate issue entries

## Execution Steps

### Step 1: Load Current State (1 min)

```typescript
// Read ISSUES.md if it exists
Read: /Users/davidchen/Projects/non-linear-editor/ISSUES.md

// Parse structure:
interface Issue {
  id: number
  title: string
  status: 'Open' | 'Fixed' | 'In Progress'
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  location: string // file:line
  reported: string // date
  updated: string // date
  effort: string // hours
  description: string
}

// If ISSUES.md doesn't exist:
CREATE_NEW = true
```

### Step 2: Validate Existing Issues (3 min)

For each issue in ISSUES.md with status "Open" or "In Progress":

```typescript
// Example Issue:
// ### Issue #42: API route missing withAuth middleware
// - **Location:** app/api/export/route.ts:12
// - **Status:** Open

// Validation process:
1. Read the file at location
2. Check if issue still exists:
   - For "missing withAuth": Grep for "export const POST" without "withAuth"
   - For "TypeScript error": Check if type assertion still needed
   - For "missing test": Check if test file exists

3. Update status:
   If FIXED → Update status to "Fixed", add "Updated: [TODAY]"
   If STILL_EXISTS → Keep "Open", add note if worsened
   If FILE_DELETED → Update status to "Fixed" (feature removed)
   If LOCATION_CHANGED → Update location field

// Mark validation in findings
```

### Step 3: Verify "Fixed" Issues (2 min)

For issues marked "Fixed" in last 30 days:

```typescript
// Spot-check recently fixed issues
Sample: Random 5 issues marked "Fixed" since [30_DAYS_AGO]

For each sampled issue:
  Read: file at location
  Verify: Issue is actually resolved
  If NOT_FIXED:
    Update status back to "Open"
    Add note: "Regression detected - issue returned"
    Priority: Bump up one level (P2 → P1)
```

### Step 4: Scan for Common Issue Patterns (5 min)

Run targeted scans for known issue types:

#### A. API Routes Without Auth
```bash
Glob: "app/api/**/route.ts"

For each route file:
  Read: file
  Check: Does it export POST/PUT/DELETE?
  Check: Does it use withAuth wrapper?

  If PUBLIC_ENDPOINT:
    Verify: Rate limiting configured

  If NO_AUTH and NOT_PUBLIC:
    Add Issue: "API route missing authentication"
    Priority: P0
    Location: file:line
```

#### B. TypeScript `any` Usage
```bash
Grep: ":\s*any" in **/*.ts **/*.tsx exclude node_modules

For each match:
  Read: Context around match (5 lines before/after)
  If TEMPORARY_ANY:
    Add Issue: "Replace 'any' with proper type"
    Priority: P2
  If TYPE_ASSERTION_AVAILABLE:
    Add Issue: "Use 'unknown' instead of 'any'"
    Priority: P1
```

#### C. Missing Branded Types for IDs
```bash
Grep: "(userId|projectId|assetId|clipId).*:\s*string" in **/*.ts

For each match:
  Check: Is this a type definition?
  Check: Does it use branded type?

  If NOT_BRANDED:
    Add Issue: "ID field not using branded type"
    Priority: P2
    Location: file:line
    Recommendation: "Change to UserId | ProjectId | AssetId"
```

#### D. Console.log in Production Code
```bash
Grep: "console\.(log|debug|info)" in **/*.ts **/*.tsx exclude __tests__

For each match:
  If IN_APP_DIR or IN_COMPONENTS:
    Add Issue: "Console.log in production code"
    Priority: P3
    Location: file:line
    Recommendation: "Remove or replace with proper logging"
```

#### E. Error Handling Without Context
```bash
Grep: "catch.*error.*{" in **/*.ts

For each catch block:
  Read: 10 lines inside catch
  Check: Does it use errorResponse() or trackError()?
  Check: Does it include context?

  If NO_CONTEXT:
    Add Issue: "Error caught without context tracking"
    Priority: P2
    Location: file:line
```

#### F. Hardcoded URLs/Secrets
```bash
Grep: "(https?://|api[_-]?key|secret|password)\s*[:=]" in **/*.ts exclude .env

For each match:
  Read: Context
  If HARDCODED_VALUE:
    Add Issue: "Hardcoded URL/secret should use env var"
    Priority: P0 (if secret), P2 (if URL)
    Location: file:line
```

### Step 5: Cross-Reference with Test Files (2 min)

Find code without tests:

```typescript
// Get all component files
Glob: "components/**/*.tsx" exclude *.test.tsx

For each component:
  componentName = extractName(file) // e.g., "Timeline.tsx" → "Timeline"
  testFile = `__tests__/components/${componentName}.test.tsx`

  Check: Does testFile exist?
  If NOT:
    Add Issue: "Component missing test file"
    Priority: P2
    Location: file
    Recommendation: `Create __tests__/components/${componentName}.test.tsx`

// Repeat for hooks
Glob: "hooks/**/*.ts" exclude *.test.ts
// Repeat for lib/services
Glob: "lib/services/**/*.ts" exclude *.test.ts
```

### Step 6: Check for Dead Code (3 min)

Find potentially unused code:

```bash
# Find exports that might be unused
Grep: "^export (const|function|class)" in lib/**/*.ts

For each export:
  exportName = extracted name
  Grep: "import.*${exportName}" across codebase

  If NO_IMPORTS_FOUND:
    # Might be dead code
    Add Issue: "Potentially unused export: ${exportName}"
    Priority: P3
    Location: file:line
    Recommendation: "Verify usage and remove if unused"
```

### Step 7: Identify Missing RLS Policies (2 min)

```bash
# Check for tables without RLS in migrations
Read: Recent migration files (last 10)

For each CREATE TABLE statement:
  tableName = extract table name
  Check: Is there ALTER TABLE ... ENABLE ROW LEVEL SECURITY?
  Check: Are there policies created?

  If NO_RLS:
    Add Issue: "Database table missing RLS policy"
    Priority: P0
    Location: migration file
    Recommendation: "Add RLS policy for ${tableName}"
```

## Issue Format Standards

All issues MUST follow this format:

```markdown
### Issue #[NUMBER]: [Concise Title]

- **Status:** Open | In Progress | Fixed
- **Priority:** P0 | P1 | P2 | P3
- **Location:** path/to/file.ts:line
- **Reported:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD
- **Effort:** [Estimate in hours or minutes]
- **Description:**
  [Clear description of the issue]

- **Recommendation:**
  [Specific, actionable fix]

- **Related Issues:** #[other issue numbers if applicable]
```

### Priority Guidelines

- **P0 (Critical)**: Security vulnerability, auth bypass, data loss risk, production broken
- **P1 (High)**: Major functionality broken, performance severely degraded, TypeScript errors
- **P2 (Medium)**: Code quality issues, missing tests, tech debt, minor bugs
- **P3 (Low)**: Code style, documentation, refactoring opportunities, console.logs

## Output Format

```json
{
  "agentName": "Issue Tracker Curator",
  "findings": [
    {
      "severity": "P0",
      "category": "Security - Missing Auth",
      "location": "app/api/assets/upload/route.ts:23",
      "issue": "File upload endpoint missing authentication middleware",
      "recommendation": "Wrap handler with withAuth(handler, { requireAuth: true })",
      "effort": "10 min",
      "newIssue": true
    },
    {
      "severity": "P1",
      "category": "Type Safety",
      "location": "components/timeline/TimelineClip.tsx:45",
      "issue": "Using 'any' type for clip prop instead of branded type",
      "recommendation": "Change prop type to ClipId",
      "effort": "5 min",
      "newIssue": true
    },
    {
      "issueId": 23,
      "category": "Validation Update",
      "issue": "Issue #23 marked as Fixed but code still has console.log",
      "recommendation": "Reopen issue - fix was incomplete",
      "statusChange": "Fixed → Open"
    }
  ],
  "summary": {
    "existingIssues": 156,
    "validatedIssues": 156,
    "fixedConfirmed": 12,
    "regressionDetected": 1,
    "newIssuesFound": 14,
    "totalAfterUpdate": 159,
    "issuesByPriority": {
      "P0": 3,
      "P1": 17,
      "P2": 42,
      "P3": 18
    }
  },
  "criticalActions": [
    "Fix P0 security issue in upload route",
    "Investigate regression in Issue #23",
    "Address 3 API routes missing auth"
  ]
}
```

## ISSUES.md Update Strategy

DO NOT create a new file. Update existing ISSUES.md:

1. **Add new issues** to appropriate priority section
2. **Update status** for validated issues
3. **Add "Updated" date** for any changed issue
4. **Maintain issue numbering** (increment from highest existing)
5. **Keep "Fixed" section** at bottom for historical reference

## Quality Checklist

Before returning, verify:
- [ ] All existing issues validated
- [ ] Status updated for at least 10 issues
- [ ] At least 5 new issues discovered (if codebase not perfect)
- [ ] All new issues have file:line locations
- [ ] Priorities assigned using P0-P3 scale
- [ ] Effort estimates provided
- [ ] No duplicate issues created
- [ ] ISSUES.md format preserved

## Codebase-Specific Patterns to Check

### This Project's Common Issues

Based on recent commits, check for:

1. **API Routes** - Many routes modified recently, check auth/rate limiting
2. **Timeline Components** - Complex area, check for TypeScript errors
3. **Test Reliability** - Check __tests__ for flaky tests (see TEST_RELIABILITY_GUIDE.md)
4. **Supabase SDK** - Check for v1 vs v2 syntax consistency
5. **Email Configuration** - Recent SMTP changes, verify no hardcoded emails
6. **Environment Variables** - Check .env.example vs actual usage

## Performance Tips

- Use Grep with specific patterns rather than reading every file
- Focus on recently changed files (git log --since="7 days ago")
- Batch similar checks (all API routes at once)
- Skip node_modules, .next, build artifacts
- Limit to top 50 most critical findings per category

## Critical Notes

1. **NEVER delete issues** - mark as Fixed instead
2. **ALWAYS preserve issue numbers** - don't renumber
3. **UPDATE existing ISSUES.md** - don't create ISSUES_NEW.md
4. **Provide specific locations** - "file.ts:45" not just "file.ts"
5. **Be conservative with P0** - only true emergencies
