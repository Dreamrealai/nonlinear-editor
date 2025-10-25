# Code Maintenance Skill

## Overview

A comprehensive multi-agent code maintenance system designed specifically for this Next.js/React/TypeScript/Supabase video editor project. Performs automated codebase auditing, issue tracking, and quality assurance through a swarm of 7 specialized agents.

## Quick Start

Activate this skill by saying:
- "Run code maintenance"
- "Maintain the codebase"
- "Audit everything"
- "Run daily maintenance"
- "Check for issues and refactoring opportunities"

## Architecture

### Multi-Agent Swarm System

This skill uses **7 specialized agents** working in parallel, followed by a final integration agent:

```
Phase 1: Initialization
└── Load current state, identify changed files

Phase 2: Parallel Agent Execution (Agents 1-6)
├── Agent 1: Documentation Guardian
├── Agent 2: Issue Tracker Curator
├── Agent 3: Code Quality Sentinel
├── Agent 4: Architecture Enforcer
├── Agent 5: Performance & Security Auditor
└── Agent 6: Refactoring Specialist

Phase 3: Validation & Consolidation
└── Agent 7: Integration Validator

Phase 4: Reporting
└── Generate summary and update ISSUES.md
```

### Agent Responsibilities

#### 🔷 Agent 1: Documentation Guardian
**Mission:** Validate and maintain all documentation

**Checks:**
- Code examples in docs match current patterns
- API documentation matches actual routes
- Internal links are valid
- Terminology is consistent
- New features are documented

**Files Scanned:**
- `/docs/**/*.md`
- `CLAUDE.md`
- `README.md`
- Inline JSDoc comments

---

#### 🔷 Agent 2: Issue Tracker Curator
**Mission:** Maintain ISSUES.md as single source of truth

**Checks:**
- Validate existing issues still exist
- Verify "Fixed" issues are actually fixed
- Scan for common issue patterns
- Find components without tests
- Detect dead code
- Check for missing RLS policies

**Output:** Updates ISSUES.md with new findings

---

#### 🔷 Agent 3: Code Quality Sentinel
**Mission:** Ensure code quality standards

**Checks:**
- Run test suite (identify failures)
- TypeScript compilation errors
- ESLint violations
- Duplicate code blocks
- Code smells (large functions, deep nesting)
- Unused imports
- Missing error boundaries
- Accessibility issues

---

#### 🔷 Agent 4: Architecture Enforcer
**Mission:** Validate architectural patterns

**Checks:**
- API routes use `withAuth` middleware
- Rate limiting configured
- Branded types used for IDs
- Service layer patterns followed
- Zustand store patterns (Immer middleware)
- React component patterns (forwardRef, hooks order)
- Error handling consistency
- File organization

---

#### 🔷 Agent 5: Performance & Security Auditor
**Mission:** Identify security and performance issues

**Checks:**
- Exposed secrets/API keys
- SQL injection risks
- XSS vulnerabilities
- Missing RLS policies
- Authentication/authorization
- N+1 query problems
- Missing database indexes
- React rendering performance
- Bundle size optimization
- Dependency vulnerabilities
- Memory leaks

---

#### 🔷 Agent 6: Refactoring Specialist
**Mission:** Identify improvement opportunities

**Checks:**
- Utility extraction opportunities
- Component decomposition needs
- Custom hook extraction
- Service layer abstractions
- Type system improvements
- Code simplification
- State management improvements
- Missing documentation

---

#### 🔷 Agent 7: Integration Validator (FINAL)
**Mission:** Consolidate findings and update ISSUES.md

**Responsibilities:**
- Collect all findings from agents 1-6
- Deduplicate issues
- Assign final priorities (P0-P3)
- Update ISSUES.md
- Identify quick wins
- Generate executive summary
- Provide actionable next steps

---

## File Structure

```
.claude/skills/code-maintenance/
├── SKILL.md                          # Main skill definition and orchestration
├── README.md                         # This file
├── agents/                           # Agent instruction files
│   ├── documentation-guardian.md
│   ├── issue-tracker-curator.md
│   ├── code-quality-sentinel.md
│   ├── architecture-enforcer.md
│   ├── performance-security-auditor.md
│   ├── refactoring-specialist.md
│   └── integration-validator.md
├── checklists/                       # Reference checklists
│   ├── typescript-quality.md
│   ├── api-security.md
│   ├── react-patterns.md
│   └── testing-standards.md
└── templates/                        # Issue templates
    └── issue-report-template.md
```

