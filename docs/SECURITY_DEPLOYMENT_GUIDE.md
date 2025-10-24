# Security Deployment Guide

## Security Fixes Implemented

This guide covers deployment and verification for the following critical security fixes:

- **NEW-MED-002**: Account Deletion with Cascade
- **NEW-MED-003**: Frame Edit Authorization

## Pre-Deployment Checklist

### 1. Test Coverage Verification

Run all security-critical tests before deploying:

```bash
# Run all account deletion tests
npm test -- __tests__/api/user/delete-account.test.ts

# Run account deletion security tests
npm test -- __tests__/security/account-deletion-security.test.ts

# Run all frame authorization tests
npm test -- __tests__/api/frames/edit.test.ts

# Run frame authorization security tests
npm test -- __tests__/security/frame-authorization-security.test.ts
```

**Expected Results:**

- Account deletion tests: 22 passing ✓
- Account deletion security tests: 13 passing ✓
- Frame authorization core tests: 16 passing ✓
- Frame authorization security tests: 16 passing (with known mock issues on variations)

### 2. Database Migration Verification

**CRITICAL**: Verify foreign key constraints are in place:

```sql
-- Verify cascade delete constraints on projects table
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'projects'
    AND rc.delete_rule = 'CASCADE';
```

**Expected Results:**

- `assets.project_id` → CASCADE
- `clips.project_id` → CASCADE
- `scene_frames.project_id` → CASCADE
- `frame_edits.project_id` → CASCADE
- `chat_messages.project_id` → CASCADE

### 3. Environment Variables

Verify these environment variables are set:

```bash
# Required for Supabase operations
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Required for frame editing (Gemini AI)
GEMINI_API_KEY=<your-gemini-key>
# OR
AISTUDIO_API_KEY=<your-aistudio-key>
```

### 4. RLS (Row Level Security) Policies

**CRITICAL**: Verify RLS policies are enabled:

```sql
-- Check RLS is enabled on all tables
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('projects', 'assets', 'scene_frames', 'frame_edits');

-- All should show rowsecurity = true
```

Example RLS policies required:

```sql
-- Projects: Users can only see their own
CREATE POLICY "Users can view own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);

-- Assets: Users can only see assets in their projects
CREATE POLICY "Users can view own assets"
ON assets FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = assets.project_id
  AND projects.user_id = auth.uid()
));

-- Scene Frames: Users can only see frames in their projects
CREATE POLICY "Users can view own frames"
ON scene_frames FOR SELECT
USING (EXISTS (
  SELECT 1 FROM projects
  WHERE projects.id = scene_frames.project_id
  AND projects.user_id = auth.uid()
));

-- Frame Edits: Users can only see edits for their frames
CREATE POLICY "Users can view own frame edits"
ON frame_edits FOR SELECT
USING (EXISTS (
  SELECT 1 FROM scene_frames
  JOIN projects ON projects.id = scene_frames.project_id
  WHERE scene_frames.id = frame_edits.frame_id
  AND projects.user_id = auth.uid()
));
```

## Deployment Steps

### Step 1: Database Preparation (CRITICAL)

