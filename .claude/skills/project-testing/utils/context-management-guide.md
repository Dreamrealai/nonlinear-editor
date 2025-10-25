# Context Management Guide

## Problem

Without context management:

- Agent 1 completes: 5,000 tokens of context
- Agent 2 starts: Inherits 5,000 tokens + adds 5,000 = 10,000 tokens
- Agent 3 starts: Inherits 10,000 tokens + adds 5,000 = 15,000 tokens
- ...
- Agent 7 starts: 35,000 tokens of context!

Result: Slow responses, token overflow risk, wasted resources

## Solution: /clear Command

Use `/clear` between agents to reset context window:

- Agent 1 completes: 5,000 tokens
- **/clear** → Context reset to 500 tokens
- Agent 2 starts: Only 500 tokens (essential data only)
- Result: 70-80% reduction in context size

## Implementation

### Phase Structure

**Phase 1: Sequential (Auth → Assets)**

```
1. Launch Agent 1 (Authentication)
2. Agent 1 completes (~5,000 tokens)
3. Extract essential data: { authToken, userId, sessionId }
4. Issue: /clear
5. Context reduced: 5,000 → 500 tokens (90% reduction)
6. Launch Agent 2 (Assets) with minimal context
7. Agent 2 completes (~5,000 tokens)
8. Extract essential data: { projectId, assetIds: [...] }
9. Issue: /clear
10. Context reduced: 5,000 → 500 tokens (90% reduction)
```

**Phase 2: Parallel (All Feature Tests)**

```
1. Launch Agents 3-7 in parallel
2. Each starts with only 500 tokens (not 10,000+)
3. All execute faster with minimal context
4. Each completes independently
5. Collect results after all finish
```

## Data Handoff Structure

### Agent 1 → Agent 2

**Full Context (5,000 tokens):**

```
Agent 1 completed authentication test.

Process:
1. Navigated to production URL https://nonlinear-editor.vercel.app/
2. Found login page with form elements
3. Filled email field with david@dreamreal.ai
4. Filled password field with sc3p4sses
5. Clicked login button
6. Waited for redirect to dashboard
7. Took screenshot showing "Projects" page
8. Checked console - no errors
9. Checked network - all requests successful
10. Verified session cookie created
11. Verified auth token in localStorage
12. Tested session persistence with page reload
...
(detailed logs, debug info, screenshots, etc.)

Result: Authentication successful
Auth token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
User ID: 123e4567-e89b-12d3-a456-426614174000
Session ID: session_abc123xyz789
```

**Minimal Context (500 tokens):**

```json
{
  "agent": "Agent1_Auth",
  "status": "success",
  "timestamp": "2025-10-25T13:00:00Z",
  "essential": {
    "authToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "123e4567-e89b-12d3-a456-426614174000",
    "sessionId": "session_abc123xyz789"
  },
  "errors": []
}
```

**Reduction:** 5,000 tokens → 500 tokens (90%)

---

### Agent 2 → Agents 3-7

**Full Context (10,000 tokens):**

```
Agent 2 completed asset upload test.

Context from Agent 1:
[All 5,000 tokens of Agent 1's work...]

Agent 2 Process:
1. Received auth token from Agent 1
2. Navigated to dashboard
3. Found "New Project" button
4. Clicked to create project
5. Filled project name: "Test Project abc123"
6. Uploaded test video asset (test-video.mp4)
7. Waited for upload to complete
8. Verified progress bar reached 100%
9. Checked thumbnail generation
10. Verified asset appears in library
...
(detailed logs, upload progress, file info, etc.)

Result: Assets uploaded successfully
Project ID: proj_xyz789
Asset IDs: [asset_001, asset_002, asset_003]
```

**Minimal Context (500 tokens):**

```json
{
  "agent": "Agent2_Assets",
  "status": "success",
  "timestamp": "2025-10-25T13:01:30Z",
  "essential": {
    "projectId": "proj_xyz789",
    "assetIds": ["asset_001", "asset_002", "asset_003"],
    "assetTypes": {
      "asset_001": "video",
      "asset_002": "audio",
      "asset_003": "image"
    }
  },
  "errors": []
}
```

