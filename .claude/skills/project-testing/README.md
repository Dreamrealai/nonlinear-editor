# Project Testing Skill

A comprehensive automated testing skill that deploys agent swarms to test production features, monitors Axiom for errors, and recursively fixes issues until production is error-free.

## Overview

This skill automates the entire production testing and fixing workflow:

```
Launch Skill → Agent Swarm Tests → Monitor Axiom → Find Errors → Fix Code →
Deploy → Re-test → Verify Zero Errors → Report Results
```

## Architecture

### Agent Swarm Design

**Sequential Agents** (must run in order):

- **Agent 1: Authentication** - Tests login, session management
- **Agent 2: Asset Upload** - Tests file upload, thumbnails, storage

**Parallel Agents** (run concurrently):

- **Agent 3: Timeline** - Tests multi-track timeline features
- **Agent 4: Editing** - Tests clip editing, transitions, effects
- **Agent 5: Playback** - Tests video playback engine
- **Agent 6: State Management** - Tests undo/redo, autosave
- **Agent 7: AI Assistant** - Tests Gemini integration

### Technology Stack

- **Chrome DevTools MCP** - Browser automation and testing
- **Axiom MCP** - Production log monitoring and querying
- **Vercel CLI** - Deployment verification and logs
- **Git** - Automated commit and push workflow
- **Task Tool** - Parallel and sequential agent orchestration

## Testing Methodology

### Phase 1: Sequential Testing (Foundation)

1. **Authentication Flow**
   - Navigate to /login
   - Fill credentials
   - Verify session creation
   - Check console/network errors

2. **Asset Management**
   - Create new project
   - Upload video/audio/image
   - Verify thumbnail generation
   - Validate signed URLs

### Phase 2: Parallel Testing (Features)

3-7. All feature tests run simultaneously:

- Timeline operations
- Editing tools
- Playback functionality
- State management
- AI assistant

### Phase 3: Error Analysis

**Axiom Queries:**

```apl
// Get all errors in last 10 minutes
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['level'] == "error"
| summarize count() by ['message'], ['source']
```

**Error Categorization:**

- **P0**: Critical - blocks core functionality
- **P1**: High - major features broken
- **P2**: Medium - minor features broken
- **P3**: Low - UI glitches, warnings

### Phase 4: Recursive Fixing

```
while (errors_exist && iterations < 5):
    1. Analyze error root cause
    2. Identify files to fix
    3. Apply fix
    4. Build locally
    5. Commit and push
    6. Wait for Vercel deployment
    7. Re-run affected tests
    8. Check Axiom for new errors

    if no_errors_for_2_minutes:
        break
```

## Chrome DevTools MCP Integration

### Key Tools Used

**Navigation:**

- `mcp__chrome_devtools__navigate_page` - Navigate to URLs
- `mcp__chrome_devtools__navigate_page_history` - Back/forward

**Interaction:**

- `mcp__chrome_devtools__click` - Click elements
- `mcp__chrome_devtools__fill_form` - Fill form fields
- `mcp__chrome_devtools__drag` - Drag and drop
- `mcp__chrome_devtools__hover` - Hover interactions

**Verification:**

- `mcp__chrome_devtools__take_snapshot` - Get page structure
- `mcp__chrome_devtools__take_screenshot` - Visual verification
- `mcp__chrome_devtools__wait_for` - Wait for text/elements

**Monitoring:**

- `mcp__chrome_devtools__list_console_messages` - Console errors
- `mcp__chrome_devtools__list_network_requests` - Network activity
- `mcp__chrome_devtools__performance_start_trace` - Performance metrics

**Evaluation:**

- `mcp__chrome_devtools__evaluate_script` - Run JavaScript

## Axiom MCP Integration

### Key Queries

**Error Detection:**

```apl
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['level'] == "error"
| project ['_time'], ['message'], ['error'], ['stack']
| order by ['_time'] desc
```

**Category Analysis:**

```apl
// Auth errors
| where ['message'] contains "auth" or ['message'] contains "login"

// Asset errors
| where ['message'] contains "asset" or ['message'] contains "upload"

// Timeline errors
| where ['message'] contains "timeline" or ['message'] contains "clip"

// Playback errors
| where ['message'] contains "playback" or ['message'] contains "video"
```

**Trend Analysis:**

```apl
| summarize error_count=count() by bin(['_time'], 5m), ['category']
| render timechart
```

## Workflow Integration

### Git Workflow (per CLAUDE.md)

After each fix iteration:

```bash
# 1. Build
npm run build

# 2. Commit
git add .
git commit -m "Fix: [error description] - iteration N"

# 3. Push
git push
```

### Vercel Integration

```bash
# Check deployment status
vercel ls --yes | head -10

# Get deployment logs
vercel logs [deployment-url]

# Wait for deployment
sleep 60 && vercel ls --yes | head -2
```

### ISSUES.md Updates

All fixes are tracked in `/ISSUES.md`:

