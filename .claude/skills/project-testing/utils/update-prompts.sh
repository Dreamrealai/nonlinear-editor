#!/bin/bash

# Script to update all 7 agent prompts with optimized versions

SKILL_FILE="/Users/davidchen/Projects/non-linear-editor/.claude/skills/project-testing/Skill.md"

# Create temporary file
TMP_FILE=$(mktemp)

# Read the entire file
cp "$SKILL_FILE" "$TMP_FILE"

# Use perl for multi-line replacements (works better than sed for this)

# Agent 4 replacement
perl -0777 -i -pe 's/\*\*Agent 4: Editing Features Tester\*\*\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "Test advanced editing features on production\n\nUse Chrome DevTools MCP tools:\n\n1\. Find a clip on timeline \(from Agent 3'"'"'s work\)\n2\. Test trim handles \(look for resize handles\)\n3\. Test transitions dropdown\/menu\n4\. Test opacity slider\n5\. Test volume slider\n6\. Test speed controls\n7\. Test split functionality\n8\. Check console errors\n9\. Verify operations work correctly\n\nReturn report on editing features and errors"\n```/**Agent 4: Editing Features Tester**\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "**Agent 4: Editing Test**\n\n**Context:** projectId={id}, clipId={id}\n\n**Tests:**\n1. Trim → handles drag\n2. Transitions → dropdown check (crossfade, fade-in\/out)\n3. Controls → opacity\/volume sliders\n4. Speed → adjustment test\n5. Split → playhead position\n\n**Return:**\n{ passed, tests: [{ name, result }], errors[] }"\n```/g' "$TMP_FILE"

# Agent 5 replacement
perl -0777 -i -pe 's/\*\*Agent 5: Playback Engine Tester\*\*\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "Test playback engine on production\n\nUse Chrome DevTools MCP tools:\n\n1\. Find playback controls \(play\/pause button\)\n2\. Click play using mcp\*\*chrome_devtools\*\*click\n3\. Wait 2 seconds\n4\. Click pause\n5\. Test seek by clicking timeline position\n6\. Verify timecode updates\n7\. Check for video synchronization issues in console\n8\. Monitor network requests for video streaming\n9\. Check performance using mcp\*\*chrome_devtools\*\*performance_start_trace\n\nReturn report on playback functionality and performance"\n```/**Agent 5: Playback Engine Tester**\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "**Agent 5: Playback Test**\n\n**Context:** projectId={id}, clips=2+\n\n**Tests:**\n1. Play\/pause → button click + verify playback\n2. Seek → click timeline position\n3. Timecode → accuracy check\n4. Sync → multi-track alignment\n\n**Performance:**\nStart trace → reload → stop → extract LCP\/FID\/CLS\nBudget: LCP<2.5s, FID<100ms, CLS<0.1\n\n**Return:**\n{ passed, metrics: {lcp, fid, cls}, errors[] }"\n```/g' "$TMP_FILE"

# Agent 6 replacement
perl -0777 -i -pe 's/\*\*Agent 6: State Management Tester\*\*\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "Test state management features on production\n\nUse Chrome DevTools MCP tools:\n\n1\. Perform an action \(e\.g\., move a clip\)\n2\. Find and click Undo button\n3\. Verify clip position reverted\n4\. Click Redo button\n5\. Test copy \(Ctrl\+C or copy button\)\n6\. Test paste \(Ctrl\+V or paste button\)\n7\. Test multi-select \(Shift\+click or drag select\)\n8\. Check localStorage\/sessionStorage for autosave data using mcp\*\*chrome_devtools\*\*evaluate_script\n9\. Check console errors\n\nReturn report on state management and undo\/redo functionality"\n```/**Agent 6: State Management Tester**\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "**Agent 6: State Test**\n\n**Context:** projectId={id}\n\n**Tests:**\n1. Action → move clip\n2. Undo → verify revert\n3. Redo → verify restore\n4. Copy\/paste → Ctrl+C\/V\n5. Multi-select → Shift+click\n6. Autosave → localStorage check\n\n**Return:**\n{ passed, tests: [{ name, result }], errors[] }"\n```/g' "$TMP_FILE"

# Agent 7 replacement
perl -0777 -i -pe 's/\*\*Agent 7: AI Assistant Tester\*\*\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "Test AI assistant on production\n\nUse Chrome DevTools MCP tools:\n\n1\. Find AI chat button\/panel\n2\. Click to open AI assistant\n3\. Type test message: '"'"'How do I add a transition\?'"'"'\n4\. Submit message\n5\. Wait for response using mcp\*\*chrome_devtools\*\*wait_for\n6\. Verify response appears\n7\. Check network requests to \/api\/ai or gemini endpoints\n8\. Check console for errors\n\nReturn report on AI functionality and errors"\n```/**Agent 7: AI Assistant Tester**\n\n```markdown\nLaunch Task with subagent_type="general-purpose":\n\nPrompt: "**Agent 7: AI Test**\n\n**Context:** projectId={id}\n\n**Test:**\n1. Open chat → button click\n2. Send: '"'"'How do I add a transition?'"'"'\n3. Wait response → verify appears\n4. Check: \/api\/ai or gemini network\n\n**Return:**\n{ passed, response: string, latency: number, errors[] }"\n```/g' "$TMP_FILE"

# Copy back to original
cp "$TMP_FILE" "$SKILL_FILE"

# Clean up
rm "$TMP_FILE"

echo "✓ Updated all agent prompts with optimized versions"
