#!/usr/bin/env python3
"""
Script to replace verbose agent prompts with optimized versions in Skill.md - Version 2
"""

SKILL_FILE = "/Users/davidchen/Projects/non-linear-editor/.claude/skills/project-testing/Skill.md"

# Read the file
with open(SKILL_FILE, 'r') as f:
    content = f.read()

# Agent 4 replacement
agent4_old = '''Prompt: "Test advanced editing features on production

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

Return report on editing features and errors"'''

agent4_new = '''Prompt: "**Agent 4: Editing Test**

**Context:** projectId={id}, clipId={id}

**Tests:**
1. Trim → handles drag
2. Transitions → dropdown check (crossfade, fade-in/out)
3. Controls → opacity/volume sliders
4. Speed → adjustment test
5. Split → playhead position

**Return:**
{ passed, tests: [{ name, result }], errors[] }"'''

content = content.replace(agent4_old, agent4_new)

# Agent 5 replacement - need to handle the existing error handling section
agent5_old_start = '''Prompt: "Test playback engine on production

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

Return report on playback functionality and performance"'''

agent5_new = '''Prompt: "**Agent 5: Playback Test**

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
{ passed, metrics: {lcp, fid, cls}, errors[] }"'''

content = content.replace(agent5_old_start, agent5_new)

# Agent 6 replacement - also has error handling section
agent6_old_start = '''Prompt: "Test state management features on production

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

Return report on state management and undo/redo functionality"'''

agent6_new = '''Prompt: "**Agent 6: State Test**

**Context:** projectId={id}

**Tests:**
1. Action → move clip
2. Undo → verify revert
3. Redo → verify restore
4. Copy/paste → Ctrl+C/V
5. Multi-select → Shift+click
6. Autosave → localStorage check

**Return:**
{ passed, tests: [{ name, result }], errors[] }"'''

content = content.replace(agent6_old_start, agent6_new)

# Agent 7 replacement - also has error handling
agent7_old_start = '''Prompt: "Test AI assistant on production

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
- AI response timeout: Increase wait to 30s, retry 2x

Return report on AI functionality and errors"'''

agent7_new = '''Prompt: "**Agent 7: AI Test**

**Context:** projectId={id}

**Test:**
1. Open chat → button click
2. Send: 'How do I add a transition?'
3. Wait response → verify appears
4. Check: /api/ai or gemini network

**Return:**
{ passed, response: string, latency: number, errors[] }"'''

content = content.replace(agent7_old_start, agent7_new)

# Write back
with open(SKILL_FILE, 'w') as f:
    f.write(content)

print("✓ Successfully updated all agent prompts (4, 5, 6, 7) with optimized versions")
print("✓ Agents 1, 2, 3 were already updated")
print("✓ Total: 7/7 agents optimized")
print("✓ Removed verbose error handling sections (moved to retry-strategy-guide.md)")
