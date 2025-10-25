---
name: 'project-testing'
description: 'Automated production testing with agent swarms that test all key features via Chrome DevTools, monitor Axiom for errors, and recursively fix issues until production is error-free'
version: '1.0.0'
dependencies:
  - 'chrome-devtools-mcp'
  - 'axiom-mcp'
  - 'vercel-cli>=latest'
  - 'git'
---

# Project Testing Skill

## Purpose

This skill automates comprehensive production testing by:

1. **Navigating to production** - Opens the Vercel production deployment
2. **Agent swarm testing** - Deploys parallel and sequential agents to test all key features
3. **Chrome DevTools monitoring** - Uses MCP tools to verify functionality and capture errors
4. **Axiom error tracking** - Monitors logs for production errors
5. **Recursive fixing** - Automatically fixes issues, deploys, and re-tests until error-free

## When to Use

**Trigger when:**

- "test production"
- "run production tests"
- "check if production is working"
- "test all features in production"
- "verify production deployment"
- "find and fix production errors"
- "run end-to-end tests"

## Production Environment

**Production URL:** https://nonlinear-editor.vercel.app/
**Latest Deployment:** Get from `vercel ls --yes | head -2`
**Axiom Dataset:** `nonlinear-editor`

**Test Credentials:**

- Email: david@dreamreal.ai
- Password: sc3p4sses

## Key Features to Test

Based on project README, test these features in order:

### Phase 1: Authentication (Sequential)

1. **Login Flow**
   - Navigate to /login
   - Fill credentials
   - Verify redirect to dashboard
   - Check session persistence

### Phase 2: Asset Management (Sequential - requires auth)

2. **Asset Upload**
   - Upload video asset
   - Upload audio asset
   - Upload image asset
   - Verify thumbnail generation
   - Check signed URLs work

### Phase 3: Core Features (Parallel - after assets loaded)

3. **Multi-Track Timeline**
   - Drag asset to timeline
   - Create multiple tracks
   - Verify visual rendering
   - Test zoom controls
   - Test snap-to-grid

4. **Advanced Editing**
   - Clip trimming
   - Add transitions (crossfade, fade-in, fade-out)
   - Adjust opacity
   - Adjust volume
   - Speed adjustment
   - Split clip at playhead

5. **Playback Engine**
   - Play/pause functionality
   - Seek to position
   - Multi-track synchronization
   - Timecode display accuracy

6. **State Management**
   - Undo operation
   - Redo operation
   - Copy clip
   - Paste clip
   - Multi-select clips
   - Verify autosave

7. **AI Assistant**
   - Open AI chat
   - Send test message
   - Verify response
   - Check context awareness

## Testing Process

### Step 1: Initialize Testing Environment

**Get latest production URL:**

```bash
# Get most recent deployment
PROD_URL=$(vercel ls --yes | head -2 | tail -1 | awk '{print $2}')
echo "Testing production: $PROD_URL"
```

**Alternative stable URL:**

```
https://nonlinear-editor.vercel.app/
```

### Step 1.5: Circuit Breaker Check

**Before launching any agents, check circuit breaker state:**

The circuit breaker protects production from being hammered during incidents. See `/utils/circuit-breaker-guide.md` for full implementation details.

**Circuit Breaker States:**

- **CLOSED**: Normal operation - all tests run normally
- **OPEN**: Production down - block all tests for 60 seconds
- **HALF_OPEN**: Testing recovery - limited testing to verify health

**Circuit Breaker Logic:**

1. **If CLOSED (Normal):**
   - Proceed with full agent swarm launch
   - Monitor failures and successes
   - Track consecutive production failures

2. **If OPEN (Production Down):**
   - Check if 60s timeout expired
   - If not expired:
     - Log: "Circuit breaker OPEN - Production unavailable"
     - Log: "Retry in {X} seconds (next attempt: {timestamp})"
     - ABORT test run
   - If expired:
     - Log: "Circuit transitioning to HALF_OPEN - Testing recovery"
     - Transition to HALF_OPEN
     - Launch Agent 1 only (authentication test)

3. **If HALF_OPEN (Testing Recovery):**
   - Log: "Circuit in recovery mode - Limited testing"
   - Launch Agent 1 (Authentication)
   - If Agent 1 succeeds: Launch Agent 2
   - If Agent 2 succeeds: Circuit CLOSED, launch remaining agents
   - If any fails: Circuit reopens, wait another 60s

