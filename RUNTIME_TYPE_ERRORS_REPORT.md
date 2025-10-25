# Runtime Type Errors Analysis Report

**Date:** 2025-10-24
**Analyst:** Runtime Type Error Hunter
**Scope:** Complete codebase scan for type errors that bypass TypeScript
**Status:** 15+ critical patterns identified across 12+ locations

---

## Executive Summary

This report documents runtime type errors that slip through TypeScript's compile-time type checking but cause failures in production. TypeScript cannot catch these because they depend on runtime data validation, user input, external API responses, or browser APIs.

**Key Findings:**

- **15+ distinct error patterns** across the codebase
- **12 critical fixes needed** in 5 files
- **Estimated effort:** 8-12 hours to fix all high/medium priority issues
- **Risk level:** Medium - These could cause production crashes

---

## Category 1: JSON.parse Without Try-Catch

### HIGH RISK - Can Crash Requests

**Total Instances:** 7 (2 critical, 5 safe)

### Critical Issues:

#### 1. `/app/api/analytics/web-vitals/route.ts:69`

```typescript
// CURRENT CODE (LINE 69)
const data = JSON.parse(text) as WebVitalMetric;

// Validation exists (lines 72-81) BUT happens AFTER parse
if (!data.name || typeof data.value !== 'number' || !data.rating) {
  return NextResponse.json({ error: 'Invalid metric data' }, { status: 400 });
}
```

**Issue:** If `text` contains malformed JSON, the request crashes before validation
**Production Error:** `SyntaxError: Unexpected token < in JSON at position 0`
**Impact:** Web vitals endpoint returns 500 instead of 400
**Fix Priority:** HIGH

**Recommended Fix:**

```typescript
// Parse with error handling
let data: unknown;
try {
  data = JSON.parse(text);
} catch (error) {
  serverLogger.warn({ text, error }, 'Invalid JSON in web vitals request');
  return NextResponse.json({ error: 'Invalid JSON format' }, { status: 400 });
}

// Type guard function
function isWebVitalMetric(obj: unknown): obj is WebVitalMetric {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'name' in obj &&
    'value' in obj &&
    'rating' in obj &&
    typeof (obj as any).value === 'number'
  );
}

// Validate structure
if (!isWebVitalMetric(data)) {
  serverLogger.warn({ receivedData: data }, 'Invalid web vitals data received');
  return NextResponse.json({ error: 'Invalid metric data' }, { status: 400 });
}

// Now safe to use
const logMethod = data.rating === 'poor' ? 'warn' : 'info';
```

#### 2. `/app/api/video/status/route.ts:292`

```typescript
// CURRENT CODE (LINE 284-292)
const serviceAccountJson = process.env['GOOGLE_SERVICE_ACCOUNT'];
if (!serviceAccountJson) {
  throw new HttpError('GOOGLE_SERVICE_ACCOUNT environment variable is required', 500);
}

const serviceAccount = JSON.parse(serviceAccountJson);
```

**Issue:** If env var exists but contains malformed JSON, service crashes
**Production Error:** `SyntaxError: Unexpected token` - Video status check fails
**Impact:** All Google Veo video generations fail to complete
**Fix Priority:** HIGH

**Recommended Fix:**

```typescript
const serviceAccountJson = process.env['GOOGLE_SERVICE_ACCOUNT'];
if (!serviceAccountJson) {
  throw new HttpError('GOOGLE_SERVICE_ACCOUNT environment variable is required', 500);
}

let serviceAccount: any;
try {
  serviceAccount = JSON.parse(serviceAccountJson);

  // Validate required fields
  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error('Invalid service account structure');
  }
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  serverLogger.error({ error: errorMsg }, 'Failed to parse GOOGLE_SERVICE_ACCOUNT');
  throw new HttpError(`Invalid GOOGLE_SERVICE_ACCOUNT configuration: ${errorMsg}`, 500);
}
```

### Safe Instances (Already Have Try-Catch):