1. **Backup Production Database**

   ```bash
   # Create full backup before ANY changes
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test Migration on Staging**
   - Deploy to staging environment first
   - Run migration scripts
   - Verify cascade constraints
   - Test account deletion on staging with test account

3. **Apply Migration to Production**

   ```sql
   -- This should already be done, but verify:
   ALTER TABLE assets
   ADD CONSTRAINT assets_project_id_fkey
   FOREIGN KEY (project_id)
   REFERENCES projects(id)
   ON DELETE CASCADE;

   ALTER TABLE clips
   ADD CONSTRAINT clips_project_id_fkey
   FOREIGN KEY (project_id)
   REFERENCES projects(id)
   ON DELETE CASCADE;

   ALTER TABLE scene_frames
   ADD CONSTRAINT scene_frames_project_id_fkey
   FOREIGN KEY (project_id)
   REFERENCES projects(id)
   ON DELETE CASCADE;

   ALTER TABLE frame_edits
   ADD CONSTRAINT frame_edits_project_id_fkey
   FOREIGN KEY (project_id)
   REFERENCES projects(id)
   ON DELETE CASCADE;

   ALTER TABLE chat_messages
   ADD CONSTRAINT chat_messages_project_id_fkey
   FOREIGN KEY (project_id)
   REFERENCES projects(id)
   ON DELETE CASCADE;
   ```

### Step 2: Deploy Application Code

1. **Build and Test**

   ```bash
   npm run build
   npm test
   ```

2. **Deploy to Staging**

   ```bash
   # Example with Vercel
   vercel --prod=false
   ```

3. **Verify Staging**
   - Test account deletion flow
   - Test frame authorization
   - Check audit logs
   - Verify rate limiting

4. **Deploy to Production**
   ```bash
   git push origin main
   # Or manual deployment
   vercel --prod
   ```

### Step 3: Post-Deployment Verification

1. **Smoke Tests**

   ```bash
   # Test authentication
   curl -X POST https://your-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test_password_123"}'

   # Test account deletion (use test account!)
   curl -X DELETE https://your-domain.com/api/user/delete-account \
     -H "Authorization: Bearer <token>"

   # Test frame authorization (should get 403 if not owner)
   curl -X POST https://your-domain.com/api/frames/<frame-id>/edit \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"prompt":"test"}'
   ```

2. **Monitor Logs**

   ```bash
   # Check for errors in logs
   # Look for:
   # - Failed account deletions
   # - Unauthorized access attempts
   # - Rate limit violations
   ```

3. **Verify Audit Logs**

   ```sql
   -- Check recent account deletions
   SELECT * FROM audit_logs
   WHERE action = 'user.account.delete'
   ORDER BY created_at DESC
   LIMIT 10;

   -- Check unauthorized frame edit attempts
   SELECT * FROM audit_logs
   WHERE action = 'frame.edit.unauthorized'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

## Security Testing Checklist

### Account Deletion (NEW-MED-002)

- [ ] **CASCADE DELETION ORDER**
  - [ ] Projects deleted before user account
  - [ ] No orphaned assets remain
  - [ ] No orphaned frames remain
  - [ ] Service role used for all operations

- [ ] **DATA ISOLATION**
  - [ ] User A cannot delete User B's data
  - [ ] Storage files deleted only from user's folder
  - [ ] Database queries scoped to user_id

- [ ] **AUDIT TRAIL**
  - [ ] Account deletion logged before user deleted
  - [ ] Deletion timestamp preserved
  - [ ] Audit log survives user deletion

- [ ] **ERROR HANDLING**
  - [ ] Fails if project deletion fails (no partial deletion)
  - [ ] Fails if auth deletion fails
  - [ ] Gracefully handles missing subscription data
  - [ ] Gracefully handles storage errors

- [ ] **GDPR COMPLIANCE**
  - [ ] All personal data tables deleted
  - [ ] All storage buckets cleaned
  - [ ] Rate limiting prevents abuse

### Frame Authorization (NEW-MED-003)

- [ ] **OWNERSHIP VERIFICATION**
  - [ ] Frame → Asset → Project → User chain verified
  - [ ] Rejects if user doesn't own project
  - [ ] Rejects if user doesn't own asset
  - [ ] Rejects if frame doesn't exist

- [ ] **CROSS-USER ACCESS PREVENTION**
  - [ ] User A cannot edit User B's frames
  - [ ] Cannot bypass with NULL values
  - [ ] Cannot bypass with missing joins

- [ ] **AUDIT LOGGING**
  - [ ] All unauthorized attempts logged
  - [ ] Attacker user ID captured
  - [ ] Unauthenticated attempts logged

- [ ] **INPUT VALIDATION**
  - [ ] Rejects requests without prompt
  - [ ] Rejects non-string prompts
  - [ ] Validates frameId parameter

- [ ] **RATE LIMITING**
  - [ ] Tier2 rate limiting enforced (10/min)
  - [ ] Rate limit per-user
  - [ ] Rate limit headers returned

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Account Deletion Success Rate**

   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as total_deletions,
     SUM(CASE WHEN status_code = 200 THEN 1 ELSE 0 END) as successful,
     SUM(CASE WHEN status_code != 200 THEN 1 ELSE 0 END) as failed
   FROM audit_logs
   WHERE action = 'user.account.delete'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

2. **Unauthorized Access Attempts**

   ```sql
   SELECT
     DATE(created_at) as date,
     action,
     COUNT(*) as attempts,
     COUNT(DISTINCT user_id) as unique_users
   FROM audit_logs
   WHERE action IN (
     'frame.edit.unauthorized',
     'security.unauthorized_access'
   )
   GROUP BY DATE(created_at), action
   ORDER BY date DESC;
   ```

