---
name: code-maintenance
description: Comprehensive daily codebase maintenance with multi-agent scanning, automatic fixing of easy issues, and validation. Scans for security vulnerabilities, code quality issues, missing tests, duplicate code, and architectural violations. Automatically fixes simple issues like console.logs and unused imports. Use when user says "maintain the codebase", "run maintenance", "clean up the code", "audit the codebase", "daily maintenance check", or "fix and validate code".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite
---

# Code Maintenance - Multi-Agent Swarm with Auto-Fix & Validation

## Overview

This skill orchestrates **12 specialized agents** in a sophisticated pipeline:
1. **Scan** codebase for issues (6 agents in parallel)
2. **Consolidate** findings and identify quick wins (1 agent)
3. **Auto-fix** easy issues (1 agent)
4. **Validate** changes don't break anything (3 agents in parallel)
5. **Reconcile** and update ISSUES.md (1 agent)

**Total execution time:** 15-25 minutes
**Output:** Updated ISSUES.md + Fixed code + Validation report

---

## 12-Agent Architecture

### 🔍 Phase 2: Scanning Agents (PARALLEL)

#### 🔷 Agent 1: Documentation Guardian
**Purpose:** Validates documentation accuracy
**Reference:** `agents/documentation-guardian.md`
**Parallel:** YES - Run with agents 2-6

#### 🔷 Agent 2: Issue Tracker Curator
**Purpose:** Maintains ISSUES.md as single source of truth
**Reference:** `agents/issue-tracker-curator.md`
**Parallel:** YES - Run with agents 1, 3-6

#### 🔷 Agent 3: Code Quality Sentinel
**Purpose:** Finds quality issues, test failures, duplicate code
**Reference:** `agents/code-quality-sentinel.md`
**Parallel:** YES - Run with agents 1-2, 4-6

#### 🔷 Agent 4: Architecture Enforcer
**Purpose:** Validates architectural patterns
**Reference:** `agents/architecture-enforcer.md`
**Parallel:** YES - Run with agents 1-3, 5-6

#### 🔷 Agent 5: Performance & Security Auditor
**Purpose:** Security vulnerabilities, performance issues
**Reference:** `agents/performance-security-auditor.md`
**Parallel:** YES - Run with agents 1-4, 6

#### 🔷 Agent 6: Refactoring Specialist
**Purpose:** Identifies refactoring opportunities
**Reference:** `agents/refactoring-specialist.md`
**Parallel:** YES - Run with agents 1-5

---

### 🎯 Phase 3: Integration

#### 🔷 Agent 7: Integration Validator
**Purpose:** Consolidate findings, identify auto-fixable issues
**Reference:** `agents/integration-validator.md`
**Parallel:** NO - Wait for agents 1-6 to complete
**Output:** Consolidated report + list of auto-fixable issues

---

### 🔧 Phase 4: Auto-Fix

#### 🔷 Agent 8: Auto-Fixer
**Purpose:** Automatically fix safe, easy issues
**Reference:** `agents/auto-fixer.md`
**Parallel:** NO - Sequential fixes for safety
**Fixes:**
- Remove console.log/debug statements
- Remove unused imports
- Fix auto-fixable ESLint issues
- Add missing simple return types
- Remove trailing whitespace

---

### ✅ Phase 5: Validation Agents (PARALLEL)

#### 🔷 Agent 9: Build & Type Validator
**Purpose:** Ensure TypeScript still compiles
**Reference:** `agents/build-type-validator.md`
**Parallel:** YES - Run with agents 10-11
**Checks:** `tsc --noEmit`, no new `any` types

#### 🔷 Agent 10: Test Suite Validator
**Purpose:** Ensure tests still pass
**Reference:** `agents/test-suite-validator.md`
**Parallel:** YES - Run with agents 9, 11
**Checks:** `npm test`, no new failures