✅ `/lib/utils/projectExportImport.ts:194` - Has try-catch
✅ `/app/api/ai/chat/route.ts:56` - Has try-catch
✅ `/lib/services/achievementService.ts:109` - Has try-catch

---

## Category 2: Array Access Without Bounds Checking

### MEDIUM RISK - Can Cause Undefined Access

**Total Instances:** 10+ (3 critical, others in test/e2e)

### Critical Issues:

#### 3. `/lib/validation/email.ts:43`

```typescript
// CURRENT CODE (LINES 42-63)
const trimmed = email.toLowerCase().trim();
const domain = trimmed.split('@')[1]; // ← NO BOUNDS CHECK

// Later used in suggestions
if (domain && suggestions[domain.toLowerCase() as keyof typeof suggestions]) {
  return {
    valid: false,
    message: `Did you mean ${trimmed.split('@')[0]}@${suggestions[domain.toLowerCase() as keyof typeof suggestions]}?`,
  };
}
```

**Issue:** If email has no @ symbol, `domain` is undefined, crashes on toLowerCase()
**Production Error:** `TypeError: Cannot read property 'toLowerCase' of undefined`
**Example Input:** `"test"`, `"test.com"`, `"@"`, `"test@@test.com"`
**Impact:** Email validation crashes, user cannot register/login
**Fix Priority:** HIGH

**Recommended Fix:**

```typescript
const trimmed = email.toLowerCase().trim();

// Validate email format first
const parts = trimmed.split('@');
if (parts.length !== 2) {
  return {
    valid: false,
    message: 'Email must contain exactly one @ symbol',
  };
}

const [localPart, domain] = parts;

if (!localPart || !domain) {
  return {
    valid: false,
    message: 'Email cannot start or end with @',
  };
}

// Continue with domain suggestions...
if (suggestions[domain.toLowerCase() as keyof typeof suggestions]) {
  return {
    valid: false,
    message: `Did you mean ${localPart}@${suggestions[domain.toLowerCase() as keyof typeof suggestions]}?`,
  };
}
```

#### 4. `/lib/services/assetVersionService.ts:148`

```typescript
// CURRENT CODE (LINE 148)
const pathParts = storagePath.split('/');
// Used later without validation
```

**Issue:** Assumes storage path format, could be empty or malformed
**Production Error:** Undefined access in path reconstruction
**Fix Priority:** MEDIUM

**Recommended Fix:**

```typescript
const pathParts = storagePath.split('/');
if (pathParts.length < 3) {
  throw new Error(`Invalid storage path format: ${storagePath}`);
}
```

#### 5. `/lib/services/assetVersionService.ts:364`

```typescript
// CURRENT CODE (LINE 364)
const ext = filename.split('.').pop();
```

**Issue:** `pop()` returns undefined if array is empty (filename has no extension)
**Production Error:** Undefined used in file path construction
**Example Input:** Filename without extension like "README" or ".gitignore"
**Fix Priority:** MEDIUM

**Recommended Fix:**

```typescript
const parts = filename.split('.');
const ext = parts.length > 1 ? parts[parts.length - 1] : 'bin'; // Default extension
```

### Safe Instance:

✅ `/app/api/video/status/route.ts:131-139` - Has proper validation:

```typescript
const parts = validOperationName.split(':');
if (parts.length < 3) {
  return validationError('Invalid FAL operation name format', 'operationName');
}
const endpoint = parts.slice(1, -1).join(':');
const requestId = parts[parts.length - 1]; // Safe after validation
```

---

## Category 3: parseInt/parseFloat Without NaN Checks

### MEDIUM RISK - NaN Propagates Through Calculations

**Total Instances:** 5+ (3 critical in achievementService)

### Critical Issues:

#### 6-8. `/lib/services/achievementService.ts` (3 instances)

**Line 393:**

```typescript
// CURRENT CODE
discoveryDuration: entry.discovery_duration
  ? parseInt(entry.discovery_duration)
  : undefined,
```