**Reduction:** 10,000 tokens → 500 tokens (95%)

---

## /clear Command Usage

### Between Sequential Agents

```markdown
**After Agent 1 completes:**

1. Capture essential results in structured format
2. Store in memory/file
3. Issue: /clear
4. Launch Agent 2 with ONLY essential data
5. Agent 2 doesn't need Agent 1's full logs

Example:

- Agent 1 result: 5,000 tokens
- Extract: authToken, userId, sessionId (100 tokens)
- /clear → Context reset
- Agent 2 starts with: 100 tokens + 400 token prompt = 500 tokens
```

### Before Parallel Agents

```markdown
**After Agent 2 completes:**

1. Capture essential results
2. Store: projectId, assetIds
3. Issue: /clear
4. Launch Agents 3-7 in parallel
5. Each receives SAME minimal context (500 tokens)
6. No agent inherits others' context

Benefits:

- Agent 3: 500 tokens (not 15,000)
- Agent 4: 500 tokens (not 20,000)
- Agent 5: 500 tokens (not 25,000)
- Agent 6: 500 tokens (not 30,000)
- Agent 7: 500 tokens (not 35,000)

Total savings: 100,000 tokens → 2,500 tokens (97.5% reduction!)
```

## Structured Data Format

### Agent Result Template

```typescript
interface AgentResult {
  agentId: string; // "Agent1_Auth", "Agent2_Assets", etc.
  status: 'success' | 'failure';
  timestamp: string; // ISO 8601
  essential: Record<string, any>; // Only critical data
  errors: Array<{
    type: string;
    message: string;
    retryable: boolean;
  }>;
}

// Example
const agent1Result: AgentResult = {
  agentId: 'Agent1_Auth',
  status: 'success',
  timestamp: '2025-10-25T13:00:00Z',
  essential: {
    authToken: 'eyJ...',
    userId: '123e4567...',
    sessionId: 'session_abc...',
  },
  errors: [],
};
```

### Context Handoff

```markdown
Agent 1 → Agent 2:

- Pass: authToken, userId, sessionId
- Don't pass: Full logs, debug info, screenshots

Agent 2 → Agents 3-7:

- Pass: projectId, assetIds, assetTypes
- Don't pass: Upload logs, progress bars, full Agent 1 context

Agents 3-7 → Consolidator:

- Pass: testName, passed, errors[]
- Don't pass: Detailed execution logs, full previous context
```

## Performance Metrics

### Before /clear

```
Agent 1: 5,000 tokens
Agent 2: 10,000 tokens (inherits 5,000)
Agent 3: 15,000 tokens (inherits 10,000)
Agent 4: 20,000 tokens (inherits 15,000)
Agent 5: 25,000 tokens (inherits 20,000)
Agent 6: 30,000 tokens (inherits 25,000)
Agent 7: 35,000 tokens (inherits 30,000)

Total: 140,000 tokens
Avg Response Time: 10-15 seconds per agent
Risk: Token overflow (200K limit)
```

### After /clear

```
Agent 1: 5,000 tokens
/clear
Agent 2: 5,500 tokens (500 essential + 5,000 new)
/clear
Agent 3-7: 500 tokens each (parallel, same minimal context)

Total: 16,000 tokens (88% reduction!)
Avg Response Time: 3-5 seconds per agent (3x faster)
Risk: None (well under limit)
```

## Best Practices

1. **Always /clear between phases**
   - After Agent 1 (Auth) completes
   - After Agent 2 (Assets) completes
   - Don't clear during parallel execution

2. **Extract only essential data**
   - Auth tokens, IDs, URLs
   - Success/failure status
   - Critical error messages
   - No detailed logs or debug info

3. **Use structured formats**
   - JSON for data transfer
   - Consistent schema across agents
   - Type-safe handoffs

4. **Document what's essential**
   - Agent 1 essential: authToken, userId, sessionId
   - Agent 2 essential: projectId, assetIds
   - Agents 3-7 essential: testName, passed, errors

5. **Test context reduction**
   - Verify agents work with minimal context
   - Ensure no data loss
   - Confirm 70%+ reduction achieved