#### 🔷 Agent 11: Lint & Format Validator
**Purpose:** Ensure code meets quality standards
**Reference:** `agents/lint-format-validator.md`
**Parallel:** YES - Run with agents 9-10
**Checks:** `eslint`, no new violations

---

### 📋 Phase 6: Final Reconciliation

#### 🔷 Agent 12: Final Reconciliation
**Purpose:** Update ISSUES.md with results
**Reference:** `agents/final-reconciliation.md`
**Parallel:** NO - Wait for validation to complete
**Actions:**
- Mark auto-fixed issues as "Fixed"
- Add validation results
- Update effort estimates
- Generate final summary

---

## Execution Flow

### Phase 1: Initialization (1-2 min)

```typescript
1. Create comprehensive todo list tracking all 12 agents
2. Read current ISSUES.md to understand existing state
3. Check recent git commits for context (git log --since="7 days ago")
4. Identify recently changed files for focused analysis
5. Create backup branch: git branch maintenance-backup-$(date +%s)
```

### Phase 2: Parallel Scanning (5-10 min)

**CRITICAL: Run agents 1-6 in SINGLE message with MULTIPLE Task calls**

```typescript
// Example of correct parallel execution:
// Send ONE message with SIX Task tool calls

Task({
  description: "Agent 1: Documentation Guardian",
  subagent_type: "general-purpose",
  prompt: `You are Agent 1: Documentation Guardian.

  Read: .claude/skills/code-maintenance/agents/documentation-guardian.md
  Follow ALL instructions in that file.
  Return your findings in the specified JSON format.`
})

Task({
  description: "Agent 2: Issue Tracker Curator",
  subagent_type: "general-purpose",
  prompt: `You are Agent 2: Issue Tracker Curator.

  Read: .claude/skills/code-maintenance/agents/issue-tracker-curator.md
  Follow ALL instructions in that file.
  Return your findings in the specified JSON format.`
})

// ... Tasks 3-6 in same message
```

**Wait for ALL 6 agents to complete before proceeding.**

Each agent returns:
```json
{
  "agentName": "...",
  "findings": [...],
  "summary": {...},
  "criticalActions": [...]
}
```

### Phase 3: Integration & Prioritization (2-3 min)

```typescript
Task({
  description: "Agent 7: Integration Validator",
  subagent_type: "general-purpose",
  prompt: `You are Agent 7: Integration Validator.

  Input: Reports from agents 1-6 (provided below)

  Read: .claude/skills/code-maintenance/agents/integration-validator.md
  Follow ALL instructions to:
  1. Consolidate findings
  2. Deduplicate issues
  3. Assign priorities
  4. Identify auto-fixable issues (P3 and safe P2)

  Return:
  - consolidatedFindings (all issues)
  - autoFixableIssues (safe to auto-fix)
  - summary

  Agent Reports:
  ${JSON.stringify(agentReports)}`
})
```

**Output:** List of auto-fixable issues to pass to Agent 8

### Phase 4: Auto-Fix Easy Issues (3-5 min)

```typescript
Task({
  description: "Agent 8: Auto-Fixer",
  subagent_type: "general-purpose",
  prompt: `You are Agent 8: Auto-Fixer.

  Read: .claude/skills/code-maintenance/agents/auto-fixer.md

  Auto-fixable issues identified:
  ${JSON.stringify(autoFixableIssues)}

  INSTRUCTIONS:
  1. Fix ONE category at a time
  2. After each category, run git diff to verify changes
  3. Only fix P3 and explicitly marked safe P2 issues
  4. NEVER fix P0 or P1 (too risky)
  5. Return list of what was fixed

  Categories to fix:
  - Remove console.log statements
  - Remove unused imports
  - Fix ESLint auto-fixable issues
  - Add simple return types where obvious

  Return JSON:
  {
    "fixed": [{ "issue": "...", "location": "...", "changesMade": "..." }],
    "skipped": [{ "issue": "...", "reason": "..." }],
    "summary": { "totalFixed": N, "filesModified": N }
  }`
})
```