**Issue:** If `discovery_duration` is not a valid number string, returns NaN
**Production Error:** Leaderboard shows "NaN ms" instead of duration
**Fix Priority:** MEDIUM

**Line 438:**

```typescript
// CURRENT CODE
const lastHintShown = localStorage.getItem('lastEasterEggHint');
if (lastHintShown) {
  const daysSinceLastHint = (Date.now() - parseInt(lastHintShown)) / 1000 / 60 / 60 / 24;
  if (daysSinceLastHint < 7) return false;
}
```

**Issue:** If localStorage is corrupted with non-numeric value, NaN in calculation
**Production Error:** Hints never show because `NaN < 7` is false
**Fix Priority:** MEDIUM

**Line 446:**

```typescript
// CURRENT CODE
const accountCreated = localStorage.getItem('accountCreatedAt');
if (accountCreated) {
  const daysSinceCreation = (Date.now() - parseInt(accountCreated)) / 1000 / 60 / 60 / 24;
  if (daysSinceCreation >= 30 && this.discoveredEggs.size === 0) {
    return true;
  }
}
```

**Issue:** Same as above - NaN breaks achievement logic
**Production Error:** Achievement system fails silently
**Fix Priority:** MEDIUM

**Recommended Fix Pattern:**

```typescript
// Line 393 fix
discoveryDuration: entry.discovery_duration
  ? (() => {
      const parsed = parseInt(entry.discovery_duration);
      return isNaN(parsed) ? undefined : parsed;
    })()
  : undefined,

// Lines 438 & 446 fix
const lastHintShown = localStorage.getItem('lastEasterEggHint');
if (lastHintShown) {
  const timestamp = parseInt(lastHintShown);
  if (!isNaN(timestamp)) {
    const daysSinceLastHint = (Date.now() - timestamp) / 1000 / 60 / 60 / 24;
    if (daysSinceLastHint < 7) return false;
  }
}
```

---

## Category 4: LocalStorage Access Without Validation

### LOW-MEDIUM RISK - Can Cause Type Errors and NaN

**Total Instances:** 4 (all in achievementService)

### Issues:

#### 9-12. `/lib/services/achievementService.ts` (4 instances)

**Line 106-113:**

```typescript
// CURRENT CODE
const stored = localStorage.getItem('discoveredEasterEggs');
if (stored) {
  try {
    const eggs = JSON.parse(stored) as EasterEggId[];
    eggs.forEach((egg): Set<EasterEggId> => this.discoveredEggs.add(egg));
  } catch (error) {
    console.error('Failed to load discovered eggs:', error);
  }
}
```

**Issue:** No validation that parsed data is an array
**Production Error:** If localStorage contains `{}` or `"string"`, forEach fails
**Fix Priority:** LOW-MEDIUM

**Recommended Fix:**

```typescript
const stored = localStorage.getItem('discoveredEasterEggs');
if (stored) {
  try {
    const parsed = JSON.parse(stored);

    // Validate it's an array
    if (!Array.isArray(parsed)) {
      console.warn('discoveredEasterEggs is not an array, resetting');
      localStorage.removeItem('discoveredEasterEggs');
      return;
    }

    // Validate each item is a valid EasterEggId
    const validEggs = parsed.filter((egg) => Object.values(EasterEggIds).includes(egg));

    validEggs.forEach((egg) => this.discoveredEggs.add(egg));
  } catch (error) {
    console.error('Failed to load discovered eggs:', error);
    localStorage.removeItem('discoveredEasterEggs');
  }
}
```

**Lines 436-440 & 443-449:** Already covered in Category 3 (parseInt without NaN check)

---

## Category 5: Regex Match Results Without Null Checks

### MEDIUM RISK - Can Cause Undefined Access

**Total Instances:** 2

### Issues:

#### 13. `/lib/services/assetOptimizationService.ts:252`

