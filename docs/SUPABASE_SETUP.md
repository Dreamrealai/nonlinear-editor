# Supabase Setup Guide

Complete step-by-step guide to setting up Supabase for the Non-Linear Video Editor.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Create Supabase Project](#create-supabase-project)
3. [Configure Authentication](#configure-authentication)
4. [Run Database Migrations](#run-database-migrations)
5. [Configure Storage Buckets](#configure-storage-buckets)
6. [Set Up Row-Level Security](#set-up-row-level-security)
7. [Get API Keys](#get-api-keys)
8. [Configure Environment Variables](#configure-environment-variables)
9. [Test the Setup](#test-the-setup)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before you begin, ensure you have:
- A Supabase account ([sign up here](https://supabase.com))
- Node.js 20+ installed
- Git installed
- This repository cloned locally

---

## Create Supabase Project

### Step 1: Create New Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Fill in project details:
   - **Name**: `nonlinear-editor` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is sufficient for development

4. Click **"Create new project"**
5. Wait 2-3 minutes for project provisioning

### Step 2: Note Your Project Details

Once created, you'll see your project dashboard. Note these values:

- **Project URL**: `https://xxxxx.supabase.co`
- **Project Ref**: `xxxxx` (from the URL)
- **Region**: e.g., `us-west-1`

---

## Configure Authentication

### Step 1: Enable Email Authentication

1. In the Supabase dashboard, go to **Authentication** → **Providers**
2. Find **Email** provider
3. Enable the toggle
4. Configure settings:
   ```
   ✅ Enable email provider
   ✅ Confirm email (recommended for production)
   ✅ Secure email change
   ✅ Secure password change
   ```

### Step 2: Configure Email Templates

Go to **Authentication** → **Email Templates**

**Confirm Signup Template:**
```html
<h2>Confirm your email</h2>
<p>Click the link below to confirm your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email</a></p>
```

**Reset Password Template:**
```html
<h2>Reset your password</h2>
<p>Click the link below to reset your password:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### Step 3: Configure Auth Settings

Go to **Authentication** → **Settings**

```yaml
Site URL: http://localhost:3000 (dev) or https://yourdomain.com (prod)
Redirect URLs:
  - http://localhost:3000/**
  - https://yourdomain.com/**

JWT Expiry: 3600 (1 hour)
Refresh Token Rotation: Enabled
Reuse Interval: 10 seconds

Security:
  ✅ Enable email confirmations
  ✅ Enable email change confirmation
  ✅ Secure password change (require re-auth)

Password Requirements:
  Minimum length: 8
```

### Step 4: (Optional) Configure SMTP

For production, configure custom SMTP (e.g., Resend, SendGrid):

1. Go to **Project Settings** → **Auth** → **SMTP Settings**
2. Enable custom SMTP
3. Configure with your provider:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: your-resend-api-key
   Sender email: noreply@yourdomain.com
   Sender name: Video Editor
   ```

---

## Run Database Migrations

### Step 1: Install Supabase CLI (Optional)

```bash
# Install globally
npm install -g supabase

# Or use npx
npx supabase --help
```

### Step 2: Run Migrations via SQL Editor

Since migrations are already written, you can run them directly:

1. Go to **SQL Editor** in Supabase dashboard
2. Click **"New query"**

#### Migration 1: Initial Schema

Copy and paste the contents of `/supabase/migrations/20250101000000_init_schema.sql`:

```bash
# From your project root
cat supabase/migrations/20250101000000_init_schema.sql
```

1. Paste the entire migration into SQL Editor
2. Click **"Run"**
3. Verify success message

This migration creates:
- `projects` table
- `assets` table
- `scenes` table
- `timelines` table
- `scene_frames` table
- `frame_edits` table
- `chat_messages` table
- Storage buckets: `assets`, `frames`, `frame-edits`
- RLS policies for all tables
- Storage policies

#### Migration 2: Fix Projects RLS

Copy and paste `/supabase/migrations/20251022000000_fix_projects_rls.sql`:

```bash
cat supabase/migrations/20251022000000_fix_projects_rls.sql
```

This fixes the RLS policy for project creation.

#### Migration 3: Add Processing Jobs

Copy and paste `/supabase/migrations/20250123000000_add_processing_jobs.sql`:

```bash
cat supabase/migrations/20250123000000_add_processing_jobs.sql
```

This adds support for async job tracking.

### Step 3: Verify Migrations

In the **Table Editor**:
1. Check that all tables exist:
   - `projects`
   - `assets`
   - `timelines`
   - `scenes`
   - `scene_frames`
   - `frame_edits`
   - `chat_messages`
   - `processing_jobs`

2. In **Storage**, verify buckets exist:
   - `assets`
   - `frames`
   - `frame-edits`

---

## Configure Storage Buckets

Storage buckets are created by migrations, but verify settings:

### Step 1: Verify Bucket Configuration

Go to **Storage** in Supabase dashboard.

#### Assets Bucket
```yaml
Name: assets
Public: No (private)
File size limit: 500 MB
Allowed MIME types:
  - video/mp4
  - video/webm
  - video/quicktime
  - image/jpeg
  - image/png
  - image/webp
  - audio/mpeg
  - audio/wav
  - audio/ogg
```

#### Frames Bucket
```yaml
Name: frames
Public: No (private)
File size limit: 50 MB
Allowed MIME types:
  - image/jpeg
  - image/png
  - image/webp
```

#### Frame-Edits Bucket
```yaml
Name: frame-edits
Public: No (private)
File size limit: 100 MB
Allowed MIME types:
  - image/png
  - image/jpeg
  - image/webp
```

### Step 2: Verify Storage Policies

Go to **Storage** → **Policies**

Each bucket should have policies for:
- ✅ Users can upload to own folder
- ✅ Users can read own files
- ✅ Users can update own files
- ✅ Users can delete own files
- ✅ Service role has full access

If policies are missing, they were created by the migration. Re-run the init schema migration if needed.

---

## Set Up Row-Level Security

RLS policies are created by migrations. Verify they're active:

### Step 1: Check RLS is Enabled

Go to **Database** → **Tables**

For each table, RLS should show as **"Enabled"**:
- ✅ projects
- ✅ assets
- ✅ timelines
- ✅ scenes
- ✅ scene_frames
- ✅ frame_edits
- ✅ chat_messages
- ✅ processing_jobs

### Step 2: Verify Policies Exist

Click on each table → **Policies** tab

**Projects table should have:**
- `projects_owner_select` (SELECT)
- `projects_owner_insert` (INSERT)
- `projects_owner_update` (UPDATE)
- `projects_owner_delete` (DELETE)

**Assets table should have:**
- `assets_owner_select` (SELECT)
- `assets_owner_mod` (INSERT, UPDATE, DELETE)

### Step 3: Test RLS Policies

In **SQL Editor**, run test queries:

```sql
-- Should return only current user's projects
SELECT * FROM projects;

-- Should return only current user's assets
SELECT * FROM assets;

-- Try to access another user's data (should return empty)
SELECT * FROM projects WHERE user_id != auth.uid();
```

---

## Get API Keys

### Step 1: Get Project API Keys

Go to **Project Settings** → **API**

You'll need three keys:

#### 1. Project URL
```
https://xxxxx.supabase.co
```
- Safe to expose publicly
- Use for both client and server

#### 2. Anon (Public) Key
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- Safe to expose publicly
- Has limited RLS-enforced access
- Use for client-side operations

#### 3. Service Role Key (Secret!)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
- **NEVER expose publicly**
- Bypasses RLS
- Server-side only
- Use for admin operations

### Step 2: Copy Keys Securely

1. Click **"Copy"** next to each key
2. Store temporarily in a secure note
3. **Never commit these to Git!**

---

## Configure Environment Variables

### Step 1: Create Local Environment File

In your project root:

```bash
cp .env.local.example .env.local
```

### Step 2: Add Supabase Credentials

Edit `.env.local`:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Optional: AI features
GEMINI_API_KEY=
FAL_API_KEY=

# Optional: Audio Generation
COMET_API_KEY=
ELEVENLABS_API_KEY=

# Optional: Google Service Account (for Veo, Scene Detection)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Optional: Google Cloud Storage
GCS_BUCKET_NAME=

# Optional: Logging
AXIOM_TOKEN=
AXIOM_DATASET=genai-video-production
```

**Replace:**
- `xxxxx` with your project ref
- `eyJhbGci...` with actual keys from Supabase dashboard

### Step 3: Verify .gitignore

Ensure `.env.local` is in `.gitignore`:

```bash
# Check .gitignore contains
cat .gitignore | grep ".env"

# Should show:
.env*.local
.env
```

---

## Test the Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Run Development Server

```bash
npm run dev
```

### Step 3: Test Authentication

1. Go to `http://localhost:3000/signup`
2. Create a test account:
   ```
   Email: test@example.com
   Password: Test123!@#
   ```
3. Check your email for confirmation (if enabled)
4. Click confirmation link
5. Sign in at `http://localhost:3000/signin`

### Step 4: Test Database Access

1. Create a new project
2. Open browser console
3. Check for errors
4. Verify project appears in Supabase dashboard:
   - Go to **Table Editor** → **projects**
   - You should see your new project

### Step 5: Test File Upload

1. In a project, click **"Upload Asset"**
2. Upload a small image
3. Verify in Supabase:
   - Go to **Storage** → **assets**
   - Navigate to `{user_id}/{project_id}/`
   - Your file should appear

### Step 6: Verify RLS is Working

Open browser console and try:

```javascript
// This should work (your own data)
const { data: projects } = await supabase
  .from('projects')
  .select('*');
console.log(projects); // Shows your projects

// This should return empty (RLS protection)
const { data: allProjects } = await supabase
  .from('projects')
  .select('*')
  .eq('user_id', '00000000-0000-0000-0000-000000000000');
console.log(allProjects); // Empty array
```

---

## Troubleshooting

### Issue: "Invalid JWT" Error

**Cause**: Anon key or service role key is incorrect

**Solution**:
1. Re-copy keys from Supabase dashboard
2. Ensure no extra spaces in `.env.local`
3. Restart dev server: `npm run dev`

### Issue: "RLS policy violation"

**Cause**: RLS policies not set up correctly

**Solution**:
1. Re-run migration `/supabase/migrations/20250101000000_init_schema.sql`
2. Check **Database** → **Tables** → RLS is "Enabled"
3. Verify policies exist in **Policies** tab

### Issue: "Cannot create project"

**Cause**: Missing INSERT policy

**Solution**:
1. Run migration `/supabase/migrations/20251022000000_fix_projects_rls.sql`
2. This adds separate INSERT policy

### Issue: "File upload failed"

**Cause**: Storage bucket or policies missing

**Solution**:
1. Check **Storage** → buckets exist
2. Re-run init schema migration
3. Verify storage policies in **Storage** → **Policies**

### Issue: "Email not sent"

**Cause**: Default SMTP limits hit or disabled

**Solution**:
1. For production, configure custom SMTP (Resend recommended)
2. For development, check **Authentication** → **Logs**
3. Temporarily disable email confirmation in Auth settings

### Issue: "CORS error"

**Cause**: Site URL not configured

**Solution**:
1. Go to **Authentication** → **Settings**
2. Add your URL to **Site URL** and **Redirect URLs**:
   ```
   http://localhost:3000
   https://yourdomain.com
   ```

### Issue: "Database connection failed"

**Cause**: Project not fully provisioned

**Solution**:
1. Wait 5 minutes after project creation
2. Check **Project Settings** → **General** → Status should be "Active"
3. Try restarting Supabase project (Settings → Restart project)

---

## Production Deployment

### Vercel Deployment

1. Go to Vercel project settings → **Environment Variables**
2. Add Supabase variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL = https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY = eyJhbGci... (mark as Secret)
   ```

3. Update Auth settings in Supabase:
   ```
   Site URL: https://yourdomain.vercel.app
   Redirect URLs:
     - https://yourdomain.vercel.app/**
   ```

4. Deploy:
   ```bash
   git push origin main
   ```

### Custom Domain

1. Add custom domain in Vercel
2. Update Supabase Auth settings:
   ```
   Site URL: https://yourdomain.com
   Redirect URLs:
     - https://yourdomain.com/**
   ```

---

## Verification Checklist

After setup, verify:

- ✅ Supabase project created and active
- ✅ Email authentication enabled
- ✅ All migrations run successfully
- ✅ 8 database tables exist
- ✅ 3 storage buckets configured
- ✅ RLS enabled on all tables
- ✅ Storage policies configured
- ✅ API keys copied to `.env.local`
- ✅ Dev server starts without errors
- ✅ User signup works
- ✅ User signin works
- ✅ Project creation works
- ✅ File upload works
- ✅ RLS prevents unauthorized access

---

## Next Steps

Once Supabase is set up:

1. **Optional: Configure Google Cloud** (for AI features)
   - Set up Google Cloud project
   - Enable Video Intelligence API
   - Create service account
   - Add credentials to `GOOGLE_SERVICE_ACCOUNT`

2. **Optional: Configure Axiom** (for logging)
   - Create Axiom account
   - Create dataset
   - Add API token to `AXIOM_TOKEN`

3. **Optional: Configure AI Services**
   - Get Gemini API key from Google AI Studio
   - Get FAL.ai API key
   - Get ElevenLabs API key
   - Add to `.env.local`

4. **Start Building**
   - Follow the [API Documentation](./API.md)
   - Check [Architecture](./ARCHITECTURE.md)
   - Review [Security](./SECURITY.md)

---

## Support

If you encounter issues:

1. Check Supabase status: [status.supabase.com](https://status.supabase.com)
2. Review Supabase docs: [supabase.com/docs](https://supabase.com/docs)
3. Check project logs in Supabase dashboard
4. Search Supabase Discord: [discord.supabase.com](https://discord.supabase.com)

---

**Last Updated**: 2025-01-23
**Version**: 1.0.0
**Supabase Version**: Postgres 15.x
