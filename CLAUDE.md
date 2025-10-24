# Project Memory

## Git Workflow

**IMPORTANT**: After every code update or change:

1. **Build the project** - Always run the build command to ensure the code compiles without errors
2. **Commit changes** - Create a git commit with a descriptive message
3. **Push to remote** - Push the changes to the git remote repository

### Automated Workflow

When making changes to this project:

1. Run `npm run build` to build the Next.js application with Turbopack
2. Verify the build succeeds without errors
3. Stage changes with `git add .`
4. Create a commit: `git commit -m "descriptive message"`
5. Push to remote: `git push`

This ensures all changes are properly built, tested, and version controlled before being pushed to the repository.

## Document Management

**CRITICAL**: Before creating ANY new markdown document, you MUST follow this protocol to prevent document proliferation.

### Document Creation Protocol

**ALWAYS follow these steps in order:**

1. **Check for existing documents FIRST**

   ```bash
   # Search for existing issue/analysis documents
   ls -la *.md | grep -iE "(issue|analysis|report|validation|tracking)"

   # Check if ISSUES.md exists (canonical issue tracker)
   test -f ISSUES.md && echo "Use ISSUES.md" || echo "Create ISSUES.md"
   ```

2. **Update existing documents instead of creating new ones**
   - If `ISSUES.md` exists → Add new issues to it with status updates
   - If analysis reports exist → Update existing report with new findings
   - If documentation exists in `/docs/` → Update the appropriate doc file

3. **Only create NEW documents when:**
   - No existing document covers the topic
   - Creating a one-time report that will be archived
   - Document serves a distinct purpose (e.g., migration guide, specific bug report)

### Canonical Document Locations

**Issue Tracking:**

- **`ISSUES.md`** - Single source of truth for ALL codebase issues
  - Update this file, never create `ISSUES_2.md`, `NEW_ISSUES.md`, etc.
  - Format: Priority-based sections (P0, P1, P2, P3), status tracking, effort estimates

**Project Documentation:**

- **`/docs/`** directory - All permanent documentation
  - Architecture guides
  - API documentation
  - Coding standards
  - Testing guides

**Temporary Analysis:**

- **Root directory** - Only for one-time reports that will be cleaned up
  - Name format: `[TOPIC]_REPORT_[DATE].md`
  - Example: `MIGRATION_REPORT_2025-10-24.md`
  - Archive or delete after information is incorporated into ISSUES.md

### Forbidden Document Patterns

**NEVER create these types of files:**

- ❌ `ISSUES_NEW.md` - Update ISSUES.md instead
- ❌ `CODEBASE_ANALYSIS_REPORT.md` - Add findings to ISSUES.md
- ❌ `VALIDATION_REPORT.md` - Update issue status in ISSUES.md
- ❌ `DUPLICATE_CODE_ANALYSIS.md` - Add to ISSUES.md as duplicate code issues
- ❌ `AGENT_[N]_FINDINGS.md` - Consolidate findings into ISSUES.md
- ❌ Multiple files for the same topic

**Instead:**

- ✅ Update `ISSUES.md` with new findings
- ✅ Add status updates to existing issues
- ✅ Create sections in ISSUES.md for different issue categories

### Document Maintenance

**When running analysis tasks:**

1. **Check current state:**

   ```bash
   # Count existing analysis documents
   ls -1 *.md | wc -l

   # List all analysis files
   ls -1 *ANALYSIS*.md *REPORT*.md *VALIDATION*.md *ISSUES*.md 2>/dev/null
   ```

2. **Consolidate before creating:**
   - If 3+ analysis documents exist → Consolidate them first
   - Read existing ISSUES.md → Update it with new findings
   - Archive old reports → Move to `/archive/` directory

3. **Update ISSUES.md format:**

   ```markdown
   ## [Issue Category]

   ### Issue #X: [Title]

   - **Status:** Open/Fixed/In Progress
   - **Priority:** P0/P1/P2/P3
   - **Location:** [file:line]
   - **Reported:** [Date]
   - **Updated:** [Date]
   - **Effort:** [Hours]
   - **Description:** [Details]
   ```

### Pre-Document Creation Checklist

Before creating ANY new markdown file in project root:

- [ ] Searched for existing documents on this topic
- [ ] Checked if ISSUES.md exists and can be updated
- [ ] Verified this is not duplicate information
- [ ] Confirmed this needs to be a separate document
- [ ] Named with clear convention: `[TOPIC]_[TYPE]_[DATE].md`
- [ ] Planned to consolidate/archive after use

### Document Cleanup Protocol

**Every sprint:**

