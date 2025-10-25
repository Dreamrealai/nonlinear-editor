# Issue Report Template

## Standard Issue Format

All issues in ISSUES.md should follow this format:

```markdown
### Issue #[NUMBER]: [Concise, Action-Oriented Title]

- **Status:** Open | In Progress | Fixed
- **Priority:** P0 | P1 | P2 | P3
- **Location:** path/to/file.ts:line or directory/
- **Reported:** YYYY-MM-DD
- **Updated:** YYYY-MM-DD
- **Effort:** [Time estimate: "5 min", "30 min", "2 hours", etc.]
- **Category:** [Primary category from list below]
- **Found By:** [Agent names or "Manual" if added by developer]

- **Description:**
  [Clear, detailed description of the issue. Include:
   - What is wrong or missing
   - Why it's a problem
   - Impact on functionality, security, or quality
   - Context if needed to understand the issue]

- **Recommendation:**
  [Specific, actionable steps to fix:
   - Exact code changes needed (when possible)
   - Alternative approaches if multiple solutions
   - Links to relevant documentation or examples
   - Files that need to be created/modified]

- **Related Issues:** [Optional: #42, #56 if related to other issues]

- **Regression:** [Optional: Only if this was previously fixed]
  Previously fixed in Issue #[NUMBER] on [DATE]
  Reason for regression: [if known]
```

## Priority Levels

### P0 - Critical (Fix Immediately)
**Fix within:** Same day
**Criteria:**
- Security vulnerability (auth bypass, data exposure, SQL injection, XSS)
- Production breaking error
- Data loss risk
- Authentication/authorization bypass
- Deployment blocker

**Examples:**
- API route missing authentication middleware
- Database table without RLS policies
- Exposed secret key in code
- Critical test failures blocking deployment

### P1 - High (Fix This Week)
**Fix within:** 2-3 days
**Criteria:**
- Major functionality broken
- TypeScript compilation error
- Test failures (non-critical)
- Performance severely degraded
- Recent regression
- Missing critical validation

**Examples:**
- Timeline drag-and-drop not working
- N+1 database query causing slowdown
- Export functionality failing
- Missing input validation on API route

### P2 - Medium (Fix This Sprint)
**Fix within:** 1-2 weeks
**Criteria:**
- Code quality issues
- Architecture violations
- Missing tests for existing features
- Minor bugs affecting user experience
- Documentation gaps
- Tech debt accumulation

**Examples:**
- Component missing test coverage
- Business logic in API route (should be in service)
- Duplicate code across files
- Missing JSDoc on public API

### P3 - Low (Fix When Convenient)
**Fix within:** Next sprint or backlog
**Criteria:**
- Code style inconsistencies
- Refactoring opportunities
- Nice-to-have improvements
- Documentation polish
- Minor optimizations

**Examples:**
- Console.log statements in code
- Long function that could be split
- Unused imports
- Missing code comments

## Categories

Use these standardized categories:

### Security
- Authentication issues
- Authorization issues
- Data exposure
- Input validation
- SQL injection risks
- XSS vulnerabilities
- CSRF vulnerabilities
- Secrets management
- RLS policy issues

### Performance
- Slow queries
- N+1 query problems
- Missing database indexes
- Inefficient rendering
- Missing virtualization
- Bundle size issues
- Memory leaks
- Unnecessary re-renders

### Architecture
- Missing middleware
- Business logic in wrong layer
- Missing service layer
- Incorrect file organization
- Missing abstractions
- Pattern violations
- Dependency issues

### Code Quality
- TypeScript errors
- ESLint violations
- Duplicate code
- Complex functions
- Deep nesting
- Long parameter lists
- Code smells
- Unused code

### Testing
- Missing test files
- Test failures
- Flaky tests
- Low coverage areas
- Missing edge case tests
- Test reliability issues

### Documentation
- Outdated documentation
- Missing documentation
- Broken links
- Incorrect examples
- Missing API docs
- Missing comments

### Refactoring
- Extract utility opportunity
- Component decomposition needed
- Custom hook extraction
- Type improvements
- Simplification opportunities

### TypeScript
- Missing types
- `any` usage
- Missing branded types
- Type inconsistencies
- Generic type issues

## Effort Estimation Guidelines

### 5 min
- Remove console.log
- Fix unused import
- Update simple type
- Fix typo or naming

### 15 min
- Add simple validation
- Extract small utility function
- Add missing test case
- Update documentation

### 30 min
- Add authentication middleware
- Create simple service method
- Write test file for small component
- Refactor small function

### 1 hour
- Add RLS policy to table
- Create new service class
- Write comprehensive tests
- Extract custom hook
- Fix N+1 query

### 2-3 hours
- Decompose large component
- Create complex service
- Fix architectural issue
- Implement missing feature
- Comprehensive refactoring

### 1 day+
- Major architectural change
- Large feature addition
- Complex performance optimization
- System-wide refactoring

## Special Markers

### Quick Win
Add this tag for high-value, low-effort issues:
```markdown
- **Quick Win:** ✅ (15 min effort, P1 priority)
```