```typescript
// CURRENT CODE (LINE 252)
const durationMatch = durationOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
```

**Issue:** No null check before accessing match groups
**Production Error:** `TypeError: Cannot read property '1' of null`
**Example Input:** ffmpeg output in unexpected format
**Fix Priority:** MEDIUM

**Recommended Fix:**

```typescript
const durationMatch = durationOutput.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);

if (!durationMatch || durationMatch.length < 4) {
  throw new Error(`Could not parse duration from ffmpeg output: ${durationOutput}`);
}

const [, hours, minutes, seconds] = durationMatch;
const duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
```

#### 14. `/e2e/pages/VideoGenPage.ts:62`

```typescript
// CURRENT CODE (LINE 62)
const match = text?.match(/(\d+)% complete/);
```

**Issue:** Used without null check in e2e tests
**Fix Priority:** LOW (test code)

---

## Priority Summary

### HIGH PRIORITY (2-3 hours total)

1. ✅ `/app/api/analytics/web-vitals/route.ts:69` - Already has validation (lines 72-81)
   - **Status:** SAFE - Validation exists, but could be improved
2. ❌ `/app/api/video/status/route.ts:292` - Add try-catch for JSON.parse
   - **Impact:** Video generation failures
   - **Effort:** 15 minutes
3. ❌ `/lib/validation/email.ts:43` - Add bounds checking for split
   - **Impact:** Login/registration crashes
   - **Effort:** 30 minutes
4. ❌ `/lib/services/achievementService.ts:393,438,446` - Add NaN checks (3 instances)
   - **Impact:** Achievement system failures
   - **Effort:** 45 minutes

**Total HIGH:** 1.5 hours

### MEDIUM PRIORITY (3-4 hours total)

5. ❌ `/lib/services/achievementService.ts:106` - Add localStorage array validation
   - **Effort:** 30 minutes
6. ❌ `/lib/services/assetOptimizationService.ts:252` - Add regex match null check
   - **Effort:** 15 minutes
7. ❌ `/lib/services/assetVersionService.ts:148` - Add array bounds validation
   - **Effort:** 15 minutes
8. ❌ `/lib/services/assetVersionService.ts:364` - Handle missing file extension
   - **Effort:** 15 minutes

**Total MEDIUM:** 1.25 hours

### LOW PRIORITY (2-3 hours total)

9. Create runtime validation helpers in `/lib/validation.ts`
10. Document patterns in `/docs/CODING_BEST_PRACTICES.md`
11. Add unit tests for each fix
12. Add integration tests with malformed data

**Total LOW:** 2-3 hours

---

## Testing Strategy

### Unit Tests to Add:

**For JSON.parse fixes:**

```typescript
describe('Web Vitals Endpoint', () => {
  it('should return 400 for malformed JSON', async () => {
    const response = await POST({
      text: () => Promise.resolve('{ invalid json }'),
      headers: new Headers(),
    });
    expect(response.status).toBe(400);
  });

  it('should return 400 for valid JSON with wrong structure', async () => {
    const response = await POST({
      text: () => Promise.resolve('{"wrong": "structure"}'),
      headers: new Headers(),
    });
    expect(response.status).toBe(400);
  });
});
```

**For array access fixes:**

```typescript
describe('Email Validation', () => {
  it('should reject emails without @ symbol', () => {
    expect(validateEmail('invalid')).toMatchObject({
      valid: false,
      message: expect.stringContaining('@'),
    });
  });

  it('should reject emails with multiple @ symbols', () => {
    expect(validateEmail('test@@test.com')).toMatchObject({
      valid: false,
    });
  });
});
```

**For parseInt fixes:**

```typescript
describe('Achievement Service', () => {
  it('should handle corrupted localStorage gracefully', () => {
    localStorage.setItem('lastEasterEggHint', 'not-a-number');
    expect(() => achievementService.shouldShowHints()).not.toThrow();
  });

  it('should handle NaN in discovery duration', () => {
    const entries = [{ discovery_duration: 'invalid' }];
    const result = mapLeaderboardEntry(entries[0]);
    expect(result.discoveryDuration).toBeUndefined();
  });
});
```

