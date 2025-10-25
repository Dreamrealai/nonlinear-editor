---
name: code-maintenance
description: Comprehensive daily codebase maintenance using a multi-agent swarm system. Performs documentation cleanup, ISSUES.md validation and updates, codebase error scanning, test validation, duplicate code detection, refactoring opportunity identification, code commenting, security audits, and performance analysis. Use this when the user asks to "maintain the codebase", "run maintenance", "clean up the code", "audit the codebase", or "daily maintenance check".
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Task, TodoWrite, WebFetch, WebSearch
---

# Code Maintenance - Multi-Agent Swarm System

## Overview

This skill orchestrates a swarm of 7 specialized agents to perform comprehensive codebase maintenance tailored specifically for this Next.js/React/TypeScript/Supabase video editor project.

## Agent Architecture

### 🔷 Agent 1: Documentation Guardian
**Purpose**: Validates and maintains all documentation files
**Scope**: `/docs/`, `CLAUDE.md`, `README.md`, inline code documentation
**Reference**: `agents/documentation-guardian.md`

### 🔷 Agent 2: Issue Tracker Curator
**Purpose**: Maintains ISSUES.md as single source of truth
**Scope**: Scan codebase, validate existing issues, add new findings
**Reference**: `agents/issue-tracker-curator.md`

### 🔷 Agent 3: Code Quality Sentinel
**Purpose**: Ensures code quality standards and finds errors
**Scope**: TypeScript errors, ESLint violations, test failures, duplicate code
**Reference**: `agents/code-quality-sentinel.md`

### 🔷 Agent 4: Architecture Enforcer
**Purpose**: Validates adherence to architectural patterns
**Scope**: API middleware, branded types, service layer, error handling
**Reference**: `agents/architecture-enforcer.md`

### 🔷 Agent 5: Performance & Security Auditor
**Purpose**: Identifies performance and security issues
**Scope**: Security vulnerabilities, performance bottlenecks, dependency audits
**Reference**: `agents/performance-security-auditor.md`

### 🔷 Agent 6: Refactoring Specialist
**Purpose**: Identifies improvement opportunities
**Scope**: Code complexity, abstraction opportunities, pattern improvements
**Reference**: `agents/refactoring-specialist.md`

### 🔷 Agent 7: Integration Validator (Final Agent)
**Purpose**: Consolidates all findings and updates ISSUES.md
**Scope**: Deduplicates findings, prioritizes issues, generates summary
**Reference**: `agents/integration-validator.md`

## Execution Flow

### Phase 1: Initialization (1-2 minutes)
1. Create comprehensive todo list tracking all 7 agents
2. Read current ISSUES.md to understand existing state
3. Check recent git commits for context
4. Identify files changed in last 7 days for focused analysis

### Phase 2: Parallel Agent Execution (5-10 minutes)
Execute Agents 1-6 in parallel using Task tool:

```
Task 1: Documentation Guardian → agents/documentation-guardian.md
Task 2: Issue Tracker Curator → agents/issue-tracker-curator.md
Task 3: Code Quality Sentinel → agents/code-quality-sentinel.md
Task 4: Architecture Enforcer → agents/architecture-enforcer.md
Task 5: Performance & Security Auditor → agents/performance-security-auditor.md
Task 6: Refactoring Specialist → agents/refactoring-specialist.md
```

Each agent returns a structured report:
- **Findings**: List of issues discovered
- **Severity**: P0 (critical), P1 (high), P2 (medium), P3 (low)
- **Location**: Exact file paths and line numbers
- **Recommendation**: Actionable fix description

### Phase 3: Validation & Consolidation (2-3 minutes)
1. Execute Agent 7 (Integration Validator) with all agent reports
2. Deduplicate findings across agents
3. Prioritize issues by severity and impact
4. Update ISSUES.md with consolidated findings
5. Generate executive summary

### Phase 4: Reporting (1 minute)
1. Display summary statistics:
   - Total issues found
   - Issues by priority (P0/P1/P2/P3)
   - Issues by category
   - Critical actions required
2. Show ISSUES.md diff
3. Provide next steps

## Codebase-Specific Intelligence

This skill is optimized for this project's stack:

**TypeScript/React Patterns**:
- Branded types for IDs (`UserId`, `ProjectId`, `AssetId`)
- Discriminated unions for error handling
- `forwardRef` for reusable components
- Custom hooks following hooks order

**API Security Checks**:
- All API routes must use `withAuth` middleware
- Rate limiting tier applied appropriately
- Input validation with assertion functions
- Service layer for business logic

**State Management (Zustand)**:
- Separate stores by domain
- Immer middleware for immutability
- Selector patterns for derived state
- Atomic actions

**Testing Requirements**:
- AAA pattern (Arrange-Act-Assert)
- Helper functions from `__tests__/helpers/`
- Descriptive test names
- Edge case coverage

**Database (Supabase)**:
- RLS policies on all tables
- Migration files in `/supabase/migrations/`
- Branded types for foreign keys
- Proper indexing for performance

## Instructions for Claude

When this skill is activated:

1. **DO NOT skip any agents** - all 7 must run
2. **Run agents 1-6 in parallel** using single message with multiple Task calls
3. **Wait for all parallel agents to complete** before running Agent 7
4. **Always update ISSUES.md** - never create separate report files
5. **Use TodoWrite** to track progress throughout execution
6. **Provide actionable recommendations** - not just problem identification
7. **Update todo statuses** as each agent completes
8. **Generate metrics** at the end for progress tracking

## Expected Outputs

### Updated Files
- `ISSUES.md` - Consolidated findings with status updates
- `/docs/*` - Documentation corrections (if needed)
- Inline comments added to complex code (if critical)

### Console Output
```
🔧 Code Maintenance - Multi-Agent Swarm Activated

Phase 1: Initialization ✓
- Loaded current state from ISSUES.md
- Identified 47 files changed in last 7 days
- Created agent tracking todos

Phase 2: Agent Execution ⚡
→ Agent 1: Documentation Guardian [RUNNING]
→ Agent 2: Issue Tracker Curator [RUNNING]
→ Agent 3: Code Quality Sentinel [RUNNING]
→ Agent 4: Architecture Enforcer [RUNNING]
→ Agent 5: Performance & Security Auditor [RUNNING]
→ Agent 6: Refactoring Specialist [RUNNING]

[Agent reports display as they complete]

Phase 3: Validation & Consolidation ✓
→ Agent 7: Integration Validator [RUNNING]
- Deduplicated 23 findings across agents
- Prioritized 156 issues total
- Updated ISSUES.md with 14 new issues, 7 status updates

Phase 4: Summary 📊

Issues Summary:
┌──────────┬───────┬─────┬────────┐
│ Priority │ New   │ Open│ Fixed  │
├──────────┼───────┼─────┼────────┤
│ P0       │ 2     │ 3   │ 1      │
│ P1       │ 5     │ 12  │ 4      │
│ P2       │ 7     │ 28  │ 8      │
│ P3       │ 0     │ 15  │ 3      │
└──────────┴───────┴─────┴────────┘

Critical Actions Required:
1. Fix authentication bypass in /app/api/export/route.ts:45
2. Resolve 8 failing tests in timeline components
3. Update deprecated Supabase SDK calls (12 locations)

Full details in ISSUES.md
```

## Quality Checks

Before marking this skill complete, verify:
- [ ] All 7 agents executed successfully
- [ ] ISSUES.md updated (not a new file created)
- [ ] At least 5 categories of issues scanned
- [ ] All findings have file:line references
- [ ] Priority levels assigned to all issues
- [ ] Executive summary provided
- [ ] Next steps are actionable

## Performance Optimization

To keep execution under 15 minutes:
- Focus on files changed in last 7-14 days (use `git log`)
- Use parallel Task execution for agents 1-6
- Leverage Glob/Grep for pattern matching (not slow iteration)
- Cache frequently accessed data in agent memory
- Skip binary files and dependencies (node_modules, .next)

## Examples

**User Trigger**: "Run daily maintenance"
**User Trigger**: "Maintain the codebase"
**User Trigger**: "Audit everything and clean up"
**User Trigger**: "Check for issues and refactoring opportunities"

## Notes

- This skill respects the Document Management Protocol in CLAUDE.md
- Never creates duplicate analysis files
- Always consolidates findings into ISSUES.md
- Can be run daily without accumulating technical debt
- Designed for this specific Next.js/React/TypeScript/Supabase codebase