```markdown
### Issue #X: [Error description]

- **Status:** Fixed
- **Priority:** P0/P1/P2/P3
- **Location:** [file:line]
- **Reported:** [Date from Axiom]
- **Fixed:** [Date]
- **Fix Iteration:** [N]
- **Commit:** [hash]
- **Description:** [Details]
```

## Performance Optimization

### Parallel Execution

**Before:** ~15 minutes (sequential)

```
Auth → Assets → Timeline → Editing → Playback → State → AI
```

**After:** ~5 minutes (parallel)

```
Auth → Assets → [Timeline, Editing, Playback, State, AI]
```

### Incremental Testing

Only re-test affected features:

```python
if error.category == "timeline":
    rerun_agents = [Agent3]  # Timeline only
elif error.category == "auth":
    rerun_agents = [Agent1, Agent2]  # Auth + dependent tests
else:
    rerun_agents = all_agents  # Full re-test
```

### Axiom Query Optimization

Use time windows and aggregation:

```apl
// Instead of: get all errors
['nonlinear-editor'] | where ['level'] == "error"

// Use: time-bounded aggregation
['nonlinear-editor']
| where ['_time'] > ago(5m)
| where ['level'] == "error"
| summarize count() by ['message']
| take 10
```

## Error Patterns and Fixes

### Common P0 Errors

**1. Authentication Session Timeout**

```typescript
// Error: Session expired, user logged out
// Fix: Extend session timeout, add refresh token
```

**2. Asset Upload Fails**

```typescript
// Error: Supabase storage bucket not accessible
// Fix: Verify RLS policies, check CORS settings
```

**3. Database Connection Lost**

```typescript
// Error: Supabase client initialization failed
// Fix: Verify environment variables, check Supabase status
```

### Common P1 Errors

**1. Timeline Not Rendering**

```typescript
// Error: Canvas context lost
// Fix: Add context restoration handler
```

**2. Playback Fails**

```typescript
// Error: Video element cannot play
// Fix: Check signed URL expiration, verify CORS headers
```

**3. Undo/Redo Broken**

```typescript
// Error: Zustand history middleware not initializing
// Fix: Verify store setup, check Immer middleware
```

## Limitations and Constraints

### Technical Limitations

1. **Chrome DevTools MCP**
   - Cannot interact with canvas elements directly
   - May timeout on slow networks
   - Limited to visible viewport

2. **Axiom MCP**
   - Query results limited by time range
   - May miss errors during query execution
   - Rate limits on query frequency

3. **Vercel Deployment**
   - 2-minute deployment time
   - Rate limits on deployment frequency
   - May fail due to external factors

### Operational Constraints

1. **Max Iterations:** 5 (prevents infinite loops)
2. **Test Duration:** ~5-30 minutes total
3. **Error Detection:** Only errors logged to Axiom
4. **Fix Success Rate:** ~80-90% automated, rest manual

## Monitoring and Metrics

### Success Metrics

- **Test Coverage:** % of features tested
- **Error Detection Rate:** Errors found / Total errors
- **Fix Success Rate:** Errors fixed / Errors found
- **Time to Zero Errors:** Total duration
- **Deployment Success:** Successful deploys / Total attempts

### Reporting

Full report includes:

1. **Test Results** - Pass/fail for each feature
2. **Error Analysis** - Breakdown by category and severity
3. **Fixes Applied** - Code changes with commits
4. **Performance Metrics** - Duration, iterations, success rate
5. **Screenshots** - Visual verification of production state
6. **Recommendations** - Next steps and improvements

## Future Enhancements

### Planned Features

- [ ] Visual regression testing (screenshot comparison)
- [ ] Performance budget enforcement (Core Web Vitals)
- [ ] Automated rollback on critical failures
- [ ] Slack/email notifications for test results
- [ ] Historical trend analysis (error rates over time)
- [ ] Multi-browser testing (Safari, Firefox)
- [ ] Mobile device testing
- [ ] Load testing with concurrent users

### Improvements

- [ ] Faster agent execution with caching
- [ ] Smarter error categorization with ML
- [ ] Better root cause analysis
- [ ] Pre-deployment smoke tests
- [ ] Integration with CI/CD pipeline

## Contributing

To improve this skill:

1. Test with production deployment
2. Document any edge cases or failures
3. Add new test scenarios for uncovered features
4. Optimize agent prompts for better results
5. Update SKILL.md with findings

## Support

**Issues:**

- Check Axiom logs for detailed error traces
- Review Chrome DevTools console in browser
- Examine Vercel deployment logs
- Consult ISSUES.md for known problems

**Resources:**

- [Chrome DevTools MCP Docs](https://github.com/modelcontextprotocol/servers/tree/main/src/chrome-devtools)
- [Axiom MCP Docs](https://github.com/axiomhq/mcp-server-axiom)
- [Vercel CLI Docs](https://vercel.com/docs/cli)
- [Project Documentation](/docs/)

## License

MIT - Same as project license

---

**Version:** 1.0.0
**Last Updated:** 2025-10-25
**Maintainer:** Project Team