## Expected Execution Time

**Total:** 10-15 minutes

- Phase 1: Initialization → 1-2 min
- Phase 2: Parallel Agents → 5-10 min (run in parallel)
- Phase 3: Validation → 2-3 min
- Phase 4: Reporting → 1 min

## Output

### Updated Files
- `ISSUES.md` - Consolidated findings with priorities

### Console Display
```
🔧 Code Maintenance Complete - Integration Validator Report

═══════════════════════════════════════════════════════════════

📊 SCAN RESULTS
───────────────
Total Issues Scanned: 247
Duplicates Removed: 68
New Issues Added: 23
Existing Issues Updated: 12
Regressions Detected: ⚠️  2

📈 PRIORITY BREAKDOWN
─────────────────────
┌──────────┬────────┬───────────┬──────────────┐
│ Priority │ Count  │ Effort    │ Quick Wins   │
├──────────┼────────┼───────────┼──────────────┤
│ P0       │ 4      │ 2 hours   │ 1            │
│ P1       │ 18     │ 8 hours   │ 3            │
│ P2       │ 37     │ 16 hours  │ 5            │
│ P3       │ 14     │ 6 hours   │ 1            │
└──────────┴────────┴───────────┴──────────────┘

🚨 CRITICAL ACTIONS (Must Do Now)
──────────────────────────────────
1. [P0] Add withAuth to upload endpoint (10 min)
2. [P0] Add RLS policies to exports table (20 min)
3. [P1] Fix 3 failing timeline tests (1 hour)

⚡ QUICK WINS (30 min total)
────────────────────────────
• Remove console.logs (7 locations) - 10 min
• Fix unused imports (12 locations) - 5 min
• Update deprecated calls - 15 min

📁 UPDATED FILES
────────────────
✓ ISSUES.md updated with all findings
```

## Priority Levels

### P0 - Critical (Same Day)
- Security vulnerabilities
- Auth bypass
- Data loss risk
- Deployment blockers

### P1 - High (This Week)
- Test failures
- TypeScript errors
- Performance issues
- Regressions

### P2 - Medium (This Sprint)
- Code quality
- Missing tests
- Architecture violations
- Documentation gaps

### P3 - Low (Backlog)
- Refactoring
- Code style
- Minor improvements

## Project-Specific Intelligence

This skill is specifically tailored to:

### Stack
- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **State:** Zustand with Immer
- **Backend:** Supabase (PostgreSQL, Storage, Auth)
- **Testing:** Jest, React Testing Library
- **Deployment:** Vercel

### Architectural Patterns
- Branded types for IDs
- Service layer for business logic
- `withAuth` middleware for API routes
- Row Level Security (RLS) on all tables
- Discriminated unions for error handling
- ForwardRef for reusable components

### Key Features
- Non-linear video timeline editor
- Video/audio generation and processing
- Asset management with cloud storage
- Export queue system
- Real-time collaboration (future)

## Usage Guidelines

### When to Run

**Recommended:**
- Daily (before starting work)
- Before major refactoring
- After adding new features
- Before creating pull requests
- When code quality feels degraded

**Triggers:**
- Test failures appearing
- Documentation feels outdated
- Performance degradation noticed
- Security concerns arise
- After team code reviews

### What Gets Scanned

**Always:**
- All API routes (`app/api/**`)
- All components (`components/**`)
- All hooks (`hooks/**`)
- Service layer (`lib/services/**`)
- Store files (`stores/**`)
- Test files (`__tests__/**`)
- Documentation (`/docs/`, `CLAUDE.md`)
- Supabase migrations

**Excluded:**
- `node_modules/`
- `.next/`
- Build artifacts
- Binary files
- Third-party dependencies

### Performance Optimization

To keep execution under 15 minutes:

1. **Focus on Recent Changes**
   - Prioritize files changed in last 7-14 days
   - Use `git log` to identify recent work

2. **Parallel Execution**
   - Agents 1-6 run in parallel
   - Maximize concurrent Task calls

