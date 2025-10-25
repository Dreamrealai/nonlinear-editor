# Project Testing Skill - Quick Start

## What This Skill Does

Automatically tests your production deployment with an agent swarm, monitors Axiom for errors, and recursively fixes issues until production is error-free.

## Quick Usage

Just say:

- "test production"
- "run production tests"
- "check if production is working"

## What Happens

1. **Agent Swarm Launches** - 7 specialized agents test different features
2. **Chrome DevTools Testing** - Real browser testing via MCP
3. **Axiom Error Monitoring** - Checks production logs
4. **Automatic Fixes** - Fixes errors and redeploys up to 5 times
5. **Verification** - Confirms zero errors in production

## Test Coverage

✅ **Authentication** - Login flow, session persistence
✅ **Asset Management** - Upload, thumbnails, signed URLs
✅ **Timeline** - Drag-drop, zoom, snap-to-grid, multi-track
✅ **Editing** - Trim, transitions, opacity, volume, speed, split
✅ **Playback** - Play/pause, seek, sync, timecode
✅ **State Management** - Undo/redo, copy/paste, autosave
✅ **AI Assistant** - Chat functionality, responses

## Production Environment

- **URL:** https://nonlinear-editor.vercel.app/
- **Logs:** Axiom dataset `nonlinear-editor`
- **Test Account:** david@dreamreal.ai / sc3p4sses

## Typical Results

**Full test run:** ~5-10 minutes
**Fix iterations:** 0-5 (usually 1-2)
**Total time to zero errors:** ~15-30 minutes

## Output

You'll receive a comprehensive report including:

- ✅ Pass/fail status for each feature
- 📊 Error breakdown by category
- 🔧 Fixes applied with commit hashes
- 📸 Screenshots of production state
- 📈 Performance metrics
- 💡 Recommendations

## Example Report

```
# Production Testing Report

**Status:** ✅ ALL TESTS PASSED
**Fix Iterations:** 2
**Total Errors Fixed:** 8

## Test Results Summary

| Feature              | Status | Errors |
|----------------------|--------|--------|
| Authentication       | ✅      | 0      |
| Asset Upload         | ✅      | 0      |
| Timeline             | ✅      | 0      |
| Editing              | ✅      | 0      |
| Playback             | ✅      | 0      |
| State Management     | ✅      | 0      |
| AI Assistant         | ✅      | 0      |

**Total Time:** 22 minutes
```

## Troubleshooting

**If tests fail:**

- Check Vercel deployment status
- Verify environment variables
- Check Supabase is running
- Review Axiom logs manually

**If fixes don't work:**

- Max 5 iterations prevents infinite loops
- Manual intervention may be needed for complex issues
- Review ISSUES.md for tracked problems

## Advanced Usage

**Quick smoke test:**

```
User: "Quick production smoke test"
```

**Test specific feature:**

```
User: "Test timeline features in production"
```

**Skip fixes, just report:**

```
User: "Run production tests without fixing"
```

## Next Steps

After successful test:

1. Review full report
2. Check ISSUES.md updates
3. Verify fixes in production
4. Monitor Axiom for new errors
5. Consider adding more test coverage