**Output:** List of fixed issues and modified files

### Phase 5: Parallel Validation (2-3 min)

**CRITICAL: Run agents 9-11 in SINGLE message with THREE Task calls**

```typescript
// Send ONE message with THREE Task tool calls

Task({
  description: "Agent 9: Build & Type Validator",
  subagent_type: "general-purpose",
  prompt: `You are Agent 9: Build & Type Validator.

  Read: .claude/skills/code-maintenance/agents/build-type-validator.md

  Files modified by auto-fixer:
  ${JSON.stringify(modifiedFiles)}

  INSTRUCTIONS:
  1. Run: tsc --noEmit
  2. Check for TypeScript errors
  3. Verify no new 'any' types introduced
  4. Return validation results`
})

Task({
  description: "Agent 10: Test Suite Validator",
  subagent_type: "general-purpose",
  prompt: `You are Agent 10: Test Suite Validator.

  Read: .claude/skills/code-maintenance/agents/test-suite-validator.md

  Files modified: ${JSON.stringify(modifiedFiles)}

  INSTRUCTIONS:
  1. Run test suite
  2. Compare results to baseline
  3. Identify new failures (if any)
  4. Return validation results`
})

Task({
  description: "Agent 11: Lint & Format Validator",
  subagent_type: "general-purpose",
  prompt: `You are Agent 11: Lint & Format Validator.

  Read: .claude/skills/code-maintenance/agents/lint-format-validator.md

  Files modified: ${JSON.stringify(modifiedFiles)}

  INSTRUCTIONS:
  1. Run ESLint
  2. Check for new violations
  3. Verify code formatting
  4. Return validation results`
})
```

**Wait for ALL 3 validators to complete.**

Each validator returns:
```json
{
  "validatorName": "...",
  "status": "PASSED" | "FAILED",
  "errors": [...],
  "warnings": [...],
  "recommendations": [...]
}
```

### Phase 6: Final Reconciliation (1-2 min)

```typescript
Task({
  description: "Agent 12: Final Reconciliation",
  subagent_type: "general-purpose",
  prompt: `You are Agent 12: Final Reconciliation.

  Read: .claude/skills/code-maintenance/agents/final-reconciliation.md

  Inputs:
  - Consolidated findings from Agent 7
  - Auto-fix results from Agent 8
  - Validation results from Agents 9-11

  INSTRUCTIONS:
  1. Update ISSUES.md:
     - Mark auto-fixed issues as "Fixed"
     - Add validation results
     - Add remaining open issues
  2. If validation FAILED:
     - Revert auto-fixes: git reset --hard HEAD
     - Mark issues as "Auto-fix attempted but validation failed"
  3. Generate final summary

  Return final report`
})
```

### Phase 7: Final Report (1 min)

Display comprehensive summary to user.

---

## Instructions for Claude

### CRITICAL PARALLEL EXECUTION RULES

1. **Agents 1-6 MUST run in parallel**
   - Send ONE message with SIX Task calls
   - Do NOT send 6 separate messages
   - Wait for all to complete before Phase 3

2. **Agents 9-11 MUST run in parallel**
   - Send ONE message with THREE Task calls
   - Do NOT send 3 separate messages
   - Wait for all to complete before Phase 6

3. **Sequential agents:**
   - Agent 7: Wait for 1-6
   - Agent 8: Wait for 7
   - Agents 9-11: Wait for 8 (then parallel)
   - Agent 12: Wait for 9-11

### Auto-Fix Safety Rules

1. **Only fix P3 and safe P2 issues**
2. **Never fix P0 or P1** (security/critical issues need human review)
3. **Fix one category at a time**
4. **Verify changes with git diff after each category**
5. **If validation fails, REVERT all changes**

### Validation Rules