3. **Smart Pattern Matching**
   - Use Glob/Grep for batch operations
   - Avoid slow iteration over every file

4. **Caching**
   - Cache frequently accessed data
   - Reuse computation across agents

## Customization

### Adding New Checks

To add a new check to an existing agent:

1. Edit the agent file in `agents/`
2. Add new step to "Execution Steps" section
3. Include grep/glob patterns for detection
4. Define output format for findings
5. Update agent summary metrics

### Creating New Agent

To add an 8th agent:

1. Create `agents/new-agent.md`
2. Follow existing agent structure
3. Update `SKILL.md` to include new agent
4. Add to parallel execution in Phase 2
5. Update Integration Validator to handle new findings

### Modifying Priorities

Edit `agents/integration-validator.md`:
- Adjust priority assignment logic in Step 5
- Modify impact score calculation
- Change escalation rules

## Troubleshooting

### Skill Not Activating

**Check:**
- File name is exactly `SKILL.md`
- YAML frontmatter is valid
- Description includes trigger keywords
- Skill directory in `.claude/skills/`

**Fix:**
```bash
# Verify file exists
ls -la .claude/skills/code-maintenance/SKILL.md

# Check YAML syntax
head -20 .claude/skills/code-maintenance/SKILL.md
```

### Agents Failing

**Check:**
- All agent files exist in `agents/`
- Task tool calls have correct paths
- Agent prompts are well-formed

**Debug:**
- Run agents individually (not in parallel)
- Check agent output for errors
- Verify file paths are correct

### ISSUES.md Not Updated

**Check:**
- Integration Validator completed successfully
- No write permission errors
- ISSUES.md format is correct

**Fix:**
- Ensure ISSUES.md exists or can be created
- Check file permissions
- Verify Integration Validator ran (Agent 7)

## Maintenance

### Regular Updates

**Weekly:**
- Review agent effectiveness
- Update patterns based on new code
- Add new checks for new features

**Monthly:**
- Review priority thresholds
- Update effort estimates based on actuals
- Refine deduplication logic

**Quarterly:**
- Major agent refactoring
- Add new agents for new concerns
- Archive old/resolved issue patterns

## Integration with Workflow

### Daily Workflow

```bash
# Morning: Run maintenance
# User: "Run code maintenance"
# → Reviews ISSUES.md
# → Addresses P0 issues immediately
# → Plans day around P1 issues

# During development: Code normally

# Before commit: Quick check
# → Review changes
# → Ensure no new P0/P1 issues

# End of day: Optional re-run
# → Verify fixes resolved issues
# → Update ISSUES.md statuses
```

### Sprint Planning

1. Run code maintenance at sprint start
2. Review ISSUES.md for backlog
3. Prioritize P0 and P1 items
4. Estimate P2 items for sprint
5. Defer P3 to future sprints
6. Complete quick wins for morale

## Success Metrics

This skill is successful when:

- ✅ All findings consolidated in ISSUES.md (no scattered reports)
- ✅ No duplicate issues created
- ✅ Priorities reflect true business impact
- ✅ Critical issues flagged clearly
- ✅ Quick wins identified for momentum
- ✅ Execution completes in <15 minutes
- ✅ User has clear actionable next steps
- ✅ Code quality improves over time

## Support

For issues with this skill:

1. Check this README first
2. Review agent instruction files
3. Examine SKILL.md orchestration logic
4. Test agents individually
5. Report bugs to development team

## Version History

- **v1.0** (2025-10-25) - Initial release with 7 agents
  - Documentation Guardian
  - Issue Tracker Curator
  - Code Quality Sentinel
  - Architecture Enforcer
  - Performance & Security Auditor
  - Refactoring Specialist
  - Integration Validator

## Future Enhancements

**Planned:**
- Agent 8: Dependency Updater (automated npm updates)
- Agent 9: Performance Profiler (runtime analysis)
- Agent 10: API Contract Validator (OpenAPI spec)
- Integration with CI/CD pipeline
- Automated fix generation (not just detection)
- Historical trend analysis
- Team metrics dashboard

---

**Built for:** Non-Linear Video Editor Project
**Last Updated:** 2025-10-25
**Maintained By:** Development Team
