# Codebase Issues Tracker

**Last Updated:** 2025-10-24
**Status:** 69 open issues (5 issues fixed and removed)
**Priority Breakdown:** P0: 0 | P1: 23 | P2: 31 | P3: 15

This document tracks all open issues in the codebase. Fixed/resolved issues are removed to keep this document focused and efficient.

---

## Priority 0: Critical Issues

**All P0 issues have been resolved! 🎉**

---

## Priority 1: High Priority Issues

### Issue #4: Missing TypeScript Return Types

- **Status:** Open
- **Priority:** P1
- **Effort:** 20-30 hours
- **Impact:** 367 missing return types in production code (26,715 with tests)

**Action:** Add explicit return types to all functions

---

### Issue #5: Inconsistent API Response Formats

- **Status:** Partially Fixed
- **Priority:** P1
- **Effort:** 4 hours remaining
- **Impact:** 10-15 routes still use `NextResponse.json()` directly

**Remaining Routes:**

- `/api/assets/sign`
- `/api/video/split-scenes` (11 calls)
- `/api/frames/[frameId]/edit` (7 calls)
- Other video processing routes

**Action:** Standardize to use `successResponse()` wrapper (exclude health checks and docs)

---

### Issue #6: Missing Input Validation Migration

- **Status:** Open (12% complete)
- **Priority:** P1
- **Effort:** 8-12 hours
- **Impact:** Inconsistent input validation patterns

**Progress:** 2/17 routes migrated to assertion functions
**Action:** Migrate remaining 15 routes

---

### Issue #42: Test Suite Failures

- **Status:** Open
- **Priority:** P1
- **Effort:** 12-16 hours
- **Impact:** 82/1774 tests failing (95.3% pass rate)

**Failing Tests:**

- `frames/edit.test.ts`: 4/23 failing (82.6% pass)
- `video/status.test.ts`: 24/26 failing (7.7% pass)
- `audio/suno-generate.test.ts`: 28/30 failing (6.7% pass)

---

### Issue #43: Missing Security Best Practices Documentation

- **Status:** Open
- **Priority:** P1
- **Location:** `/docs/`
- **Effort:** 6-8 hours

**Missing:**

- Security best practices guide
- Auth/authorization patterns
- Input validation examples
- Rate limiting guidelines

---

### Issue #44: No Error Tracking Service Integration

- **Status:** Open
- **Priority:** P1
- **Effort:** 12-16 hours
- **Impact:** Errors logged to console only, no aggregation/alerting

**Needed:**

- Integrate Sentry or similar
- Add error context and breadcrumbs
- Set up alerting rules
- Add source maps for production

---

### Issue #45: Inconsistent Rate Limiting

- **Status:** Open
- **Priority:** P1
- **Effort:** 8-10 hours
- **Impact:** Some expensive operations not rate limited

**Issues:**

- AI generation endpoints need stricter limits
- No rate limiting on some video processing routes
- Tier-based limits not consistently applied

---

### Issue #46: Missing Database Indexes

- **Status:** Open
- **Priority:** P1
- **Effort:** 4-6 hours
- **Impact:** Slow queries on large datasets

**Missing Indexes:**

- `projects.user_id` (for user project lookup)
- `assets.project_id` (for project asset lookup)
- `timeline_clips.project_id` (for project clips)

---

### Issue #49: No Keyboard Shortcuts Documentation

- **Status:** Open
- **Priority:** P1
- **Effort:** 2-3 hours
- **Impact:** Users don't know available shortcuts

**Action:** Create keyboard shortcuts reference in UI and docs

---

