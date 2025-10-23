# Testing Guide

Comprehensive testing strategy and guidelines for the Non-Linear Video Editor.

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Testing Strategy](#testing-strategy)
3. [Test Types](#test-types)
4. [Manual Testing Guide](#manual-testing-guide)
5. [API Testing](#api-testing)
6. [Database Testing](#database-testing)
7. [Security Testing](#security-testing)
8. [Performance Testing](#performance-testing)
9. [Writing Tests](#writing-tests)
10. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

This project currently focuses on **manual testing** and **integration testing** to ensure functionality. While automated unit tests are not yet implemented, this guide provides:

- Manual testing procedures
- API testing with examples
- Security verification steps
- Performance benchmarks
- Future testing roadmap

### Current Testing Approach
- Manual feature testing before each release
- API endpoint testing via tools (Postman, curl)
- Database integrity checks
- Security policy verification
- Performance monitoring

---

## Testing Strategy

### Testing Pyramid

```
       /\
      /  \        E2E Tests (Manual)
     /____\       - User flows
    /      \      - Critical paths
   /________\
  /          \    Integration Tests (Manual + API)
 /____________\   - API endpoints
/              \  - Database operations
/________________\ Unit Tests (Future)
                   - Pure functions
                   - Utilities
```

### Priority Levels

**P0 (Critical)**: Must test before every release
- User authentication
- Project creation/deletion
- File upload/download
- Timeline save/load
- Security policies

**P1 (High)**: Test for major features
- Video generation
- Scene detection
- AI chat
- Asset management

**P2 (Medium)**: Test periodically
- UI interactions
- Keyboard shortcuts
- Error messages

**P3 (Low)**: Nice to have
- Tooltips
- Animation smoothness
- Loading states

---

## Test Types

### 1. Functional Testing
Verify features work as expected.

### 2. Integration Testing
Test API endpoints and database operations.

### 3. Security Testing
Verify RLS policies and authentication.

### 4. Performance Testing
Measure response times and resource usage.

### 5. Regression Testing
Ensure bug fixes don't break existing features.

---

## Manual Testing Guide

### Authentication Flow Testing

#### Test Case: User Signup
```
Prerequisites: None
Steps:
1. Go to /signup
2. Enter email: test@example.com
3. Enter password: Test123!@# (meets requirements)
4. Enter confirm password: Test123!@#
5. Click "Sign Up"

Expected Results:
✅ Success message appears
✅ Redirect to /editor (or /signin if email confirmation required)
✅ User record created in auth.users
✅ No errors in console

Edge Cases to Test:
- Weak password → Shows error
- Mismatched passwords → Shows error
- Existing email → Shows error
- Invalid email format → Shows error
```

#### Test Case: User Signin
```
Prerequisites: User account exists
Steps:
1. Go to /signin
2. Enter email
3. Enter password
4. Click "Sign In"

Expected Results:
✅ Redirect to /editor
✅ Session cookie set
✅ User ID in auth state
✅ No errors in console

Edge Cases:
- Wrong password → Shows error
- Non-existent email → Shows error
- Empty fields → Shows validation errors
```

#### Test Case: Password Reset
```
Prerequisites: User account exists
Steps:
1. Go to /forgot-password
2. Enter email
3. Click "Send Reset Link"
4. Check email for reset link
5. Click link
6. Enter new password
7. Confirm new password
8. Submit

Expected Results:
✅ Email sent (check logs if SMTP configured)
✅ Reset link valid for 1 hour
✅ Password updated successfully
✅ Can sign in with new password
```

### Project Management Testing

#### Test Case: Create Project
```
Prerequisites: Authenticated user
Steps:
1. Go to /editor
2. Click "New Project"
3. Enter project name: "Test Project"
4. Click "Create"

Expected Results:
✅ Project appears in project list
✅ Redirect to /editor/[projectId]
✅ Database record created
✅ Empty timeline loaded
✅ Project owned by current user
```

#### Test Case: Delete Project
```
Prerequisites: User owns project
Steps:
1. Go to project
2. Click "Delete Project"
3. Confirm deletion

Expected Results:
✅ Project removed from list
✅ Database record deleted
✅ Associated assets deleted (cascade)
✅ Storage files deleted
```

### Asset Management Testing

#### Test Case: Upload Video
```
Prerequisites: Project open
Steps:
1. Click "Upload Asset"
2. Select video file (< 500MB)
3. Wait for upload

Expected Results:
✅ Progress bar shows upload
✅ Asset appears in asset panel
✅ Thumbnail generated
✅ File stored in correct path: {user_id}/{project_id}/
✅ Database record created
✅ Can drag to timeline

Edge Cases:
- File too large → Shows error
- Invalid MIME type → Shows error
- Network error → Retry or error message
```

#### Test Case: Upload Image
```
Steps:
1. Upload PNG/JPEG image
2. Verify appears in assets
3. Drag to timeline
4. Verify displays in preview

Expected Results:
✅ Image loads correctly
✅ Maintains aspect ratio
✅ Can be used as video frame
```

### Timeline Editing Testing

#### Test Case: Add Clip to Timeline
```
Prerequisites: Asset uploaded
Steps:
1. Drag asset from library
2. Drop onto timeline track
3. Release

Expected Results:
✅ Clip appears on timeline
✅ Correct duration
✅ Positioned at drop location
✅ Can be selected
✅ State saved to database (after 2s)
```

#### Test Case: Move Clip
```
Steps:
1. Click and hold clip
2. Drag to new position
3. Release

Expected Results:
✅ Clip moves smoothly
✅ Snaps to grid (if enabled)
✅ Doesn't overlap other clips
✅ Undo/redo works
✅ Change saved
```

#### Test Case: Trim Clip
```
Steps:
1. Hover over clip edge
2. Cursor changes to resize
3. Drag edge left/right
4. Release

Expected Results:
✅ Clip duration changes
✅ Start/end time updates
✅ Video preview updates
✅ Minimum 0.1s duration enforced
✅ Undo/redo works
```

#### Test Case: Delete Clip
```
Steps:
1. Select clip
2. Press Delete key (or click delete button)

Expected Results:
✅ Clip removed from timeline
✅ Gap remains (or clips shift if enabled)
✅ Undo restores clip
✅ Change saved
```

#### Test Case: Undo/Redo
```
Prerequisites: Some timeline changes made
Steps:
1. Press Cmd/Ctrl + Z (undo)
2. Verify previous state restored
3. Press Cmd/Ctrl + Shift + Z (redo)
4. Verify change re-applied

Expected Results:
✅ Up to 50 actions can be undone
✅ State restores correctly
✅ No data corruption
✅ Works for all action types
```

### Playback Testing

#### Test Case: Play Video
```
Prerequisites: Clips on timeline
Steps:
1. Click play button
2. Observe playback
3. Click pause

Expected Results:
✅ All tracks play simultaneously
✅ Audio synchronized
✅ Smooth 30fps playback
✅ Playhead moves correctly
✅ Buffering handled gracefully
```

#### Test Case: Scrubbing
```
Steps:
1. Click and drag playhead
2. Move across timeline
3. Release

Expected Results:
✅ Preview updates in real-time
✅ Audio scrubs (if enabled)
✅ No lag or jank
✅ Precise frame control
```

### AI Features Testing

#### Test Case: AI Chat
```
Prerequisites: GEMINI_API_KEY configured
Steps:
1. Open chat panel
2. Type: "How do I add a transition?"
3. Send message

Expected Results:
✅ Message sent
✅ AI responds within 5s
✅ Helpful response
✅ Context-aware (knows about project)
✅ Message history saved
```

#### Test Case: Video Generation
```
Prerequisites: GOOGLE_SERVICE_ACCOUNT configured
Steps:
1. Click "Generate Video"
2. Enter prompt: "A sunset over mountains"
3. Submit

Expected Results:
✅ Job submitted
✅ Status polling starts
✅ Progress updates shown
✅ Video downloads when ready
✅ Added to assets automatically
✅ Processing job tracked in database
```

---

## API Testing

### Using curl

#### Test: Create Project
```bash
# Get session cookie first (signin)
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!@#"}' \
  -c cookies.txt

# Create project
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"API Test Project"}'

# Expected: 201 Created
# Response: {"project":{"id":"...","title":"API Test Project"}}
```

#### Test: Upload Asset
```bash
curl -X POST http://localhost:3000/api/assets/upload \
  -b cookies.txt \
  -F "file=@test.mp4" \
  -F "projectId=xxx" \
  -F "type=video"

# Expected: 200 OK
# Response: {"assetId":"...","storageUrl":"...","success":true}
```

#### Test: Generate Signed URL
```bash
curl -X GET "http://localhost:3000/api/assets/sign?storageUrl=supabase://assets/user/project/file.mp4&ttl=3600" \
  -b cookies.txt

# Expected: 200 OK
# Response: {"signedUrl":"https://..."}
```

#### Test: AI Chat
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "projectId":"xxx",
    "message":"How do I add a fade transition?",
    "model":"gemini-2.0-flash-exp"
  }'

# Expected: 200 OK
# Response: {"response":"To add a fade transition...","model":"..."}
```

### Using Postman

1. Import collection (create from API.md examples)
2. Set environment variables:
   - `base_url`: `http://localhost:3000`
   - `auth_token`: From signin response
3. Run collection tests
4. Verify all endpoints return expected responses

---

## Database Testing

### RLS Policy Testing

#### Test: User Can Only See Own Projects
```sql
-- As user 1 (authenticated)
SELECT * FROM projects;
-- Expected: Only user 1's projects

-- Try to access user 2's projects
SELECT * FROM projects WHERE user_id = '<user-2-id>';
-- Expected: Empty (RLS blocks)

-- Try to insert with different user_id
INSERT INTO projects (user_id, title) VALUES ('<user-2-id>', 'Hack');
-- Expected: RLS error (user_id must match auth.uid())
```

#### Test: Service Role Bypasses RLS
```javascript
// Using service role client
const { data } = await supabaseAdmin
  .from('projects')
  .select('*');
// Expected: All projects from all users
```

### Data Integrity Testing

#### Test: Cascading Deletes
```sql
-- Create project with assets
INSERT INTO projects (id, user_id, title) VALUES (...);
INSERT INTO assets (project_id, ...) VALUES (...);

-- Delete project
DELETE FROM projects WHERE id = '...';

-- Verify assets deleted
SELECT * FROM assets WHERE project_id = '...';
-- Expected: Empty (cascade delete worked)
```

#### Test: Foreign Key Constraints
```sql
-- Try to insert asset with non-existent project
INSERT INTO assets (project_id, ...) VALUES ('fake-uuid', ...);
-- Expected: Foreign key violation error
```

### Storage Policy Testing

```javascript
// Test: User can upload to own folder
const { data, error } = await supabase.storage
  .from('assets')
  .upload(`${userId}/test.jpg`, file);
// Expected: Success

// Test: User cannot upload to another user's folder
const { error } = await supabase.storage
  .from('assets')
  .upload(`other-user-id/test.jpg`, file);
// Expected: Policy violation error
```

---

## Security Testing

### Authentication Testing

#### Test: Unauthenticated Access Blocked
```bash
# Try to access protected API without auth
curl http://localhost:3000/api/projects

# Expected: 401 Unauthorized
```

#### Test: Expired Token Rejected
```bash
# Use expired/invalid token
curl -H "Authorization: Bearer invalid-token" \
  http://localhost:3000/api/projects

# Expected: 401 Unauthorized
```

### Authorization Testing

#### Test: Cannot Access Other Users' Data
```javascript
// Logged in as user A
// Try to fetch user B's project
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', userBProjectId);

// Expected: Empty result (RLS blocks)
```

### Input Validation Testing

#### Test: XSS Prevention
```javascript
// Try to inject script tag
const malicious = '<script>alert("XSS")</script>';

// Create project with malicious name
await fetch('/api/projects', {
  method: 'POST',
  body: JSON.stringify({ title: malicious })
});

// Verify: Script tag escaped in UI
// Expected: Shows as plain text, not executed
```

#### Test: SQL Injection Prevention
```javascript
// Try SQL injection in search
const malicious = "'; DROP TABLE projects; --";

await fetch(`/api/projects?search=${malicious}`);

// Expected: Treated as string, tables safe
```

### Rate Limiting Testing

```bash
# Send 10 rapid requests
for i in {1..10}; do
  curl http://localhost:3000/api/video/generate \
    -X POST \
    -H "Content-Type: application/json" \
    -b cookies.txt \
    -d '{"prompt":"test","projectId":"xxx"}'
done

# Expected: First 5 succeed, rest get 429 Too Many Requests
```

---

## Performance Testing

### Response Time Benchmarks

| Endpoint | Target | Acceptable |
|----------|--------|------------|
| GET /api/projects | < 100ms | < 500ms |
| POST /api/projects | < 200ms | < 1s |
| GET /api/assets/sign | < 150ms | < 500ms |
| POST /api/assets/upload | < 5s (10MB) | < 30s |
| POST /api/ai/chat | < 2s | < 5s |
| POST /api/video/generate | < 1s (async) | < 3s |

### Load Testing

```bash
# Install Apache Bench
brew install ab  # macOS
apt-get install apache2-utils  # Linux

# Test: 100 requests, 10 concurrent
ab -n 100 -c 10 -H "Cookie: auth-token=xxx" \
  http://localhost:3000/api/projects

# Expected:
# - 95%+ requests < 500ms
# - 0 failures
# - No memory leaks
```

### Frontend Performance

#### Metrics to Monitor
- **First Contentful Paint (FCP)**: < 1.5s
- **Largest Contentful Paint (LCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 3.5s
- **Total Blocking Time (TBT)**: < 200ms
- **Cumulative Layout Shift (CLS)**: < 0.1

#### Test with Lighthouse
```bash
# Install Lighthouse CI
npm install -g @lhci/cli

# Run audit
lhci autorun --collect.url=http://localhost:3000/editor

# Expected scores:
# - Performance: > 80
# - Accessibility: > 90
# - Best Practices: > 90
# - SEO: > 80
```

---

## Writing Tests

### Future: Unit Tests with Jest

```typescript
// Example: Password validation test
import { validatePassword } from '@/lib/password-validation';

describe('validatePassword', () => {
  it('accepts valid password', () => {
    const result = validatePassword('Test123!@#');
    expect(result).toBeNull();
  });

  it('rejects short password', () => {
    const result = validatePassword('Test1!');
    expect(result).toBe('Password must be at least 8 characters long');
  });

  it('rejects password without uppercase', () => {
    const result = validatePassword('test123!@#');
    expect(result).toContain('uppercase');
  });

  it('rejects password without special character', () => {
    const result = validatePassword('Test12345');
    expect(result).toContain('special character');
  });

  it('rejects mismatched passwords', () => {
    const result = validatePassword('Test123!@#', 'Different1!');
    expect(result).toBe('Passwords do not match');
  });
});
```

### Future: Integration Tests with Playwright

```typescript
// Example: E2E test for project creation
import { test, expect } from '@playwright/test';

test('user can create and delete project', async ({ page }) => {
  // Login
  await page.goto('/signin');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=password]', 'Test123!@#');
  await page.click('button[type=submit]');

  // Create project
  await page.click('text=New Project');
  await page.fill('[name=title]', 'E2E Test Project');
  await page.click('button:has-text("Create")');

  // Verify project exists
  await expect(page.locator('text=E2E Test Project')).toBeVisible();

  // Delete project
  await page.click('[data-testid=project-menu]');
  await page.click('text=Delete');
  await page.click('text=Confirm');

  // Verify project deleted
  await expect(page.locator('text=E2E Test Project')).not.toBeVisible();
});
```

---

## CI/CD Integration

### GitHub Actions Workflow (Future)

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm run test  # When implemented
      - run: npm run build

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e  # When implemented
```

---

## Test Coverage Goals

### Current Coverage
- Manual testing: Core features
- API testing: Critical endpoints
- Security testing: RLS policies
- Performance: Basic benchmarks

### Target Coverage (Future)
- Unit tests: 80%+ coverage
- Integration tests: All API endpoints
- E2E tests: Critical user flows
- Performance tests: All pages
- Security tests: Automated scans

---

## Testing Checklist

### Before Each Release

- [ ] Run manual test cases for P0 features
- [ ] Test API endpoints with curl/Postman
- [ ] Verify RLS policies in database
- [ ] Check rate limiting works
- [ ] Test file uploads (all types)
- [ ] Verify authentication flows
- [ ] Test undo/redo functionality
- [ ] Check timeline save/load
- [ ] Test video generation (if configured)
- [ ] Verify AI chat works
- [ ] Run Lighthouse audit
- [ ] Check browser console for errors
- [ ] Test on multiple browsers
- [ ] Verify mobile responsiveness

### After Deployment

- [ ] Smoke test production URL
- [ ] Verify environment variables loaded
- [ ] Test signup/signin flow
- [ ] Create and delete test project
- [ ] Upload and delete test asset
- [ ] Check error logging (Axiom)
- [ ] Monitor performance metrics
- [ ] Verify database migrations applied

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Testing](https://playwright.dev)
- [Testing Library](https://testing-library.com)
- [Supabase Testing Guide](https://supabase.com/docs/guides/local-development)

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Test Coverage**: Manual testing, API testing