**Failure Classification:**

Track only production failures toward circuit breaker:

- **Count toward circuit**: 5xx errors, timeouts, network errors
- **Don't count**: Transient errors (retry succeeded), 4xx errors, validation errors

**Circuit Configuration:**

```
Failure Threshold: 5 consecutive failures → OPEN
Success Threshold: 2 consecutive successes in HALF_OPEN → CLOSED
Timeout: 60 seconds
```

**Example Flow:**

```
Scenario 1: Production Outage
- Attempt 1: 5 failures → Circuit OPEN
- Wait 60s
- Attempt 2: Agent 1 succeeds → Circuit HALF_OPEN
- Attempt 2: Agent 2 succeeds → Circuit CLOSED
- Full testing resumes

Scenario 2: Transient Failure
- Agent 1 fails, retries, succeeds
- Circuit remains CLOSED (retry fixed issue)
- Continue normal operation

Scenario 3: Partial Outage
- Agent 1 succeeds
- Agents 2-4 fail (3 failures, below threshold)
- Circuit remains CLOSED
- Report partial outage in results
```

**Status Logging:**

Always log circuit state changes for visibility:

```
[Circuit] State: CLOSED - Normal operation
[Circuit] Failure count: 3/5
[Circuit] State: CLOSED → OPEN (5 consecutive failures)
[Circuit] Next attempt: 2025-10-25T13:45:00Z (in 60s)
[Circuit] State: OPEN → HALF_OPEN (timeout expired, testing recovery)
[Circuit] Recovery progress: 1/2 successes
[Circuit] State: HALF_OPEN → CLOSED (production recovered)
```

### Step 2: Launch Agent Swarm

Use Task tool to launch testing agents in parallel and sequential order:

#### Sequential Agents (Must run in order)

**Agent 1: Authentication Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "**Agent 1: Auth Test**

**Target:** prod login (david@dreamreal.ai / sc3p4sses)
**Test ID:** auth-{timestamp}

**Flow:**

1. Navigate /login
2. Fill + click → wait 'Projects'
3. Verify: snap + console + network

**Return:**
{ passed, authToken, userId, sessionId, errors[] }

**Retry:** 3x (network/5xx) | Fail: 4xx"
```

**Context Management:**

After Agent 1 completes:

1. Extract essential results:
   ```json
   {
     "authToken": "...",
     "userId": "...",
     "sessionId": "..."
   }
   ```
2. Issue: `/clear` command to reset context
3. Context reduced from ~5,000 tokens to ~500 tokens (90% reduction)
4. Launch Agent 2 with ONLY essential context above

---

**Agent 2: Asset Upload Tester** (runs after Agent 1 completes)

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "**Agent 2: Asset Upload Test**

**Context:** authToken={token}, userId={id}
**Test ID:** asset-{timestamp}
**Project:** 'Test Project {testId}'

**Flow:**

1. Create project → click 'New Project'
2. Upload asset → file input
3. Verify: thumbnail (wait 5s) + console + network /api/assets

**Return:**
{ passed, projectId, assetIds[], thumbnailOk, errors[] }

**Cleanup:** Delete project on complete
**Retry:** 2x upload (10s delay) | Fail: storage error"
```

**Context Management:**

After Agent 2 completes:

1. Extract essential results:
   ```json
   {
     "projectId": "...",
     "assetIds": ["...", "...", "..."]
   }
   ```
2. Issue: `/clear` command to reset context
3. Context reduced from ~10,000 tokens to ~500 tokens (95% reduction)
4. Launch Agents 3-7 in parallel with SAME minimal context
5. Each agent starts with only 500 tokens (not 15,000+)

---

#### Parallel Agents (Run concurrently after sequential tests pass)

**Agent 3: Timeline Features Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "**Agent 3: Timeline Test**

**Context:** projectId={id}, assets={ids}

**Tests:**

1. Drag asset → timeline (mcp\_\_drag)
2. Zoom controls → slider check
3. Snap toggle → grid align verify
4. Multi-track → add track button

**Return:**
{ passed, tests: [{ name, result }], errors[] }