1. **All 3 validators must PASS** to keep fixes
2. **If ANY validator fails:**
   - Revert changes: `git reset --hard HEAD`
   - Document why in ISSUES.md
   - Mark issues as "Needs manual fix"

### ISSUES.md Update Rules

1. **Update existing ISSUES.md**, never create new file
2. **Mark fixed issues** with:
   - Status: Fixed
   - Fixed By: Auto-Fixer (Agent 8)
   - Fixed Date: [TODAY]
   - Validation: PASSED
3. **Keep unfixed issues** as Open
4. **Add new issues** from scanning

---

## Expected Outputs

### Modified Files

```
Modified:
- ISSUES.md (updated with findings and fixes)
- Multiple source files (console.logs removed, imports cleaned, etc.)

Created:
- maintenance-backup-[timestamp] branch (backup before changes)
```

### Console Output

```
🔧 Code Maintenance - 12-Agent Swarm with Auto-Fix

═══════════════════════════════════════════════════════════════

Phase 1: Initialization ✓ (1 min)
─────────────────────────────
✓ Loaded ISSUES.md (156 existing issues)
✓ Identified 47 files changed in last 7 days
✓ Created backup branch: maintenance-backup-1735142400
✓ Initialized 12-agent tracking

Phase 2: Parallel Scanning ⚡ (8 min)
────────────────────────────────────
→ Agent 1: Documentation Guardian    [COMPLETE] 12 findings
→ Agent 2: Issue Tracker Curator     [COMPLETE] 23 findings
→ Agent 3: Code Quality Sentinel     [COMPLETE] 45 findings
→ Agent 4: Architecture Enforcer     [COMPLETE] 31 findings
→ Agent 5: Performance & Security    [COMPLETE] 18 findings
→ Agent 6: Refactoring Specialist    [COMPLETE] 14 findings

Total findings: 143

Phase 3: Integration ✓ (2 min)
────────────────────────────────
→ Agent 7: Integration Validator [COMPLETE]
✓ Deduplicated 143 → 87 unique issues
✓ Identified 23 auto-fixable issues
✓ Prioritized: 4 P0, 18 P1, 37 P2, 28 P3

Phase 4: Auto-Fix ⚡ (4 min)
────────────────────────────────
→ Agent 8: Auto-Fixer [RUNNING]

Fixing console.log statements...
  ✓ Removed 7 console.log statements (7 files)

Fixing unused imports...
  ✓ Removed 12 unused imports (8 files)

Fixing ESLint auto-fixable issues...
  ✓ Fixed 5 ESLint violations (4 files)

Auto-fix summary:
  ✓ Fixed: 24 issues
  ✓ Files modified: 15
  ✓ Skipped: 0 issues

Phase 5: Parallel Validation ⚡ (3 min)
───────────────────────────────────────
→ Agent 9: Build & Type Validator  [COMPLETE] ✅ PASSED
→ Agent 10: Test Suite Validator   [COMPLETE] ✅ PASSED
→ Agent 11: Lint & Format Validator [COMPLETE] ✅ PASSED

All validation checks passed! ✅

Phase 6: Final Reconciliation ✓ (1 min)
────────────────────────────────────────
→ Agent 12: Final Reconciliation [COMPLETE]
✓ Updated ISSUES.md
  - 24 issues marked as Fixed
  - 63 new issues added
  - 12 existing issues updated

═══════════════════════════════════════════════════════════════

📊 FINAL SUMMARY

Issues:
┌──────────┬─────────┬─────────┬─────────┐
│ Priority │ Found   │ Fixed   │ Open    │
├──────────┼─────────┼─────────┼─────────┤
│ P0       │ 4       │ 0       │ 4       │
│ P1       │ 18      │ 0       │ 18      │
│ P2       │ 37      │ 8       │ 29      │
│ P3       │ 28      │ 16      │ 12      │
└──────────┴─────────┴─────────┴─────────┘

Auto-Fixed (24 issues):
✓ Removed 7 console.log statements
✓ Removed 12 unused imports
✓ Fixed 5 ESLint violations

Validation Results:
✅ TypeScript compilation: PASSED
✅ Test suite (247 tests): PASSED
✅ ESLint checks: PASSED

🚨 Critical Actions Required:
1. [P0] Add withAuth to upload endpoint (10 min)
2. [P0] Add RLS policies to exports table (20 min)
3. [P1] Fix 3 failing tests in timeline (1 hour)

📁 Updated Files:
✓ ISSUES.md
✓ 15 source files (auto-fixed)

Next Steps:
1. Review ISSUES.md for complete details
2. Address 4 P0 critical issues immediately
3. Plan sprint for 18 P1 high-priority issues

═══════════════════════════════════════════════════════════════
```

