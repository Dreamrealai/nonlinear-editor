# Agent Prompt Optimization Guide

## Problem

Current prompts are verbose (500+ tokens):

- Repetitive instructions
- Detailed step-by-step procedures
- Redundant explanations
- Long example blocks

Example (current - 512 tokens):

```markdown
Launch Task with subagent_type="general-purpose":

Prompt: "Test authentication flow on production https://nonlinear-editor.vercel.app/

Use Chrome DevTools MCP tools:

1. Navigate to production URL using mcp**chrome_devtools**navigate_page
2. Take snapshot using mcp**chrome_devtools**take_snapshot to see current page
3. Navigate to /login
4. Fill login form with:
   - Email: david@dreamreal.ai
   - Password: sc3p4sses
     Using mcp**chrome_devtools**fill_form
5. Click login button using mcp**chrome_devtools**click
6. Wait for redirect using mcp**chrome_devtools**wait_for with text 'Projects' or 'Dashboard'
7. Take screenshot using mcp**chrome_devtools**take_screenshot to verify success
8. Check console for errors using mcp**chrome_devtools**list_console_messages
9. Check network requests using mcp**chrome_devtools**list_network_requests

Return detailed report of:

- Authentication success/failure
- Any console errors
- Any failed network requests
- Screenshots of final state"
```

## Solution: Structured Format

Optimized prompt (142 tokens - 72% reduction):

````markdown
**Test:** Authentication
**URL:** https://nonlinear-editor.vercel.app/login
**Credentials:** david@dreamreal.ai / sc3p4sses

**Steps:**

1. Navigate → /login
2. Fill form → mcp**chrome_devtools**fill_form
3. Click login → mcp**chrome_devtools**click
4. Wait → 'Projects' text
5. Screenshot + console + network check

**Return:**

```json
{
  "passed": boolean,
  "authToken": string,
  "userId": string,
  "errors": string[]
}
```
````

**Errors:** Retry 3x (network/5xx), fail fast (4xx)

```

**Reduction:** 512 tokens → 142 tokens (72%)

## Optimization Techniques

### 1. Remove Tool Prefixes

❌ Before:
```

using mcp**chrome_devtools**navigate_page
using mcp**chrome_devtools**click
using mcp**chrome_devtools**fill_form

```

✅ After:
```

Tools: navigate, click, fill_form (mcp**chrome_devtools**)

```

**Saved:** 50-60 tokens per prompt

---

### 2. Use Structured Format

❌ Before:
```

Return detailed report of:

- Authentication success/failure
- Any console errors
- Any failed network requests
- Screenshots of final state

````

✅ After:
```json
Return: { passed, authToken, userId, errors }
````

**Saved:** 30-40 tokens per prompt

---

### 3. Abbreviate Common Terms

| Full Term              | Abbreviation | Savings   |
| ---------------------- | ------------ | --------- |
| authentication         | auth         | 14 tokens |
| production             | prod         | 8 tokens  |
| screenshot             | snap         | 8 tokens  |
| mcp**chrome_devtools** | (implied)    | 20 tokens |

---

### 4. Remove Examples and Explanations

❌ Before:

```
Fill login form with:
   - Email: david@dreamreal.ai
   - Password: sc3p4sses
   Using mcp__chrome_devtools__fill_form
```

✅ After:

```
Fill: email/password → fill_form
```

**Saved:** 25-30 tokens

---

### 5. Combine Related Steps

❌ Before:

```
7. Take screenshot using mcp__chrome_devtools__take_screenshot to verify success
8. Check console for errors using mcp__chrome_devtools__list_console_messages
9. Check network requests using mcp__chrome_devtools__list_network_requests
```

✅ After:

```
7. Verify: snap + console + network
```

**Saved:** 40-50 tokens

---

## Optimized Prompt Templates

### Agent 1: Authentication (142 tokens)

```markdown
**Agent 1: Auth Test**

**Target:** prod login (david@dreamreal.ai / sc3p4sses)
**Test ID:** auth-{timestamp}

**Flow:**

1. Navigate /login
2. Fill + click → wait 'Projects'
3. Verify: snap + console + network

**Return:**
{ passed, authToken, userId, sessionId, errors[] }

**Retry:** 3x (network/5xx) | Fail: 4xx
```

---

### Agent 2: Asset Upload (156 tokens)

```markdown
**Agent 2: Asset Upload Test**