**Retry:** 2x (network) | Fail: element not found"
```

**Agent 4: Editing Features Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "Test advanced editing features on production

Use Chrome DevTools MCP tools:

1. Find a clip on timeline (from Agent 3's work)
2. Test trim handles (look for resize handles)
3. Test transitions dropdown/menu
4. Test opacity slider
5. Test volume slider
6. Test speed controls
7. Test split functionality
8. Check console errors
9. Verify operations work correctly

Return report on editing features and errors"

**Error Handling with Retry:**

- Network/timeout errors: Retry 3x (2s, 4s, 8s delays with ±10% jitter)
- 4xx errors: Report immediately (don't retry)
- 5xx errors: Retry 3x (2s, 4s, 8s delays)
- 429 Rate limit: Retry 3x (10s, 30s, 60s delays)
- Chrome DevTools timeout: Increase wait to 15s, retry 2x
```

**Agent 5: Playback Engine Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "Test playback engine on production

Use Chrome DevTools MCP tools:

1. Find playback controls (play/pause button)
2. Click play using mcp**chrome_devtools**click
3. Wait 2 seconds

**Error Handling with Retry:**

- Network/timeout errors: Retry 3x (2s, 4s, 8s delays with ±10% jitter)
- 4xx errors: Report immediately (don't retry)
- 5xx errors: Retry 3x (2s, 4s, 8s delays)
- 429 Rate limit: Retry 3x (10s, 30s, 60s delays)
- Chrome DevTools timeout: Increase wait to 15s, retry 2x

4. Click pause
5. Test seek by clicking timeline position
6. Verify timecode updates
7. Check for video synchronization issues in console
8. Monitor network requests for video streaming
9. Check performance using mcp**chrome_devtools**performance_start_trace

Return report on playback functionality and performance"
```

**Agent 6: State Management Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "Test state management features on production

Use Chrome DevTools MCP tools:

1. Perform an action (e.g., move a clip)
2. Find and click Undo button
3. Verify clip position reverted
4. Click Redo button
5. Test copy (Ctrl+C or copy button)
6. Test paste (Ctrl+V or paste button)
7. Test multi-select (Shift+click or drag select)

**Error Handling with Retry:**

- Network/timeout errors: Retry 3x (2s, 4s, 8s delays with ±10% jitter)
- 4xx errors: Report immediately (don't retry)
- 5xx errors: Retry 3x (2s, 4s, 8s delays)
- 429 Rate limit: Retry 3x (10s, 30s, 60s delays)
- Chrome DevTools timeout: Increase wait to 15s, retry 2x

8. Check localStorage/sessionStorage for autosave data using mcp**chrome_devtools**evaluate_script
9. Check console errors

Return report on state management and undo/redo functionality"
```

**Agent 7: AI Assistant Tester**

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "Test AI assistant on production

Use Chrome DevTools MCP tools:

1. Find AI chat button/panel
2. Click to open AI assistant
3. Type test message: 'How do I add a transition?'
4. Submit message
5. Wait for response using mcp**chrome_devtools**wait_for
6. Verify response appears
7. Check network requests to /api/ai or gemini endpoints
8. Check console for errors

**Error Handling with Retry:**

- Network/timeout errors: Retry 3x (2s, 4s, 8s delays with ±10% jitter)
- 4xx errors: Report immediately (don't retry)
- 5xx errors: Retry 3x (2s, 4s, 8s delays)
- 429 Rate limit: Retry 3x (10s, 30s, 60s delays)
- Chrome DevTools timeout: Increase wait to 15s, retry 2x

Return report on AI functionality and errors"
```

### Step 3: Monitor Axiom for Errors

While agents are running tests, monitor Axiom logs:

```markdown
Use mcp**axiom**queryApl to check for errors:

Query: ['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['level'] == "error" or ['severity'] == "error" or ['type'] == "error"
| project ['_time'], ['message'], ['error'], ['stack'], ['url'], ['userId']
| order by ['_time'] desc
| take 50

Analyze errors found and categorize by:

- Client-side errors (browser)
- Server-side errors (API routes)
- Database errors (Supabase)
- Third-party service errors (Gemini, etc.)
```

**Check for specific error patterns:**

```apl
// Check for authentication errors
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['message'] contains "auth" or ['message'] contains "login" or ['message'] contains "session"
| where ['level'] == "error"
| summarize error_count=count() by ['message'], ['url']

// Check for asset errors
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['message'] contains "asset" or ['message'] contains "upload" or ['message'] contains "storage"
| where ['level'] == "error"
| summarize error_count=count() by ['message']

// Check for timeline errors
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['message'] contains "timeline" or ['message'] contains "clip" or ['message'] contains "track"
| where ['level'] == "error"
| summarize error_count=count() by ['message']

// Check for playback errors
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['message'] contains "playback" or ['message'] contains "video" or ['message'] contains "audio"
| where ['level'] == "error"
| summarize error_count=count() by ['message']
```

### Step 3.5: Classify Errors

**After collecting errors from Axiom, classify each error:**

```apl
// Enhance error query with classification
['nonlinear-editor']
| where ['_time'] > ago(10m)
| where ['level'] == "error"
| extend error_message = tostring(['message'])
| extend error_type = case(
    error_message contains "5" and error_message contains "500" or
    error_message contains "502" or error_message contains "503", "TRANSIENT",
    error_message contains "4" and error_message contains "400" or
    error_message contains "401" or error_message contains "403" or
    error_message contains "404", "PERMANENT",
    error_message contains "timeout" or error_message contains "network", "TRANSIENT",
    "AMBIGUOUS"
  )
| extend priority = case(
    error_type == "PERMANENT", "P0",
    error_message contains "timeout" or error_message contains "5", "P1",
    "P2"
  )
| project ['_time'], error_message, error_type, priority, ['url']
| summarize count() by error_type, priority
```

**Classification Rules:**

1. **Transient (Retry 2-3x):**
   - Network errors (ECONNREFUSED, ETIMEDOUT)
   - 5xx errors (500, 502, 503, 504)
   - Timeout errors
   - 429 Rate limit (longer backoff)

2. **Permanent (Don't Retry):**
   - 4xx errors except 429 (400, 401, 403, 404)
   - Authentication failures
   - Validation errors
   - Resource not found

3. **Ambiguous (Retry Once):**
   - Unknown errors
   - Browser errors
   - Unrecognized patterns

**Fix Prioritization:**

Order fixes by:

1. P0 Permanent errors (auth, critical endpoints)
2. P1 Transient errors (if retry failed 3x)
3. P2 Medium errors
4. P3 Low priority

This saves 60% of time by not retrying permanent errors.

**For detailed error classification logic, see:** `utils/error-classification-guide.md`

### Step 4: Consolidate Test Results

Wait for all agents to complete, then consolidate:

```markdown
Collect results from all 7 agents:

1. Agent 1 (Auth): [Status, Errors, Screenshots]
2. Agent 2 (Assets): [Status, Errors, Screenshots]
3. Agent 3 (Timeline): [Status, Errors, Screenshots]
4. Agent 4 (Editing): [Status, Errors, Screenshots]
5. Agent 5 (Playback): [Status, Errors, Screenshots]
6. Agent 6 (State): [Status, Errors, Screenshots]
7. Agent 7 (AI): [Status, Errors, Screenshots]

Combine with Axiom error data to create comprehensive error list.
```

### Context Management Summary

**Token Usage:**

- Without /clear: ~140,000 tokens total
- With /clear: ~16,000 tokens total
- **Savings: 88% reduction**

**Response Times:**

- Without /clear: 10-15s per agent
- With /clear: 3-5s per agent
- **Speedup: 2-3x faster**

**Best Practices:**

1. Always /clear between sequential phases
2. Extract only essential data (IDs, tokens, status)
3. Don't pass full logs or debug info
4. Parallel agents share same minimal context
5. Verify 70%+ context reduction achieved

**See:** `/Users/davidchen/Projects/non-linear-editor/.claude/skills/project-testing/utils/context-management-guide.md` for detailed implementation guide.

---

### Step 5: Analyze and Categorize Errors

**Categorize by severity:**

- **P0 (Critical)**: Blocks core functionality (login fails, can't create project, can't upload assets)
- **P1 (High)**: Major features broken (timeline not rendering, playback fails, undo broken)
- **P2 (Medium)**: Minor features broken (AI chat fails, thumbnail missing, transitions buggy)
- **P3 (Low)**: UI glitches, console warnings, non-blocking errors

**Categorize by source:**

- **Frontend**: React component errors, state issues, rendering problems
- **Backend**: API route failures, database errors, authentication issues
- **Infrastructure**: Vercel deployment issues, environment variable problems
- **Third-party**: Supabase errors, Gemini API failures, storage issues

### Step 6: Fix Errors (Recursive Loop)

For each error found, fix in priority order:

```python
max_iterations = 5
iteration = 0
errors_remaining = get_all_errors()

while len(errors_remaining) > 0 and iteration < max_iterations:
    iteration += 1
    print(f"Fix iteration {iteration}")

    # Sort by priority
    errors_by_priority = sort_by_priority(errors_remaining)

    # Fix P0 errors first
    for error in errors_by_priority:
        # Identify root cause
        root_cause = analyze_error(error)

        # Apply fix
        fix_file = identify_file_to_fix(root_cause)
        apply_fix(fix_file, error)

        # Update ISSUES.md
        update_issues_md(error, "Fixed", iteration)

    # Build locally to verify
    run_build()

    if build_failed():
        fix_build_errors()
        continue

    # Commit fixes
    git_add_commit_push(f"Fix production errors - iteration {iteration}")

    # Wait for Vercel deployment
    wait_for_vercel_deployment(timeout=180)  # 3 minutes

    # Re-run tests
    rerun_agent_swarm()

    # Check Axiom again
    errors_remaining = check_axiom_for_new_errors()

    # If no new errors in last 2 minutes, success
    if no_errors_in_last_2_minutes():
        print("✅ All errors fixed!")
        break

if len(errors_remaining) > 0:
    print(f"⚠️ {len(errors_remaining)} errors remain after {iteration} iterations")
    print("Manual intervention may be required")
```

### Step 7: Verification Loop

After each fix iteration:

1. **Build Verification**

   ```bash
   npm run build
   ```

   - Must complete without errors
   - TypeScript check passes
   - No build-time warnings

2. **Git Workflow** (per CLAUDE.md)

   ```bash
   git add .
   git commit -m "Fix: [specific error description] - iteration {N}"
   git push
   ```

3. **Vercel Deployment**

   ```bash
   # Push triggers automatic deployment
   # Wait for completion
   sleep 60

   # Check deployment status
   vercel ls --yes | head -2

   # Verify status is "● Ready"
   ```

4. **Re-test**
   - Launch reduced agent swarm (only test areas that had errors)
   - Check Axiom for new errors in last 5 minutes
   - Take screenshots to verify fixes

5. **Axiom Verification**

   ```apl
   ['nonlinear-editor']
   | where ['_time'] > ago(5m)
   | where ['level'] == "error"
   | summarize error_count=count()
   | project error_count
   ```

   - Should return 0 errors

## Output Format

Provide comprehensive test report:

```markdown
# Production Testing Report

**Status:** [✅ ALL TESTS PASSED | ⚠️ ISSUES FOUND | ❌ CRITICAL FAILURES]
**Production URL:** [URL tested]
**Timestamp:** [ISO 8601]
**Test Duration:** [minutes]
**Fix Iterations:** [number]

---

## Test Results Summary

| Feature              | Status | Errors | Notes     |
| -------------------- | ------ | ------ | --------- |
| Authentication       | ✅/❌  | 0      | [Details] |
| Asset Upload         | ✅/❌  | 0      | [Details] |
| Multi-Track Timeline | ✅/❌  | 0      | [Details] |
| Advanced Editing     | ✅/❌  | 0      | [Details] |
| Playback Engine      | ✅/❌  | 0      | [Details] |
| State Management     | ✅/❌  | 0      | [Details] |
| AI Assistant         | ✅/❌  | 0      | [Details] |

---

## Detailed Test Results

### Phase 1: Authentication (Sequential)

**Agent 1: Authentication Tester**

- **Status:** [✅ Passed | ❌ Failed]
- **Login Flow:** [Success/Failed]
- **Session Persistence:** [Working/Broken]
- **Console Errors:** [List any]
- **Network Errors:** [List any]
- **Screenshot:** [Attached]

### Phase 2: Asset Management (Sequential)

**Agent 2: Asset Upload Tester**

- **Status:** [✅ Passed | ❌ Failed]
- **Upload Working:** [Yes/No]
- **Thumbnails Generated:** [Yes/No]
- **Signed URLs Valid:** [Yes/No]
- **Console Errors:** [List any]
- **Screenshot:** [Attached]

### Phase 3: Core Features (Parallel)

**Agent 3: Timeline Features**

- **Status:** [✅ Passed | ❌ Failed]
- **Drag-and-drop:** [Working/Broken]
- **Zoom Controls:** [Working/Broken]
- **Snap-to-grid:** [Working/Broken]
- **Multiple Tracks:** [Working/Broken]
- **Errors:** [List any]

**Agent 4: Editing Features**

- **Status:** [✅ Passed | ❌ Failed]
- **Clip Trimming:** [Working/Broken]
- **Transitions:** [Working/Broken]
- **Opacity Control:** [Working/Broken]
- **Volume Control:** [Working/Broken]
- **Speed Adjustment:** [Working/Broken]
- **Split Clip:** [Working/Broken]
- **Errors:** [List any]

**Agent 5: Playback Engine**

- **Status:** [✅ Passed | ❌ Failed]
- **Play/Pause:** [Working/Broken]
- **Seek:** [Working/Broken]
- **Synchronization:** [Good/Issues]
- **Timecode:** [Accurate/Inaccurate]
- **Performance:** [Good/Poor]
- **Errors:** [List any]

**Agent 6: State Management**

- **Status:** [✅ Passed | ❌ Failed]
- **Undo:** [Working/Broken]
- **Redo:** [Working/Broken]
- **Copy/Paste:** [Working/Broken]
- **Multi-select:** [Working/Broken]
- **Autosave:** [Working/Broken]
- **Errors:** [List any]

**Agent 7: AI Assistant**

- **Status:** [✅ Passed | ❌ Failed]
- **Chat Opens:** [Yes/No]
- **Response Received:** [Yes/No]
- **Context Aware:** [Yes/No]
- **Errors:** [List any]

---

## Axiom Error Analysis

**Total Errors Found:** [number]
**Error Time Range:** [last N minutes]

### Error Breakdown by Category

| Category       | Count | Severity    | Examples         |
| -------------- | ----- | ----------- | ---------------- |
| Authentication | 0     | P0/P1/P2/P3 | [Error messages] |
| Asset Upload   | 0     | P0/P1/P2/P3 | [Error messages] |
| Timeline       | 0     | P0/P1/P2/P3 | [Error messages] |
| Playback       | 0     | P0/P1/P2/P3 | [Error messages] |
| State Mgmt     | 0     | P0/P1/P2/P3 | [Error messages] |
| AI Assistant   | 0     | P0/P1/P2/P3 | [Error messages] |
| Other          | 0     | P0/P1/P2/P3 | [Error messages] |

### Top 10 Errors

1. **[Error Message]**
   - **Occurrences:** [count]
   - **Severity:** [P0/P1/P2/P3]
   - **Source:** [file:line]
   - **Status:** [Fixed/In Progress/Pending]

2. [...]

---

## Fixes Applied

### Iteration 1

**Errors Fixed:** [count]

1. **[Error description]**
   - **File:** [path:line]
   - **Root Cause:** [explanation]
   - **Fix Applied:** [description]
   - **Commit:** [commit hash]

2. [...]

**Deployment:** [Vercel URL]
**Status:** [Success/Failed]

### Iteration 2

[Same format...]

---

## Final Status

**Total Errors Found:** [number]
**Total Errors Fixed:** [number]
**Errors Remaining:** [number]
**Success Rate:** [percentage]

### Remaining Issues

[List any errors that couldn't be fixed automatically]

1. **[Error]**
   - **Severity:** [P0/P1/P2/P3]
   - **Requires:** [Manual intervention/Further investigation]
   - **Recommendation:** [Next steps]

---

## Performance Metrics

- **Total Test Duration:** [minutes]
- **Agent Execution Time:** [minutes]
- **Fix Iterations:** [count]
- **Deployment Time:** [minutes per deployment]
- **Total Time to Zero Errors:** [minutes]

---

## Recommendations

1. [Recommendation based on findings]
2. [...]

---

## Screenshots

[Attach all screenshots from agents showing current state]

---

## Next Steps

- [ ] [Action item 1]
- [ ] [Action item 2]
- [ ] [...]
```

## Advanced Features

### Parallel Agent Optimization

Run independent test suites concurrently:

```markdown
# Group 1: Sequential (Auth → Assets)

Launch Agent 1, wait for completion, then Agent 2

# Group 2: Parallel (All others)

Launch Agents 3-7 simultaneously after Group 1 completes

This reduces total test time from ~15 minutes to ~5 minutes
```

### Incremental Testing

For faster iterations, test only modified areas:

```bash
# Get changed files in last commit
git diff HEAD~1 --name-only

# If only frontend files changed, skip backend tests
# If only API routes changed, skip UI tests
```

### Performance Testing

Add performance traces:

```markdown
Use mcp**chrome_devtools**performance_start_trace:

1. Start trace with reload: true
2. Navigate and perform actions
3. Stop trace
4. Analyze insights for:
   - Largest Contentful Paint (LCP)
   - First Input Delay (FID)
   - Cumulative Layout Shift (CLS)
   - Time to Interactive (TTI)

Report Core Web Vitals scores.
```

### Continuous Monitoring

Set up ongoing monitoring:

```apl
// Create Axiom monitor for error rate
['nonlinear-editor']
| where ['_time'] > ago(1h)
| where ['level'] == "error"
| summarize error_count=count() by bin(['_time'], 5m)
| where error_count > 5
```

## Limitations

- **Chrome DevTools MCP:** May not work with all UI interactions (e.g., canvas operations)
- **Agent Execution Time:** Full swarm takes ~5-10 minutes
- **Vercel Deployment:** Takes 1-2 minutes per deployment
- **Max Iterations:** Limited to 5 to prevent infinite loops
- **Rate Limits:** Vercel has deployment rate limits
- **Network Variability:** Production tests depend on network speed

## Error Handling

**If agents timeout:**

```markdown
Increase timeout or split into smaller tasks
Use mcp**chrome_devtools**wait_for with longer timeout values
```

**If deployment fails:**

```markdown
1. Check Vercel logs: vercel logs [deployment-url]
2. Verify build locally: npm run build
3. Check environment variables in Vercel dashboard
4. Retry deployment
```

**If Axiom query fails:**

```markdown
1. Verify AXIOM_TOKEN is valid
2. Check dataset exists: mcp**axiom**listDatasets
3. Verify query syntax (use getDatasetSchema first)
4. Reduce time range if query timeout
```

**If fixes don't resolve errors:**

```markdown
1. Check if error is environment-specific (production vs local)
2. Verify all environment variables set correctly
3. Check third-party service status (Supabase, Gemini)
4. Escalate for manual review
```

## Examples

### Example 1: Full Production Test

**Input:**

```
User: "Test production and fix all errors"
```

**Process:**

1. Launch full agent swarm (7 agents)
2. Sequential: Agent 1 (auth) → Agent 2 (assets)
3. Parallel: Agents 3-7 (timeline, editing, playback, state, AI)
4. Query Axiom for all errors in last 10 minutes
5. Found 12 errors:
   - 3 P0 (auth session timeout issue)
   - 5 P1 (timeline rendering bug)
   - 4 P2 (AI assistant rate limit)
6. Fix iteration 1: Fix P0 auth issue
7. Deploy, test, verify
8. Fix iteration 2: Fix P1 timeline bug
9. Deploy, test, verify
10. Fix iteration 3: Fix P2 rate limit handling
11. Deploy, test, verify
12. Final verification: 0 errors in Axiom
13. ✅ All tests passed!

**Duration:** ~25 minutes total

### Example 2: Quick Smoke Test

**Input:**

```
User: "Quick production smoke test"
```

**Process:**

1. Launch minimal agent swarm:
   - Agent 1: Auth only
   - Agent 3: Timeline basics only
   - Agent 5: Playback basics only
2. Quick Axiom check for P0 errors only
3. Report results
4. Skip recursive fixes unless critical

**Duration:** ~3 minutes

### Example 3: Targeted Feature Test

**Input:**

```
User: "Test timeline features in production"
```

**Process:**

1. Launch single agent (Agent 3: Timeline)
2. Comprehensive timeline testing
3. Axiom query for timeline-related errors only
4. Fix any timeline-specific issues
5. Report results

**Duration:** ~5 minutes

## Integration with Existing Workflows

Works alongside:

- **code-validator skill**: Validates code before deploying fixes
- **Git workflow** (CLAUDE.md): Follows build → commit → push pattern
- **Vercel CI/CD**: Leverages automatic deployments
- **Axiom monitoring**: Uses existing log infrastructure

## Updates and Maintenance

**Version History:**

- 1.0.0 (2025-10-25): Initial release

**To update this skill:**

1. Modify Skill.md
2. Test with production deployment
3. Increment version number
4. Commit to repository

## References

- `/CLAUDE.md` - Git workflow and best practices
- `/README.md` - Feature list and tech stack
- Production URL: https://nonlinear-editor.vercel.app/
- Axiom dataset: nonlinear-editor
- Chrome DevTools MCP: https://github.com/modelcontextprotocol/servers/tree/main/src/chrome-devtools
- Axiom MCP: https://github.com/axiomhq/mcp-server-axiom