3. **Rate Limit Violations**
   ```sql
   SELECT
     DATE(created_at) as date,
     metadata->>'limitType' as limit_type,
     COUNT(*) as violations,
     COUNT(DISTINCT user_id) as unique_users
   FROM audit_logs
   WHERE action = 'rate_limit.exceeded'
   GROUP BY DATE(created_at), metadata->>'limitType'
   ORDER BY date DESC;
   ```

### Recommended Alerts

1. **High Account Deletion Failure Rate**
   - Trigger: > 10% of deletions failing
   - Action: Check database constraints and service role permissions

2. **Spike in Unauthorized Access**
   - Trigger: > 50 unauthorized attempts per hour
   - Action: Investigate potential security breach

3. **Storage Cleanup Failures**
   - Trigger: Storage errors in > 5% of deletions
   - Action: Check Supabase storage service health

## Rollback Plan

If critical issues are discovered post-deployment:

### Immediate Rollback

1. **Revert Application Code**

   ```bash
   # Revert to previous deployment
   git revert HEAD
   git push origin main
   # Or use platform rollback (e.g., Vercel)
   vercel rollback
   ```

2. **DO NOT Rollback Database Changes**
   - Cascade constraints are safe to keep
   - They only affect delete operations
   - No data loss from having them in place

### Partial Rollback

If only one feature is problematic:

1. **Disable Account Deletion**

   ```typescript
   // In app/api/user/delete-account/route.ts
   export const DELETE = async () => {
     return NextResponse.json({ error: 'Account deletion temporarily disabled' }, { status: 503 });
   };
   ```

2. **Disable Frame Editing**
   ```typescript
   // In app/api/frames/[frameId]/edit/route.ts
   export const POST = async () => {
     return NextResponse.json({ error: 'Frame editing temporarily disabled' }, { status: 503 });
   };
   ```

## Support & Troubleshooting

### Common Issues

1. **Account Deletion Fails with "Projects deletion failed"**
   - **Cause**: Missing foreign key cascade constraints
   - **Fix**: Apply migration scripts from Step 1
   - **Verify**: Check constraint existence in database

2. **Frame Edit Returns 403 for Valid User**
   - **Cause**: RLS policies too restrictive
   - **Fix**: Verify RLS policies match examples above
   - **Verify**: Test with `auth.uid()` in psql

3. **Storage Files Not Deleted**
   - **Cause**: Service role key not configured or bucket permissions
   - **Fix**: Verify `SUPABASE_SERVICE_ROLE_KEY` environment variable
   - **Verify**: Check Supabase storage bucket policies

### Emergency Contacts

- **Database Issues**: DBA team
- **Application Errors**: Backend team
- **Security Incidents**: Security team + CTO
- **User Impact**: Support team

## Security Considerations

### Defense in Depth

Both features implement multiple layers of security:

1. **Authentication**: Via `withAuth` middleware
2. **Rate Limiting**: Prevents abuse
3. **Authorization**: Ownership verification
4. **Audit Logging**: Tracks all operations
5. **Database RLS**: Final safety net

### Known Limitations

1. **Account Deletion**
   - Audit log entry for deletion will fail (user already deleted)
   - This is expected and logged as warning
   - Historical audit logs remain intact

2. **Frame Authorization**
   - Uses Gemini 2.5 Flash for analysis (not actual image generation)
   - For production image editing, upgrade to Imagen 3
   - Reference images fetched synchronously (could timeout)

## Success Criteria

Deployment is successful when:

- [ ] All automated tests passing
- [ ] Smoke tests in production passing
- [ ] No errors in application logs (15 min)
- [ ] No spike in unauthorized access attempts
- [ ] Account deletion rate normal (< 10/hour expected)
- [ ] Frame edit rate normal (< 100/hour expected)
- [ ] Audit logs recording all operations
- [ ] Monitoring dashboards showing green

## Post-Deployment Tasks

1. **Week 1**:
   - Monitor error rates daily
   - Review audit logs for anomalies
   - Check rate limiting effectiveness

2. **Week 2**:
   - Analyze account deletion patterns
   - Review unauthorized access attempts
   - Tune rate limits if needed

3. **Month 1**:
   - Full security audit review
   - Performance optimization if needed
   - Update runbooks based on learnings

---

**Document Version**: 1.0
**Last Updated**: 2025-01-24
**Approved By**: Agent 6 (Security Testing)
**Next Review**: Post-deployment + 1 week