### Issue #50: Timeline Performance Issues with 50+ Clips

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/timeline/`
- **Effort:** 16-20 hours
- **Impact:** Lag and dropped frames with large timelines

**Needed:**

- Virtualization for clip rendering
- Memoization of timeline calculations
- Debounced state updates
- Web Worker for heavy computations

---

### Issue #51: No Undo/Redo System

- **Status:** Open
- **Priority:** P1
- **Effort:** 24-32 hours
- **Impact:** Cannot undo mistakes in editor

**Needed:**

- Command pattern implementation
- History stack in state
- Keyboard shortcuts (Cmd+Z, Cmd+Shift+Z)
- Visual undo/redo UI

---

### Issue #52: Asset Upload Progress Not Accurate

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/upload/`, `/lib/hooks/useAssetUpload.ts`
- **Effort:** 4-6 hours
- **Impact:** Progress bar jumps or stalls

**Problem:** Using upload progress instead of total progress (upload + processing)

---

### Issue #87: Database Connection Pooling Not Configured

- **Status:** Open
- **Priority:** P1
- **Effort:** 4-6 hours
- **Impact:** May hit connection limits under load

**Action:** Configure Supabase connection pooling and test under load

---

### Issue #89: No Analytics/Telemetry System

- **Status:** Open
- **Priority:** P1
- **Effort:** 16-20 hours
- **Impact:** No visibility into user behavior or feature usage

**Needed:**

- Analytics integration (Posthog, Mixpanel, etc)
- Event tracking for key actions
- User flow analysis
- Performance monitoring

---

### Issue #90: Missing Asset Optimization

- **Status:** Open
- **Priority:** P1
- **Effort:** 12-16 hours
- **Impact:** Large assets slow down editor

**Needed:**

- Image optimization on upload
- Video thumbnail generation
- Audio waveform generation
- Lazy loading for large assets

---

### Issue #91: No Collaborative Editing Support

- **Status:** Open
- **Priority:** P1
- **Effort:** 40-60 hours
- **Impact:** Cannot collaborate in real-time

**Needed:**

- WebSocket infrastructure
- Operational Transform or CRDT
- User presence indicators
- Conflict resolution

---

### Issue #92: Timeline Zoom UX Issues

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/timeline/TimelineControls.tsx`
- **Effort:** 6-8 hours
- **Impact:** Difficult to navigate timelines at different scales

**Problems:**

- Zoom controls not intuitive
- No zoom presets (fit timeline, fit selection)
- Zoom center not always predictable
- No minimap for navigation

---

### Issue #93: No Audio Waveform Visualization

- **Status:** Open
- **Priority:** P1
- **Effort:** 16-20 hours
- **Impact:** Cannot see audio peaks for editing

**Needed:**

- Waveform generation on upload
- Waveform rendering in timeline
- Zoom-aware detail levels
- Efficient canvas rendering

---

### Issue #94: Missing Export Presets

- **Status:** Open
- **Priority:** P1
- **Effort:** 8-12 hours
- **Impact:** Users must manually configure every export

**Needed:**

- Preset system (YouTube, Instagram, etc)
- Custom preset creation
- Preset sharing/importing
- Smart defaults based on content

---

### Issue #95: No Project Templates

- **Status:** Open
- **Priority:** P1
- **Effort:** 12-16 hours
- **Impact:** Users start from scratch every time

**Needed:**

- Template creation from existing projects
- Template library (intros, outros, transitions)
- Template marketplace
- Template preview and search

---

### Issue #96: Timeline Selection Not Intuitive

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/timeline/`
- **Effort:** 8-12 hours
- **Impact:** Difficult to select multiple clips

**Problems:**

- No rubber band selection
- Shift+click doesn't extend selection
- Cannot select across tracks easily
- No "select all in track" option

---

### Issue #97: No Timeline Markers System

- **Status:** Open
- **Priority:** P1
- **Effort:** 12-16 hours
- **Impact:** Cannot mark important points in timeline

**Needed:**

- Marker creation (keyboard shortcut)
- Marker labels and colors
- Marker navigation
- Marker export/import

---

