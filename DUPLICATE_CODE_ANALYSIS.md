# Duplicate Code Analysis Report

Generated: October 24, 2025

## Summary
This comprehensive analysis identifies duplicate code patterns, components, functions, and types across the codebase that could be consolidated to improve maintainability and reduce technical debt.

---

## 1. DUPLICATE API RESPONSE/ERROR HANDLING

### Issue: Two Separate Response Utility Files
There are two files with overlapping error response functionality:

**Files:**
- `/lib/api/response.ts` (310 lines)
- `/lib/api/errorResponse.ts` (139 lines)

**Duplicated Functions:**
- `errorResponse()` - defined in both files (lines 55-72 and 51-68)
- Error response creation helpers (badRequest, unauthorized, forbidden, notFound, conflict, tooManyRequests, internal, serviceUnavailable)

**Key Differences:**
- `response.ts` includes `successResponse()`, `withErrorHandling()`, and specific helper functions
- `errorResponse.ts` uses logging context with `serverLogger` 
- `response.ts` uses `HttpStatusCode` enum while `errorResponse.ts` uses raw numbers

**Recommendation:** Merge into single file `/lib/api/response.ts` and consolidate error logging

---

## 2. DUPLICATE VALIDATION LOGIC

### Issue: Two Separate Validation Modules
Overlapping validation functionality across two files:

**Files:**
- `/lib/validation.ts` (150+ lines)
- `/lib/api/validation.ts` (150+ lines)

**Duplicated Functions:**
- `validateUUID()` - similar implementations in both files
- `validateString()` / `validateStringLength()` - similar pattern validation
- `validateEnum()` - enum validation logic

**Key Differences:**
- `validation.ts` uses assertion functions (type guards)
- `api/validation.ts` returns ValidationError objects
- Different error handling approaches

**Recommendation:** Create unified validation module with both assertion and error-returning variants

---

## 3. DUPLICATE TIME FORMATTING UTILITIES

### Issue: Two Time Formatting Functions
Time formatting implemented twice with different approaches:

**Files:**
- `/lib/utils/timelineUtils.ts` (line 9)
- `/lib/utils/videoUtils.ts` (line 258)

**Functions:**
- `formatTime()` - MM:SS.CS format with centiseconds
```typescript
// timelineUtils.ts line 9
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
```