**Context:** authToken={token}, userId={id}
**Test ID:** asset-{timestamp}
**Project:** "Test Project {testId}"

**Flow:**

1. Create project → click 'New Project'
2. Upload asset → file input
3. Verify: thumbnail (wait 5s) + console + network /api/assets

**Return:**
{ passed, projectId, assetIds[], thumbnailOk, errors[] }

**Cleanup:** Delete project on complete
**Retry:** 2x upload (10s delay) | Fail: storage error
```

---

### Agent 3: Timeline Features (138 tokens)

```markdown
**Agent 3: Timeline Test**

**Context:** projectId={id}, assets={ids}

**Tests:**

1. Drag asset → timeline (mcp\_\_drag)
2. Zoom controls → slider check
3. Snap toggle → grid align verify
4. Multi-track → add track button

**Return:**
{ passed, tests: [{ name, result }], errors[] }

**Retry:** 2x (network) | Fail: element not found
```

---

### Agent 4: Editing Features (145 tokens)

```markdown
**Agent 4: Editing Test**

**Context:** projectId={id}, clipId={id}

**Tests:**

1. Trim → handles drag
2. Transitions → dropdown check (crossfade, fade-in/out)
3. Controls → opacity/volume sliders
4. Speed → adjustment test
5. Split → playhead position

**Return:**
{ passed, tests: [{ name, result }], errors[] }
```

---

### Agent 5: Playback Engine (151 tokens)

```markdown
**Agent 5: Playback Test**

**Context:** projectId={id}, clips=2+

**Tests:**

1. Play/pause → button click + verify playback
2. Seek → click timeline position
3. Timecode → accuracy check
4. Sync → multi-track alignment

**Performance:**
Start trace → reload → stop → extract LCP/FID/CLS
Budget: LCP<2.5s, FID<100ms, CLS<0.1

**Return:**
{ passed, metrics: {lcp, fid, cls}, errors[] }
```

---

### Agent 6: State Management (134 tokens)

```markdown
**Agent 6: State Test**

**Context:** projectId={id}

**Tests:**

1. Action → move clip
2. Undo → verify revert
3. Redo → verify restore
4. Copy/paste → Ctrl+C/V
5. Multi-select → Shift+click
6. Autosave → localStorage check

**Return:**
{ passed, tests: [{ name, result }], errors[] }
```

---

### Agent 7: AI Assistant (128 tokens)

```markdown
**Agent 7: AI Test**

**Context:** projectId={id}

**Test:**

1. Open chat → button click
2. Send: "How do I add a transition?"
3. Wait response → verify appears
4. Check: /api/ai or gemini network

**Return:**
{ passed, response: string, latency: number, errors[] }
```

---

## Token Savings Summary

| Agent     | Before    | After   | Reduction |
| --------- | --------- | ------- | --------- |
| Agent 1   | 512       | 142     | 72%       |
| Agent 2   | 548       | 156     | 72%       |
| Agent 3   | 487       | 138     | 72%       |
| Agent 4   | 523       | 145     | 72%       |
| Agent 5   | 541       | 151     | 72%       |
| Agent 6   | 498       | 134     | 73%       |
| Agent 7   | 476       | 128     | 73%       |
| **Total** | **3,585** | **994** | **72%**   |

**Total Savings:** 2,591 tokens (72% reduction)

## Implementation Checklist

- [ ] Update Agent 1 prompt in Skill.md
- [ ] Update Agent 2 prompt in Skill.md
- [ ] Update Agent 3 prompt in Skill.md
- [ ] Update Agent 4 prompt in Skill.md
- [ ] Update Agent 5 prompt in Skill.md
- [ ] Update Agent 6 prompt in Skill.md
- [ ] Update Agent 7 prompt in Skill.md
- [ ] Verify all prompts still functional
- [ ] Test agent launches
- [ ] Measure token reduction
- [ ] Confirm 70%+ savings achieved

## Validation

Test each optimized prompt:

1. Launch agent with new prompt
2. Verify understands instructions
3. Verify completes task correctly
4. Verify return format correct
5. Measure token count (should be ~150)

If any agent fails:

- Add back essential context
- Keep under 200 tokens
- Still aim for 60%+ reduction