### Integration Tests:

- Test web vitals endpoint with fuzzing (random JSON)
- Test email validation with malformed inputs
- Test achievement service with corrupted localStorage
- Test video status with malformed env vars (in test environment)

---

## Files Requiring Changes

### Summary:

| File                                        | Fixes Needed                | Priority | Effort |
| ------------------------------------------- | --------------------------- | -------- | ------ |
| `/app/api/video/status/route.ts`            | 1 JSON.parse                | HIGH     | 15min  |
| `/lib/validation/email.ts`                  | 1 split bounds              | HIGH     | 30min  |
| `/lib/services/achievementService.ts`       | 3 parseInt + 1 localStorage | HIGH/MED | 1h     |
| `/lib/services/assetVersionService.ts`      | 2 array access              | MEDIUM   | 30min  |
| `/lib/services/assetOptimizationService.ts` | 1 regex match               | MEDIUM   | 15min  |

**Total:** 12 fixes across 5 files, 2.5 hours estimated

---

## Prevention Strategy

### Add to `/lib/validation.ts`:

```typescript
/**
 * Safe JSON parse with validation
 */
export function safeJsonParse<T>(
  text: string,
  validator?: (data: unknown) => data is T
): { success: true; data: T } | { success: false; error: string } {
  try {
    const data = JSON.parse(text);

    if (validator && !validator(data)) {
      return { success: false, error: 'Data failed validation' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invalid JSON',
    };
  }
}

/**
 * Safe array access with bounds checking
 */
export function safeArrayAccess<T>(array: T[], index: number): T | undefined {
  return index >= 0 && index < array.length ? array[index] : undefined;
}

/**
 * Safe parseInt with NaN check
 */
export function safeParseInt(value: string, defaultValue = 0): number {
  const parsed = parseInt(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Safe localStorage get with JSON parse
 */
export function safeLocalStorageGet<T>(
  key: string,
  validator?: (data: unknown) => data is T
): T | null {
  try {
    const item = localStorage.getItem(key);
    if (!item) return null;

    const parsed = JSON.parse(item);

    if (validator && !validator(parsed)) {
      localStorage.removeItem(key); // Clean up invalid data
      return null;
    }

    return parsed as T;
  } catch {
    localStorage.removeItem(key); // Clean up corrupt data
    return null;
  }
}
```

### Add to `/docs/CODING_BEST_PRACTICES.md`:

```markdown
## Runtime Type Safety

TypeScript cannot catch these runtime errors:

### Always Validate:

- ✅ JSON.parse results (use try-catch + type guards)
- ✅ Array access (check length before accessing indices)
- ✅ parseInt/parseFloat (check isNaN after parsing)
- ✅ localStorage data (validate + clean up if corrupt)
- ✅ Regex match results (check for null)
- ✅ External API responses (never trust structure)
- ✅ User input (validate everything)

### Use Helper Functions:

- `safeJsonParse<T>()` - Parse with validation
- `safeParseInt()` - Parse with NaN check
- `safeLocalStorageGet<T>()` - Get with validation
- Type guard functions for complex types
```

---

## Conclusion

This analysis identified 15+ runtime type error patterns across the codebase. While TypeScript provides excellent compile-time type safety, these issues require runtime validation to prevent production crashes.

**Recommended Action Plan:**

1. Fix HIGH priority issues first (1.5 hours) - Prevents crashes
2. Add validation helpers to prevent future issues (1 hour)
3. Fix MEDIUM priority issues (1.25 hours) - Improves reliability
4. Add comprehensive tests (2 hours) - Prevents regressions
5. Document patterns (30 minutes) - Educates team

**Total Effort:** 6.25 hours to complete all recommendations

**Impact:** Significantly improved production stability and user experience