---

## Quality Checks

Before marking complete, verify:
- [ ] All 12 agents executed successfully
- [ ] Agents 1-6 ran in parallel (single message, 6 Tasks)
- [ ] Agents 9-11 ran in parallel (single message, 3 Tasks)
- [ ] Auto-fixes were validated before keeping
- [ ] ISSUES.md updated (not new file created)
- [ ] All findings have file:line references
- [ ] Fixed issues marked with "Fixed By: Auto-Fixer"
- [ ] Validation results included
- [ ] If validation failed, changes were reverted

---

## Codebase-Specific Intelligence

**TypeScript/React Patterns:**
- Branded types for IDs (`UserId`, `ProjectId`, `AssetId`)
- Discriminated unions for error handling
- `forwardRef` for reusable components
- Custom hooks following hooks order

**API Security:**
- All routes use `withAuth` middleware
- Rate limiting configured
- Input validation with assertion functions
- Service layer for business logic

**State Management:**
- Zustand stores with Immer middleware
- Separate stores by domain
- Selector patterns for performance

**Testing:**
- AAA pattern (Arrange-Act-Assert)
- Helper functions in `__tests__/helpers/`
- See TEST_RELIABILITY_GUIDE.md for flaky tests

**Database:**
- RLS policies on all tables
- Branded types for foreign keys
- Proper indexing

---

## Performance Optimization

Target: Complete in 15-25 minutes

**Optimization strategies:**
- Focus on files changed in last 7 days (git log)
- Use parallel execution (agents 1-6, agents 9-11)
- Leverage Glob/Grep for pattern matching
- Cache frequently accessed data
- Skip node_modules, .next, binaries

---

## Error Handling

### If Agent Fails

```typescript
If ANY scanning agent (1-6) fails:
→ Continue with remaining agents
→ Note failure in summary
→ Proceed with available findings

If Integration Validator (7) fails:
→ STOP - cannot proceed safely
→ Report error to user
→ Do not auto-fix

If Auto-Fixer (8) fails:
→ Revert any partial changes
→ Mark issues as "Auto-fix failed"
→ Continue to reconciliation

If ANY validation agent (9-11) fails:
→ REVERT all auto-fixes immediately
→ Mark issues as "Needs manual fix"
→ Include validation errors in ISSUES.md
```

### Rollback Procedure

```bash
# If validation fails or errors occur:
git reset --hard HEAD
git clean -fd

# Backup branch preserved:
git branch -D maintenance-backup-[timestamp]  # Only after success
```

---

## Examples

**User Trigger:** "Run code maintenance"
**User Trigger:** "Maintain the codebase"
**User Trigger:** "Audit and fix code"
**User Trigger:** "Daily maintenance check"
**User Trigger:** "Clean up code and validate"

---

## Notes

- Follows Document Management Protocol (CLAUDE.md)
- Never creates duplicate report files
- Always consolidates into ISSUES.md
- Auto-fixes are safe and validated
- Can run daily for continuous improvement
- Tailored to Next.js/React/TypeScript/Supabase stack
