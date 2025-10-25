# Real Codebase Issues (Discovered 2025-10-24)

**Status:** 10 critical TypeScript/build issues found (1 fixed)
**Priority Breakdown:** P0: 2 | P1: 4 | P2: 3 | Fixed: 1

## Priority 0: Build-Blocking Issues

### Issue #1: Next.js 16 API Route Parameter Types (30+ errors)

- **Priority:** P0
- **Effort:** 6-8 hours
- **Impact:** TypeScript compilation fails, breaks IDE support
- **Files Affected:** ~15 API route files
- **Error Pattern:** `Property 'params' is missing in type 'AuthContext' but required`
- **Root Cause:** Next.js 16 changed params to Promise<T>, withAuth wrapper not updated

### Issue #2: Rate Limit Tier Names Mismatch (12 errors) ✅ FIXED

- **Priority:** P0
- **Status:** FIXED in commit a0611c6
- **Fixed Date:** 2025-10-24
- **Effort:** 2-3 hours
- **Impact:** TypeScript errors, incorrect rate limiting
- **Missing Tiers:** tier3_read, tier2_read, tier2_write, tier2_ai_video_upload
- **Files Affected:** share-links, invites, collaborators, templates routes
- **Resolution:** All incorrect tier names replaced with correct ones from RATE_LIMITS config:
  - tier3_read → tier3_status_read (3 occurrences)
  - tier2_ai_video_upload → tier2_resource_creation (6 occurrences)
  - tier2_read → tier3_status_read (1 occurrence)
  - tier2_write → tier2_resource_creation (2 occurrences)

### Issue #3: Stripe Webhook Type Errors (20+ errors)

- **Priority:** P0
- **Effort:** 4-6 hours
- **Impact:** Stripe subscription webhooks fail to compile
- **Error:** User profile table type resolved as `never`
- **Root Cause:** Database type generation issue or schema mismatch

## Priority 1: High Priority Issues

### Issue #4: Server Logger Incorrect Usage (15+ errors)

- **Priority:** P1
- **Effort:** 3-4 hours
- **Impact:** Logging doesn't work correctly
- **Error Pattern:** `Argument of type '{}' is not assignable to parameter of type 'number'`
- **Root Cause:** serverLogger.error() signature expects (message, context) but receiving (context)

### Issue #5: JSX Namespace Errors in Components (4 errors)

- **Priority:** P1
- **Effort:** 1-2 hours
- **Impact:** Components don't type-check
- **Files:** ActivityHistory.tsx, AudioWaveform.tsx
- **Error:** `Cannot find namespace 'JSX'`
- **Root Cause:** Missing React import or incorrect tsconfig

### Issue #6: Null Safety Issues (5+ errors)

- **Priority:** P1
- **Effort:** 2-3 hours
- **Impact:** Potential runtime crashes
- **Files:** video/status/route.ts, useEditorHandlers.ts
- **Error Pattern:** `'operationName' is possibly 'null'`, `Type 'undefined' is not assignable`

### Issue #7: Unused Variables (10+ warnings)

- **Priority:** P1
- **Effort:** 1 hour
- **Impact:** Code quality, ESLint errors
- **Pattern:** `'req' is declared but its value is never read`
- **Files:** Multiple API routes

## Priority 2: Medium Priority Issues

### Issue #8: Button Component Type Mismatch

- **Priority:** P2
- **Effort:** 30 minutes
- **Impact:** One component doesn't type-check
- **File:** BackupButton.tsx
- **Error:** `Type '"sm" | "lg" | "md"' is not assignable to type '"default" | "icon" | "sm" | "lg"'`

### Issue #9: Supabase Insert Type Errors (2 errors)

- **Priority:** P2
- **Effort:** 1-2 hours
- **Impact:** Database inserts may fail
- **Files:** user/delete-account/route.ts
- **Error:** Type mismatches in user_activity_history inserts

### Issue #10: Templates Route Type Errors (4 errors)

- **Priority:** P2
- **Effort:** 1-2 hours
- **Impact:** Templates API doesn't type-check
- **File:** templates/route.ts
- **Errors:** AuthContext signature mismatches

## Summary

**Total TypeScript Errors:** 58+ (12 fixed)
**Critical (P0):** 2 issues (50 errors)
**High (P1):** 4 issues (30+ errors)
**Medium (P2):** 3 issues (10 errors)
**Fixed:** 1 issue (12 errors)

**Estimated Total Effort:** 23-32 hours (2-3 hours completed)