### Regression
Add this tag for issues that were previously fixed:
```markdown
- **Regression:** ⚠️ Previously fixed in #42 on 2025-10-20
```

### Multiple Agents
When multiple agents found the same issue:
```markdown
- **Found By:** Code Quality Sentinel, Architecture Enforcer, Issue Tracker Curator
- **Confidence:** High (found by 3 agents)
```

## Examples

### Example P0 Issue

```markdown
### Issue #127: API route missing authentication middleware

- **Status:** Open
- **Priority:** P0
- **Location:** app/api/assets/upload/route.ts:23
- **Reported:** 2025-10-25
- **Updated:** 2025-10-25
- **Effort:** 10 min
- **Category:** Security - Authentication
- **Found By:** Architecture Enforcer, Performance & Security Auditor

- **Description:**
  The file upload endpoint POST /api/assets/upload does not use the withAuth middleware,
  allowing unauthenticated users to potentially upload files to the system. This is a
  critical security vulnerability that could lead to storage abuse, malicious file uploads,
  or unauthorized access to other users' projects.

- **Recommendation:**
  Wrap the route handler with withAuth middleware:

  ```typescript
  import { withAuth } from '@/lib/auth/withAuth'

  export const POST = withAuth(async (req, { user }) => {
    // existing handler code
  }, {
    requireAuth: true,
    rateLimit: 'strict' // file uploads are expensive
  })
  ```

  After adding authentication, verify ownership of the project before allowing upload.
```

### Example P2 Issue

```markdown
### Issue #128: Timeline component should be decomposed

- **Status:** Open
- **Priority:** P2
- **Location:** components/timeline/Timeline.tsx
- **Reported:** 2025-10-25
- **Updated:** 2025-10-25
- **Effort:** 2-3 hours
- **Category:** Refactoring - Component Decomposition
- **Found By:** Refactoring Specialist

- **Description:**
  The Timeline component has grown to 347 lines with 8 state variables and complex
  rendering logic. This makes it difficult to test, maintain, and reason about. The
  component handles playback control, clip rendering, drag-and-drop, and timeline
  calculations all in one file.

- **Recommendation:**
  Split into focused components:

  1. Create `TimelineContainer.tsx` (state management and logic)
  2. Extract `TimelineTrack.tsx` (individual track rendering)
  3. Extract `TimelineControls.tsx` (playback controls)
  4. Create `useTimelineState()` hook (state management logic)
  5. Create `useTimelineDragDrop()` hook (drag-and-drop logic)

  Benefits:
  - Easier to test each component independently
  - Clearer separation of concerns
  - Reusable hooks for other timeline-like components
  - Better performance through focused re-renders

- **Related Issues:** #89 (Timeline performance optimization)
```

### Example Quick Win

```markdown
### Issue #129: Remove console.log statements in production code

- **Status:** Open
- **Priority:** P2
- **Location:** Multiple files (7 locations)
- **Reported:** 2025-10-25
- **Updated:** 2025-10-25
- **Effort:** 10 min
- **Category:** Code Quality
- **Found By:** Code Quality Sentinel
- **Quick Win:** ✅

- **Description:**
  Console.log statements found in production code across 7 files. These should be
  removed or replaced with proper logging mechanisms. Console logs in production
  can expose sensitive information and impact performance.

  Locations:
  1. components/timeline/Timeline.tsx:45
  2. components/timeline/TimelineClip.tsx:89
  3. app/api/video/generate/route.ts:67
  4. lib/services/VideoService.ts:123
  5. hooks/useTimelinePlayback.ts:34
  6. components/editor/EditorHeader.tsx:78
  7. stores/timelineStore.ts:156

- **Recommendation:**
  Remove all console.log statements. For debugging during development, use:
  ```typescript
  if (process.env.NODE_ENV === 'development') {
    console.log('[DEBUG]', data)
  }
  ```

  For production logging, use the trackError utility or a proper logging service.
```

## ISSUES.md Structure

```markdown
# Issues Tracker

Last Updated: 2025-10-25
Total Open Issues: 179

## Quick Stats

- **P0 (Critical):** 4 open
- **P1 (High):** 18 open
- **P2 (Medium):** 37 open
- **P3 (Low):** 14 open
- **In Progress:** 8
- **Quick Wins Available:** 12

---

## Priority P0 (Critical) - 4 issues

[P0 issues here, newest first]

---

## Priority P1 (High) - 18 issues

[P1 issues here, newest first]

---

## Priority P2 (Medium) - 37 issues

[P2 issues here, newest first]

---

## Priority P3 (Low) - 14 issues

[P3 issues here, newest first]

---

## Recently Fixed (Last 30 Days) - 23 issues

[Fixed issues here, newest first - keep for 30 days then archive]

---

## Notes

- Issues are automatically managed by code-maintenance skill
- See CLAUDE.md for manual issue submission guidelines
- Priority levels: P0 (same day), P1 (this week), P2 (this sprint), P3 (backlog)
```