- `formatTimecode()` - MM:SS:FF format with 30fps frames
```typescript
// videoUtils.ts line 258
export const formatTimecode = (seconds: number): string => {
  const safe = Math.max(0, seconds);
  const totalSeconds = Math.floor(safe);
  const minutes = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const frames = Math.floor((safe - totalSeconds) * 30 + 0.0001);
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(2, '0')}`;
};
```

**Recommendation:** Keep both but clarify purpose (one for UI display, one for video timecode), or create unified formatter with format option

---

## 4. DUPLICATE ASSET PANEL COMPONENTS

### Issue: AssetPanel Component Defined in Two Locations
Nearly identical component with minor variations:

**Files:**
- `/app/editor/[projectId]/AssetPanel.tsx` (347 lines)
- `/components/editor/AssetPanel.tsx` (366 lines)

**Differences:**
- App version uses `type` instead of `interface`
- App version calls handlers `onAssetClick`, component version calls `onAssetAdd`
- App version imports from `./editorUtils`, component version standalone
- Component version has more comprehensive JSDoc comments

**Recommendation:** Use single component from `/components/editor/AssetPanel.tsx` throughout application

---

## 5. DUPLICATE KEYFRAME PREVIEW COMPONENTS

### Issue: KeyframePreview Component in Two Locations
Similar implementation in different directories:

**Files:**
- `/components/keyframes/KeyframePreview.tsx`
- `/components/keyframes/components/KeyframePreview.tsx`

**Status:** Both appear to have similar structure with same props interface

**Recommendation:** Consolidate into single file, potentially creating index.ts barrel export

---

## 6. DUPLICATE LOGGER TYPES

### Issue: Logger Type Defined in Multiple Files
Type definitions across client and server loggers:

**Files:**
- `/lib/browserLogger.ts` (line 433)
- `/lib/serverLogger.ts` (line 109)

**Code:**
```typescript
// Both define:
export type Logger = ...;
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
```

**Recommendation:** Extract shared types to `/lib/logging/types.ts` and import in both

---

## 7. DUPLICATE STATUS CHECK API ROUTES

### Issue: Similar Status Checking Endpoints with Duplicated Logic
Multiple status check routes with overlapping code patterns:

**Files:**
- `/app/api/video/status/route.ts` (100+ lines)
- `/app/api/video/upscale-status/route.ts` (100+ lines)
- `/app/api/video/generate-audio-status/route.ts` (100+ lines)

**Duplicated Patterns:**
1. User authentication check
```typescript
const { data: { user }, error: userError } = await supabase.auth.getUser();
if (userError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

2. API key validation
```typescript
const falKey = process.env['FAL_API_KEY'];
if (!falKey) {
  return NextResponse.json({ error: 'FAL_API_KEY not configured on server' }, { status: 500 });
}
```

3. Timeout handling with AbortController
```typescript
const controller1 = new AbortController();
const timeout1 = setTimeout(() => controller1.abort(), 60000);
```

**Recommendation:** Extract common status-checking logic into utility function or create base handler

---

## 8. DUPLICATE MODAL COMPONENTS

### Issue: Modal Structure Duplicated Across Components
Similar modal implementation patterns:

**Files:**
- `/app/editor/[projectId]/AudioGenerationModal.tsx` (lines 36-38)
- `/app/editor/[projectId]/VideoGenerationModal.tsx` (lines 29-30)

**Duplicated HTML/CSS:**
```jsx
// Both use identical modal wrapper structure:
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6">
  <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-lg font-semibold text-neutral-900">...</h3>
      <button>
        <svg>...</svg>
      </button>
    </div>
```

**Recommendation:** Create reusable Modal wrapper component in `/components/ui/Modal.tsx`

---

## 9. DUPLICATE TEST HELPER UTILITIES

### Issue: Test Helpers Distributed Across Multiple Locations
Test utilities are scattered and potentially duplicated:

**Files:**
- `/test-utils/testHelpers.ts`
- `/test-utils/legacy-helpers/` (multiple files)
- `/__tests__/integration/helpers/integration-helpers.ts`

**Recommendation:** Consolidate into single test utilities location with clear exports

---

## 10. DUPLICATE SANITIZATION AND VALIDATION

### Issue: Input Sanitization Spread Across Files
Sanitization logic appears in multiple locations:

**Files:**
- `/lib/api/sanitization.ts` (465 lines)
- `/app/api/assets/upload/route.ts` (has inline sanitization)
- `/lib/hooks/useAssetUpload.ts` (has validation)

**Functions Defined in Sanitization Module:**
- `sanitizeString()`
- `sanitizeEmail()`
- `sanitizeUrl()`
- `sanitizeUUID()`
- `sanitizeInteger()`
- `sanitizeNumber()`
- `sanitizeBoolean()`
- `sanitizeObject()`
- `removeSQLPatterns()`
- `sanitizeFilename()`

**Recommendation:** API routes and hooks should import from `lib/api/sanitization.ts` rather than defining inline

---

## 11. DUPLICATE SERVICE LAYER PATTERNS

### Issue: Similar Service Class Structure
All service classes follow similar patterns that could benefit from base class:

**Files:**
- `/lib/services/assetService.ts`
- `/lib/services/audioService.ts`
- `/lib/services/authService.ts`
- `/lib/services/projectService.ts`
- `/lib/services/userService.ts`
- `/lib/services/videoService.ts`

**Common Patterns:**
1. Constructor with dependency injection
2. Error handling with try-catch
3. Logging with serverLogger
4. Cache invalidation calls

**Recommendation:** Create base `BaseService` class with shared patterns

---

## 12. DUPLICATE TYPE DEFINITIONS FOR API REQUESTS

### Issue: Similar Request Type Patterns Across API Types
In `/types/api.ts`, many request types follow similar patterns:

**Examples:**
- `GenerateVideoRequest` (line 122)
- `GenerateImageRequest` (line 166)
- `GenerateSunoMusicRequest` (line 234)

All contain similar fields for generation requests but lack shared interface

**Recommendation:** Create base request types or use generics to reduce duplication

---

## 13. MOCK UTILITIES DUPLICATION

### Issue: Test Mocks Defined in Multiple Locations
Mock implementations spread across test utilities:

**Files:**
- `/__mocks__/lib/api/response.ts`
- `/__mocks__/lib/auditLog.ts`
- `/__mocks__/lib/cache.ts`
- `/__mocks__/lib/browserLogger.ts`
- `/__mocks__/lib/serverLogger.ts`
- `/test-utils/mockSupabase.ts`
- `/test-utils/mockStripe.ts`
- `/test-utils/mockApiResponse.ts`

**Recommendation:** Consolidate mock factories into centralized location with clear organization

---

## Summary of Duplicates by Category

| Category | Count | Severity | Impact |
|----------|-------|----------|--------|
| Response/Error Handling | 2 files | High | Inconsistent error handling |
| Validation Functions | 2 files | High | Duplicate validation logic |
| Time Formatting | 2 functions | Medium | Maintenance burden |
| Components (AssetPanel) | 2 locations | High | Component duplication |
| Components (KeyframePreview) | 2 locations | Medium | Component duplication |
| Type Definitions | Scattered | Medium | Type inconsistency |
| Service Patterns | 6 services | Low | Structural duplication |
| Test Utilities | Multiple | Medium | Test maintainability |
| Mock Utilities | 8+ mocks | Low | Test setup complexity |
| API Status Routes | 3 routes | Medium | Code duplication |
| Modal Structure | Multiple | Low | CSS/HTML duplication |

---

## Recommended Priority Order

1. **HIGH (Fix First):** Merge response.ts and errorResponse.ts
   - Impact: Reduces error handling confusion and consolidates logging
   - Effort: Medium
   - Files affected: ~20 imports

2. **HIGH (Fix First):** Consolidate validation.ts and api/validation.ts
   - Impact: Single source of truth for validation
   - Effort: Medium-High
   - Files affected: ~30 imports

3. **HIGH (Fix Second):** Remove duplicate AssetPanel component
   - Impact: Eliminates component maintenance burden
   - Effort: Low
   - Files affected: 1-2 imports to update

4. **MEDIUM (Fix Soon):** Consolidate time formatting functions
   - Impact: Clear purpose distinction for formatters
   - Effort: Low
   - Files affected: ~5 imports

5. **MEDIUM (Fix Soon):** Extract modal wrapper component
   - Impact: Reduces CSS/HTML duplication
   - Effort: Low
   - Files affected: 2-3 components

6. **MEDIUM (Fix Later):** Consolidate test utilities and mocks
   - Impact: Improved test maintainability
   - Effort: High (many files)
   - Files affected: 20+ test files

7. **LOW (Refactor):** Create base service class for services
   - Impact: Reduces structural duplication
   - Effort: Medium
   - Files affected: 6 services

---

## Code Metrics

- **Total Files Analyzed:** ~400 source files (excluding node_modules)
- **Duplicate Patterns Found:** 13 major categories
- **Estimated Lines of Duplicate Code:** 500+
- **Components with Duplicates:** 3
- **Utility Functions with Duplicates:** 2
- **API Routes with Similar Patterns:** 3

---

## Next Steps

1. Review this report with the team
2. Prioritize high-impact items
3. Create GitHub issues for each duplicate consolidation
4. Update documentation after refactoring
5. Run full test suite after changes