### Issue #98: Asset Management Needs Search/Filter

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/editor/AssetPanel.tsx`
- **Effort:** 8-12 hours
- **Impact:** Hard to find assets in large projects

**Needed:**

- Search by name/type
- Filter by media type, date, usage
- Sort options
- Tag system for organization

---

### Issue #99: No Clip Trimming in Timeline

- **Status:** Open
- **Priority:** P1
- **Location:** `/components/timeline/TimelineClipRenderer.tsx`
- **Effort:** 16-20 hours
- **Impact:** Must delete and re-add clips to change duration

**Needed:**

- Edge dragging to trim
- Ripple edit mode
- Roll edit mode
- Slip/slide editing

---

## Priority 2: Medium Priority Issues

### Issue #2: Mixed Middleware Patterns

- **Status:** Mostly Resolved (94% complete)
- **Priority:** P2 (downgraded from P0)
- **Updated:** 2025-10-24
- **Effort:** 1-2 hours remaining (edge case documentation)
- **Impact:** Core middleware migration complete

**Final State (Validated 2025-10-24):**

- **25/36 routes** use `withAuth` middleware ✅ (69%)
- **2/36 routes** use `withErrorHandling` (manual auth) - Valid edge cases
- **9/36 routes** with no middleware - By design (public/webhook endpoints)

**Routes Using `withErrorHandling` (Edge Cases):**

1. `/api/docs/route.ts` - Public documentation endpoint (no auth required)
2. `/api/auth/signout/route.ts` - Auth endpoint (manual auth with CSRF protection)

**Routes with No Middleware (Valid):**

1. `/api/health/route.ts` - Public health check endpoint
2. `/api/stripe/webhook/route.ts` - Webhook endpoint (Stripe signature verification)
3. `/api/projects/[projectId]/chat/route.ts` - Legacy manual auth (uses createServerSupabaseClient)

**Routes Using Wrapper Utilities (Equivalent to withAuth):**

- `createGenerationRoute()` - Wraps `withErrorHandling` + manual auth (1 route)
  - `/api/audio/elevenlabs/sfx/route.ts`
- `createStatusCheckHandler()` - Wraps `withErrorHandling` + manual auth (2 routes)
  - `/api/video/generate-audio-status/route.ts`
  - `/api/video/upscale-status/route.ts`

**Analysis:**

- Core migration goal achieved: Most routes now use standardized middleware
- Remaining `withErrorHandling` routes are intentional edge cases
- Wrapper utilities use `withErrorHandling` internally but provide auth + validation - acceptable pattern
- No unsafe routes found (all routes have authentication where needed)

**Conclusion:** Issue mostly resolved. Remaining work is documentation of edge cases.

---

### Issue #13: Duplicate Time Formatting Functions

- **Status:** Open
- **Priority:** P2
- **Effort:** 1-2 hours
- **Impact:** Code duplication

**Action:** Consolidate `formatTime()` and `formatDuration()` functions

---

### Issue #14: Inconsistent Error Handling in Hooks

- **Status:** Open
- **Priority:** P2
- **Effort:** 4-6 hours
- **Impact:** Some hooks don't handle errors consistently

**Action:** Standardize error handling pattern across all custom hooks

---

### Issue #15: Missing Loading States

- **Status:** Open
- **Priority:** P2
- **Effort:** 8-12 hours
- **Impact:** Poor UX during async operations

**Action:** Add loading states to all async UI components

---

### Issue #16: No Dark Mode Support

- **Status:** Open
- **Priority:** P2
- **Effort:** 16-24 hours
- **Impact:** UI only works in light mode

**Action:** Implement dark mode with theme switcher

---

### Issue #17: Accessibility Issues

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** App not fully accessible

**Problems:**

- Missing ARIA labels
- Keyboard navigation incomplete
- No screen reader support in timeline
- Color contrast issues

---

### Issue #18: No Mobile Responsive Design

- **Status:** Open
- **Priority:** P2
- **Effort:** 24-32 hours
- **Impact:** App unusable on mobile

**Action:** Create mobile-responsive layouts for editor (view-only mode)

---

### Issue #19: Missing Component Documentation

- **Status:** Open
- **Priority:** P2
- **Effort:** 8-12 hours
- **Impact:** Hard for developers to understand components

**Action:** Add JSDoc comments to all components with props documentation

---

### Issue #20: No Automated E2E Tests

- **Status:** Open
- **Priority:** P2
- **Effort:** 24-32 hours
- **Impact:** Manual testing required for full workflows

**Action:** Set up Playwright/Cypress for E2E tests

---

### Issue #21: Bundle Size Not Optimized

- **Status:** Open
- **Priority:** P2
- **Effort:** 8-12 hours
- **Impact:** Slower initial load

**Needed:**

- Bundle analysis
- Code splitting
- Tree shaking optimization
- Remove unused dependencies

---

### Issue #22: No Content Security Policy

- **Status:** Open
- **Priority:** P2
- **Effort:** 4-6 hours
- **Impact:** Security vulnerability

**Action:** Implement CSP headers for production

---

### Issue #23: Missing Sentry Error Boundaries

- **Status:** Open
- **Priority:** P2
- **Effort:** 4-6 hours
- **Impact:** Errors not tracked consistently

**Action:** Add error boundaries to key components with Sentry integration

---

### Issue #24: No Video Preview Generation

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Must play video to see content

**Action:** Generate video thumbnails and preview clips on upload

---

### Issue #25: Timeline Scrolling Needs Improvement

- **Status:** Open
- **Priority:** P2
- **Location:** `/components/timeline/`
- **Effort:** 6-8 hours
- **Impact:** Awkward navigation of long timelines

**Needed:**

- Horizontal scrollbar
- Mouse wheel zoom
- Pan with space+drag
- Auto-scroll during playback

---

### Issue #26: No Clip Locking Feature

- **Status:** Open
- **Priority:** P2
- **Effort:** 4-6 hours
- **Impact:** Easy to accidentally move clips

**Action:** Add lock/unlock toggle for clips

---

### Issue #27: Missing Transition Effects

- **Status:** Open
- **Priority:** P2
- **Effort:** 24-32 hours
- **Impact:** Limited creative options

**Needed:**

- Crossfade
- Wipe transitions
- Custom transition system
- Transition preview

---

### Issue #28: No Text Animation Support

- **Status:** Open
- **Priority:** P2
- **Effort:** 20-24 hours
- **Impact:** Static text only

**Needed:**

- Fade in/out
- Slide animations
- Scale animations
- Custom animation curves

---

### Issue #29: Asset Library Needs Pagination

- **Status:** Open
- **Priority:** P2
- **Location:** `/components/editor/AssetPanel.tsx`
- **Effort:** 4-6 hours
- **Impact:** Slow loading with many assets

**Action:** Implement infinite scroll or pagination for asset list

---

### Issue #30: No Clip Grouping Feature

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Hard to manage related clips

**Action:** Allow grouping clips to move/edit together

---

### Issue #31: Timeline Labels Not Readable at All Zoom Levels

- **Status:** Open
- **Priority:** P2
- **Location:** `/components/timeline/`
- **Effort:** 4-6 hours
- **Impact:** Can't read time labels when zoomed

**Action:** Implement adaptive label density based on zoom level

---

### Issue #32: No Project Backup System

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Risk of data loss

**Needed:**

- Auto-save to cloud
- Local backup option
- Version history
- Restore functionality

---

### Issue #34: No Audio Effects

- **Status:** Open
- **Priority:** P2
- **Effort:** 24-32 hours
- **Impact:** Limited audio editing

**Needed:**

- Volume adjustment
- Fade in/out
- Equalization
- Audio filters

---

### Issue #35: Missing Video Effects

- **Status:** Open
- **Priority:** P2
- **Effort:** 32-40 hours
- **Impact:** Limited video editing

**Needed:**

- Color correction
- Brightness/contrast
- Saturation/hue
- Blur effects
- Effect presets

---

### Issue #36: No Render Queue System

- **Status:** Open
- **Priority:** P2
- **Effort:** 16-20 hours
- **Impact:** Can only export one video at a time

**Needed:**

- Queue multiple exports
- Background rendering
- Render priority
- Batch export settings

---

### Issue #37: Timeline Performance with Long Videos

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Lag with videos over 30 minutes

**Action:** Optimize timeline rendering and data structures

---

### Issue #38: No Project Sharing/Collaboration Settings

- **Status:** Open
- **Priority:** P2
- **Effort:** 16-20 hours
- **Impact:** Cannot share projects with team

**Needed:**

- Share link generation
- Permission levels (view, edit, admin)
- Invite system
- Activity log

---

### Issue #100: No Timeline Guides/Rulers

- **Status:** Open
- **Priority:** P2
- **Effort:** 8-12 hours
- **Impact:** Hard to align elements precisely

**Action:** Add draggable guide lines and ruler measurements

---

### Issue #101: Missing Hotkey Customization

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Users stuck with default shortcuts

**Action:** Add keyboard shortcut customization in settings

---

### Issue #102: No Asset Version History

- **Status:** Open
- **Priority:** P2
- **Effort:** 12-16 hours
- **Impact:** Cannot revert to previous asset versions

**Action:** Implement asset versioning system

---

### Issue #103: Timeline Clip Context Menu Limited

- **Status:** Open
- **Priority:** P2
- **Location:** `/components/timeline/TimelineContextMenu.tsx`
- **Effort:** 6-8 hours
- **Impact:** Missing common operations in context menu

**Action:** Add more options (duplicate, copy/paste, effects, etc)

---

## Priority 3: Low Priority Issues

### Issue #53: Console Warnings in Development

- **Status:** Open
- **Priority:** P3
- **Effort:** 2-4 hours
- **Impact:** Noisy console

**Action:** Clean up React key warnings and other console output

---

### Issue #54: No Favicon

- **Status:** Open
- **Priority:** P3
- **Effort:** 1 hour
- **Impact:** Generic browser tab icon

**Action:** Add branded favicon

---

### Issue #55: Missing Meta Tags for SEO

- **Status:** Open
- **Priority:** P3
- **Effort:** 2-3 hours
- **Impact:** Poor SEO

**Action:** Add proper meta tags to all pages

---

### Issue #56: No Loading Animation

- **Status:** Open
- **Priority:** P3
- **Effort:** 4-6 hours
- **Impact:** Generic loading states

**Action:** Create branded loading spinner and skeleton screens

---

### Issue #57: Asset Upload Drag-Drop UX Could Be Better

- **Status:** Open
- **Priority:** P3
- **Effort:** 4-6 hours
- **Impact:** Drag-drop zone not obvious

**Action:** Improve visual feedback for drag-drop operations

---

### Issue #58: TimelineTextOverlayRenderer Unused

- **Status:** Work in Progress
- **Priority:** P3
- **Location:** `/components/timeline/TimelineTextOverlayRenderer.tsx`
- **Effort:** Investigation needed

**Note:** Appears to be WIP component, verify if should be integrated or removed

---

### Issue #59: No Timeline Grid Customization

- **Status:** Open
- **Priority:** P3
- **Effort:** 4-6 hours
- **Impact:** Fixed grid intervals

**Action:** Allow users to customize snap grid intervals

---

### Issue #60: Missing Easter Eggs

- **Status:** Open
- **Priority:** P3
- **Effort:** 2-4 hours
- **Impact:** Fun feature

**Action:** Add fun easter eggs for users to discover

---

### Issue #61: No User Onboarding Flow

- **Status:** Open
- **Priority:** P3
- **Effort:** 12-16 hours
- **Impact:** New users confused

**Action:** Create guided tour for first-time users

---

### Issue #62: Asset Panel Resize Handle Could Be More Visible

- **Status:** Open
- **Priority:** P3
- **Location:** `/components/editor/AssetPanel.tsx`
- **Effort:** 1-2 hours
- **Impact:** Users don't notice resize option

**Action:** Make resize handle more prominent

---

### Issue #63: No Timeline Snap Toggle Shortcut

- **Status:** Open
- **Priority:** P3
- **Effort:** 2-3 hours
- **Impact:** Must use settings to toggle snap

**Action:** Add keyboard shortcut to toggle snap on/off

---

### Issue #64: Timeline Playhead Could Show Time Tooltip

- **Status:** Open
- **Priority:** P3
- **Effort:** 2-3 hours
- **Impact:** Small UX improvement

**Action:** Show time tooltip when hovering over playhead

---

### Issue #65: No Project Export/Import

- **Status:** Open
- **Priority:** P3
- **Effort:** 8-12 hours
- **Impact:** Cannot backup projects locally

**Action:** Allow exporting project as JSON for backup/transfer

---

### Issue #66: Missing Clip Color Coding

- **Status:** Open
- **Priority:** P3
- **Effort:** 4-6 hours
- **Impact:** Visual organization

**Action:** Allow users to color-code clips for organization

---

### Issue #67: No Unified Generation Progress Dashboard

- **Status:** Open
- **Priority:** P3
- **Effort:** 20-24 hours
- **Impact:** Hard to track multiple AI generations

**Note:** GenerationProgress component exists but not yet integrated

---

---

## Quick Reference

### Issues by Component Area

**Timeline:** #50, #51, #92, #96, #97, #99, #25, #27, #31, #37, #100, #103, #59, #63, #64, #66
**API/Backend:** #2, #5, #6, #44, #45, #46, #87, #22
**Testing:** #42, #20
**Assets:** #52, #90, #98, #24, #29, #32, #102, #57, #62, #65
**Security:** #43, #22, #23
**Performance:** #50, #37, #21
**Documentation:** #43, #49, #19
**UX/UI:** #92, #93, #94, #95, #96, #16, #18, #56, #61

### Estimated Total Work

- **P0:** 0 hours (All resolved!)
- **P1:** 316-446 hours (down from 320-450h)
- **P2:** 341-472 hours (up from 340-470h due to Issue #2 moved from P0)
- **P3:** 100-140 hours
- **Total:** 757-1058 hours (down from 769-1074h)

### Recent Fixes (2025-10-24)

**Completed Issues:**

- Issue #145: TypeScript Build Error - Already fixed ✅
- Issue #47: Snap Visual Feedback - Fully implemented ✅
- Issue #83: Duplicate Password Validation - Consolidated ✅
- Issue #84: Orphaned Component Files - Deleted ✅
- Issue #33: Redundant ErrorBoundary Export - Fixed ✅

**Downgraded:**

- Issue #2: Mixed Middleware Patterns - P0 → P2 (94% complete)

### Sprint Planning Suggestions

**Sprint 1 - Type Safety & API Standardization (2 weeks):**

- Issue #4 (Return Types) - 30h
- Issue #5 (API Response Formats) - 4h
- Issue #6 (Input Validation) - 12h
- Issue #42 (Test Fixes) - 16h
- **Total: 62 hours**

**Sprint 2 - Timeline UX (3 weeks):**

- Issue #51 (Undo/Redo) - 32h
- Issue #99 (Clip Trimming) - 20h
- Issue #96 (Selection) - 12h
- Issue #92 (Zoom UX) - 8h
- Issue #25 (Scrolling) - 8h
- **Total: 80 hours**

**Sprint 3 - Performance & Infrastructure (2 weeks):**

- Issue #50 (Timeline Performance) - 20h
- Issue #46 (Database Indexes) - 6h
- Issue #45 (Rate Limiting) - 10h
- Issue #44 (Error Tracking) - 16h
- **Total: 52 hours**