1. Review all `*.md` files in project root
2. Consolidate analysis reports into ISSUES.md
3. Move archived reports to `/archive/` directory
4. Delete redundant or outdated reports
5. Update ISSUES.md status for all items

### Agent Instructions for Document Creation

**When an agent is asked to analyze the codebase:**

1. **First action:** Check if ISSUES.md exists
   - If yes: Read it and prepare to UPDATE it
   - If no: Create it as the canonical issue tracker

2. **During analysis:** Collect all findings in memory

3. **Final action:** Update ISSUES.md with:
   - New issues discovered
   - Status updates for existing issues
   - Validation results
   - Priority adjustments

4. **Never:** Create separate `*_REPORT.md`, `*_ANALYSIS.md`, `*_FINDINGS.md` files unless explicitly required for a one-time deliverable

### Example: Correct Document Workflow

**BAD** ❌:

```
Agent 1 creates: CODEBASE_ANALYSIS_REPORT.md
Agent 2 creates: VALIDATION_REPORT.md
Agent 3 creates: DUPLICATE_CODE_ANALYSIS.md
Agent 4 creates: ISSUES_VERIFIED.md
Agent 5 creates: FINAL_CONSOLIDATED_REPORT.md
Result: 5 overlapping documents, scattered information
```

**GOOD** ✅:

```
Agent 1: Checks for ISSUES.md (not found)
Agent 1: Creates ISSUES.md with all findings
Agent 2: Reads ISSUES.md, validates issues, updates status
Agent 3: Reads ISSUES.md, adds new duplicate code issues
Agent 4: Reads ISSUES.md, marks fixed issues as Fixed
Agent 5: Reads ISSUES.md, adds priority adjustments
Result: 1 comprehensive document, single source of truth
```

## Coding Best Practices Summary

**MUST READ**: Comprehensive documentation available in `/docs/`

### Key Practices

**TypeScript:**

- Use branded types for IDs: `UserId`, `ProjectId`, `AssetId`
- Use discriminated unions for error handling
- Use assertion functions for type guards
- Avoid `any` - use `unknown` or generics
- Always specify function return types

**React Components:**

- Use `forwardRef` for reusable components
- Extract logic into custom hooks
- Follow hooks order: context → state → refs → effects → custom
- Use memoization for expensive computations

**State Management (Zustand):**

- Separate stores by domain (timeline, playback, selection)
- Use Immer middleware for immutable updates
- Use selectors for derived state
- Keep actions focused and atomic

**API Routes:**

- Always use `withAuth` middleware
- Apply appropriate rate limiting tier
- Validate all inputs with assertion functions
- Use service layer for business logic
- Return standardized error responses

**Service Layer:**

- Implement in `/lib/services/`
- Accept dependencies via constructor (dependency injection)
- Handle errors and track them
- Implement caching where appropriate
- Invalidate cache after mutations

**Error Handling:**

- Use custom error classes (ValidationError, DatabaseError)
- Track errors with context
- Provide user-friendly messages
- Implement graceful fallbacks

**Security:**

- Validate all inputs (never trust client data)
- Use Row Level Security (RLS) in database
- Verify ownership before operations
- Apply rate limiting by operation cost
- Sanitize user-generated content

**Testing:**

- Follow AAA pattern (Arrange-Act-Assert)
- Use helper functions for common setups
- Write descriptive test names
- Test edge cases and error paths

**Code Organization:**

- Follow naming conventions (camelCase, PascalCase, SCREAMING_SNAKE_CASE)
- Organize imports (React → third-party → absolute → relative → types)
- Use consistent file naming
- Keep files focused and cohesive

### Quick Reference Documentation

- **[Coding Best Practices](/docs/CODING_BEST_PRACTICES.md)** - Comprehensive patterns with examples
- **[Style Guide](/docs/STYLE_GUIDE.md)** - Code formatting and conventions
- **[Architecture Overview](/docs/ARCHITECTURE_OVERVIEW.md)** - System design and patterns
- **[Service Layer Guide](/docs/SERVICE_LAYER_GUIDE.md)** - Business logic patterns
- **[API Documentation](/docs/api/)** - API endpoints and contracts

### Before Committing Code

Checklist:

- [ ] TypeScript strict mode passes (no `any`)
- [ ] Branded types used for IDs
- [ ] API routes use `withAuth` middleware
- [ ] Errors handled with `errorResponse` helpers
- [ ] Input validation with assertion functions
- [ ] Service layer used for business logic
- [ ] Tests follow AAA pattern
- [ ] Code formatted with Prettier
- [ ] No ESLint warnings
- [ ] Documentation updated

## Test Credentials

**IMPORTANT**: These credentials are for testing purposes only.

- Email: test@example.com
- Password: test_password_123
