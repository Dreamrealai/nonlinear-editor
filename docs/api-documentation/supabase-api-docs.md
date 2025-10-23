# Supabase API Documentation

**Last Updated:** 2025-10-23

This comprehensive guide covers all Supabase APIs including Authentication, Database/PostgreSQL, Storage, Row Level Security, and JavaScript client usage.

---

## Table of Contents

1. [Authentication API](#authentication-api)
2. [Database/PostgreSQL API](#databasepostgresql-api)
3. [Storage API](#storage-api)
4. [Row Level Security (RLS)](#row-level-security-rls)
5. [JavaScript Client Library](#javascript-client-library)
6. [Connection Methods](#connection-methods)
7. [Rate Limits and Quotas](#rate-limits-and-quotas)
8. [Best Practices](#best-practices)

---

## Authentication API

### Overview

Supabase Auth provides authentication and authorization using JSON Web Tokens (JWTs). It supports multiple authentication methods including email/password, magic links, OTP, social login, and SSO.

### Core Concepts

- **Authentication**: Verifying user identity
- **Authorization**: Controlling resource access
- **JWT**: Used for authentication tokens
- **Roles**: `anon` (unauthenticated) and `authenticated` (logged in)

### Supported Authentication Methods

#### Email and Password Authentication

**Sign Up**

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    emailRedirectTo: 'https://example.com/welcome'
  }
})
```

**Required Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Optional Parameters:**
- `options.emailRedirectTo` (string): URL to redirect after email confirmation
- `options.data` (object): Additional user metadata

**Return Type:**
```typescript
{
  data: {
    user: User | null,
    session: Session | null
  },
  error: AuthError | null
}
```

**Sign In**

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
})
```

**Required Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Return Type:**
```typescript
{
  data: {
    user: User,
    session: Session
  },
  error: AuthError | null
}
```

#### Phone and Password Authentication

**Sign Up with Phone**

```javascript
const { data, error } = await supabase.auth.signUp({
  phone: '+1234567890',
  password: 'secure_password'
})
```

**Verify OTP**

```javascript
const { data, error } = await supabase.auth.verifyOtp({
  phone: '+1234567890',
  token: '123456',
  type: 'sms'
})
```

**Required Parameters:**
- `phone` (string): User's phone number with country code
- `token` (string): 6-digit verification code
- `type` (string): 'sms' or 'phone_change'

#### Social Authentication

**Supported Providers:**
- Apple
- Azure (Microsoft)
- Bitbucket
- Discord
- Facebook
- Figma
- GitHub
- GitLab
- Google
- Kakao
- Keycloak
- LinkedIn
- Notion
- Slack
- Spotify
- Twitter
- Twitch
- WorkOS
- Zoom

**Sign In with OAuth**

```javascript
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'github',
  options: {
    redirectTo: 'https://example.com/auth/callback'
  }
})
```

**Required Parameters:**
- `provider` (string): OAuth provider name

**Optional Parameters:**
- `options.redirectTo` (string): Callback URL after authentication
- `options.scopes` (string): OAuth scopes to request

#### Magic Link / OTP Authentication

**Sign In with OTP**

```javascript
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    emailRedirectTo: 'https://example.com/welcome'
  }
})
```

**Required Parameters:**
- `email` (string): User's email address

**Optional Parameters:**
- `options.emailRedirectTo` (string): URL to redirect after verification

#### Anonymous Authentication

```javascript
const { data, error } = await supabase.auth.signInAnonymously()
```

**No parameters required**

**Return Type:**
```typescript
{
  data: {
    user: User,
    session: Session
  },
  error: AuthError | null
}
```

### Session Management

#### Get Session

```javascript
const { data: { session }, error } = await supabase.auth.getSession()
```

**Return Type:**
```typescript
{
  data: {
    session: Session | null
  },
  error: AuthError | null
}
```

#### Refresh Session

```javascript
const { data, error } = await supabase.auth.refreshSession()
```

**Return Type:**
```typescript
{
  data: {
    session: Session,
    user: User
  },
  error: AuthError | null
}
```

#### Sign Out

```javascript
const { error } = await supabase.auth.signOut()
```

**Optional Parameters:**
- `scope` (string): 'global' (signs out all sessions) or 'local' (current session only)

### User Management

#### Get User

```javascript
const { data: { user }, error } = await supabase.auth.getUser()
```

**Return Type:**
```typescript
{
  data: {
    user: User
  },
  error: AuthError | null
}
```

#### Update User

```javascript
const { data, error } = await supabase.auth.updateUser({
  email: 'newemail@example.com',
  password: 'new_password',
  data: {
    display_name: 'John Doe'
  }
})
```

**Optional Parameters:**
- `email` (string): New email address
- `password` (string): New password
- `phone` (string): New phone number
- `data` (object): User metadata

#### Reset Password

**Step 1: Request Password Reset**

```javascript
const { data, error } = await supabase.auth.resetPasswordForEmail(
  'user@example.com',
  {
    redirectTo: 'https://example.com/reset-password'
  }
)
```

**Required Parameters:**
- `email` (string): User's email address

**Optional Parameters:**
- `redirectTo` (string): URL to redirect for password change

**Step 2: Update Password**

```javascript
const { data, error } = await supabase.auth.updateUser({
  password: 'new_secure_password'
})
```

### Auth State Changes

**Listen to Auth State Changes**

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  console.log(event, session)
})
```

**Events:**
- `SIGNED_IN`
- `SIGNED_OUT`
- `TOKEN_REFRESHED`
- `USER_UPDATED`
- `PASSWORD_RECOVERY`

### Multi-Factor Authentication (MFA)

#### Enroll MFA

```javascript
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'My Authenticator'
})
```

**Required Parameters:**
- `factorType` (string): 'totp' or 'phone'

**Optional Parameters:**
- `friendlyName` (string): Display name for the factor

#### Challenge MFA

```javascript
const { data, error } = await supabase.auth.mfa.challenge({
  factorId: 'factor-id-here'
})
```

**Required Parameters:**
- `factorId` (string): MFA factor ID

#### Verify MFA

```javascript
const { data, error } = await supabase.auth.mfa.verify({
  factorId: 'factor-id-here',
  challengeId: 'challenge-id-here',
  code: '123456'
})
```

**Required Parameters:**
- `factorId` (string): MFA factor ID
- `challengeId` (string): Challenge ID from challenge step
- `code` (string): Verification code

### Authentication Requirements

- **API Keys**: Use `anon` key for client-side, `service_role` key for server-side (bypasses RLS)
- **Headers**: Authorization header with Bearer token for authenticated requests
- **JWT Expiry**: Default 1 hour, configurable

### Pricing

**Monthly Active Users (MAU):**
- Free tier: 50,000 MAU
- Pro tier: $0.00325 per MAU

**Third-Party Auth:**
- Additional charges for social logins and SSO

**Advanced MFA:**
- Phone MFA has additional SMS charges

---

## Database/PostgreSQL API

### Overview

Every Supabase project includes a full PostgreSQL database with automatic REST API generation via PostgREST.

### Features

- Full Postgres database access
- Automatic REST API generation
- Real-time functionality
- Table editor with spreadsheet-like interface
- SQL editor with query saving
- Database backups
- Extensions support

### Connection Methods

See [Connection Methods](#connection-methods) section for detailed information.

### Table Operations

#### Creating Tables

**Using SQL:**

```sql
CREATE TABLE movies (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Concepts:**
- **Primary Key**: Unique identifier (use `id` with `BIGINT` or `UUID`)
- **Data Types**: TEXT, INTEGER, BIGINT, BOOLEAN, TIMESTAMPTZ, JSONB, etc.
- **Constraints**: NOT NULL, UNIQUE, CHECK, FOREIGN KEY

#### Data Types

| Type | Aliases | Description |
|------|---------|-------------|
| `bigint` | `int8` | 8-byte integer |
| `boolean` | `bool` | true/false |
| `text` | | Variable-length string |
| `varchar(n)` | `character varying` | Variable-length with limit |
| `integer` | `int`, `int4` | 4-byte integer |
| `timestamptz` | `timestamp with time zone` | Date/time with timezone |
| `uuid` | | Universal unique identifier |
| `jsonb` | | Binary JSON data |
| `numeric` | `decimal` | Exact numeric |
| `real` | `float4` | 4-byte floating point |

### JavaScript Client - Database Operations

#### Select Data

**Basic Select:**

```javascript
const { data, error } = await supabase
  .from('movies')
  .select('*')
```

**Select Specific Columns:**

```javascript
const { data, error } = await supabase
  .from('movies')
  .select('id, name, description')
```

**With Filters:**

```javascript
const { data, error } = await supabase
  .from('movies')
  .select('*')
  .eq('id', 1)
```

**Return Type:**
```typescript
{
  data: Array<any> | null,
  error: PostgrestError | null
}
```

#### Insert Data

**Single Insert:**

```javascript
const { data, error } = await supabase
  .from('movies')
  .insert({
    name: 'The Matrix',
    description: 'A computer hacker learns about the true nature of his reality.'
  })
  .select()
```

**Multiple Insert:**

```javascript
const { data, error } = await supabase
  .from('movies')
  .insert([
    { name: 'Movie 1', description: 'Description 1' },
    { name: 'Movie 2', description: 'Description 2' }
  ])
  .select()
```

**Required Parameters:**
- Object or array of objects matching table schema

**Optional Modifiers:**
- `.select()`: Return inserted data

#### Update Data

```javascript
const { data, error } = await supabase
  .from('movies')
  .update({ name: 'Updated Name' })
  .eq('id', 1)
  .select()
```

**Required:**
- Update object with fields to change
- Filter to specify which rows to update

#### Upsert Data

```javascript
const { data, error } = await supabase
  .from('movies')
  .upsert({
    id: 1,
    name: 'The Matrix',
    description: 'Updated description'
  })
  .select()
```

**Parameters:**
- Object or array with primary key values
- `onConflict`: Column name for conflict resolution

#### Delete Data

```javascript
const { error } = await supabase
  .from('movies')
  .delete()
  .eq('id', 1)
```

**Required:**
- Filter to specify which rows to delete

### Filters

#### Comparison Operators

```javascript
// Equal
.eq('column', 'value')

// Not equal
.neq('column', 'value')

// Greater than
.gt('column', 10)

// Greater than or equal
.gte('column', 10)

// Less than
.lt('column', 10)

// Less than or equal
.lte('column', 10)

// Like pattern matching
.like('column', '%pattern%')

// Case-insensitive like
.ilike('column', '%pattern%')

// Is null
.is('column', null)

// In array
.in('column', [1, 2, 3])
```

#### Logical Operators

```javascript
// AND (default)
.eq('column1', 'value1')
.eq('column2', 'value2')

// OR
.or('column1.eq.value1,column2.eq.value2')

// NOT
.not('column', 'eq', 'value')
```

#### Advanced Filters

```javascript
// Contains (for arrays/jsonb)
.contains('column', ['value1', 'value2'])

// Contained by
.containedBy('column', ['value1', 'value2'])

// Range operations
.rangeLt('column', '[0,10)')
.rangeGt('column', '[0,10)')

// Text search
.textSearch('column', 'search terms')

// Match multiple conditions
.match({ column1: 'value1', column2: 'value2' })
```

### Modifiers

```javascript
// Order results
.order('created_at', { ascending: false })

// Limit results
.limit(10)

// Pagination with range
.range(0, 9) // First 10 results

// Single result (throws error if not exactly 1)
.single()

// Maybe single (null if not found)
.maybeSingle()

// Abort signal for cancellation
.abortSignal(signal)
```

### Joins and Relations

**Foreign Key Relationships:**

```javascript
// One-to-many
const { data, error } = await supabase
  .from('movies')
  .select(`
    *,
    actors (
      id,
      name
    )
  `)

// Many-to-many through join table
const { data, error } = await supabase
  .from('movies')
  .select(`
    *,
    movie_actors!inner (
      actors (
        id,
        name
      )
    )
  `)
```

### RPC (Remote Procedure Calls)

**Call Database Functions:**

```javascript
const { data, error } = await supabase
  .rpc('function_name', {
    param1: 'value1',
    param2: 'value2'
  })
```

**Required Parameters:**
- `function_name` (string): PostgreSQL function name
- Parameters object matching function signature

### Real-time Subscriptions

```javascript
const channel = supabase
  .channel('table-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'movies'
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Unsubscribe
channel.unsubscribe()
```

**Events:**
- `*`: All changes
- `INSERT`: New rows
- `UPDATE`: Updated rows
- `DELETE`: Deleted rows

### Views

**Create View:**

```sql
CREATE VIEW movie_overview AS
SELECT
  movies.id,
  movies.name,
  COUNT(actors.id) as actor_count
FROM movies
LEFT JOIN movie_actors ON movies.id = movie_actors.movie_id
LEFT JOIN actors ON movie_actors.actor_id = actors.id
GROUP BY movies.id;
```

**Query View:**

```javascript
const { data, error } = await supabase
  .from('movie_overview')
  .select('*')
```

### Materialized Views

**Create:**

```sql
CREATE MATERIALIZED VIEW movie_stats AS
SELECT
  COUNT(*) as total_movies,
  AVG(rating) as avg_rating
FROM movies;
```

**Refresh:**

```sql
REFRESH MATERIALIZED VIEW movie_stats;
```

---

## Storage API

### Overview

Supabase Storage provides file storage with CDN delivery, image optimization, and access control via RLS policies.

### Features

- Store files of any size
- Global CDN with 285+ cities
- Built-in image optimizer
- Resumable uploads via TUS protocol
- Access control with RLS policies

### Bucket Operations

#### Create Bucket

```javascript
const { data, error } = await supabase
  .storage
  .createBucket('avatars', {
    public: false,
    fileSizeLimit: 1024000,
    allowedMimeTypes: ['image/png', 'image/jpeg']
  })
```

**Required Parameters:**
- `bucketName` (string): Unique bucket identifier

**Optional Parameters:**
- `public` (boolean): Allow public access (default: false)
- `fileSizeLimit` (number): Max file size in bytes
- `allowedMimeTypes` (array): Allowed file types

#### List Buckets

```javascript
const { data, error } = await supabase
  .storage
  .listBuckets()
```

**Return Type:**
```typescript
{
  data: Bucket[] | null,
  error: StorageError | null
}
```

#### Get Bucket

```javascript
const { data, error } = await supabase
  .storage
  .getBucket('avatars')
```

#### Delete Bucket

```javascript
const { data, error } = await supabase
  .storage
  .deleteBucket('avatars')
```

**Required Parameters:**
- `bucketName` (string): Bucket to delete

### File Operations

#### Upload File

**Standard Upload (< 6MB recommended):**

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .upload('public/avatar1.png', file, {
    cacheControl: '3600',
    upsert: false
  })
```

**Required Parameters:**
- `path` (string): File path within bucket
- `file` (File | Blob | ArrayBuffer): File to upload

**Optional Parameters:**
- `cacheControl` (string): Cache control header
- `contentType` (string): File content type
- `upsert` (boolean): Overwrite if exists (default: false)

**Return Type:**
```typescript
{
  data: {
    path: string
  } | null,
  error: StorageError | null
}
```

**Resumable Upload (> 6MB recommended):**

```javascript
const { data, error } = await supabase
  .storage
  .from('videos')
  .upload('public/video.mp4', file, {
    cacheControl: '3600',
    upsert: false,
    resumable: true
  })
```

**Additional Parameters:**
- `resumable` (boolean): Use TUS protocol for resumable uploads

#### Download File

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .download('public/avatar1.png')
```

**Required Parameters:**
- `path` (string): File path to download

**Return Type:**
```typescript
{
  data: Blob | null,
  error: StorageError | null
}
```

#### List Files

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .list('public', {
    limit: 100,
    offset: 0,
    sortBy: { column: 'name', order: 'asc' }
  })
```

**Required Parameters:**
- `path` (string): Folder path (use empty string for root)

**Optional Parameters:**
- `limit` (number): Max files to return
- `offset` (number): Number of files to skip
- `sortBy` (object): Sort configuration
- `search` (string): Search query

#### Get Public URL

```javascript
const { data } = supabase
  .storage
  .from('avatars')
  .getPublicUrl('public/avatar1.png')

console.log(data.publicUrl)
```

**Required Parameters:**
- `path` (string): File path

**Return Type:**
```typescript
{
  data: {
    publicUrl: string
  }
}
```

#### Create Signed URL

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .createSignedUrl('private/avatar1.png', 60)
```

**Required Parameters:**
- `path` (string): File path
- `expiresIn` (number): Seconds until URL expires

**Optional Parameters:**
- `transform` (object): Image transformation options

**Return Type:**
```typescript
{
  data: {
    signedUrl: string
  } | null,
  error: StorageError | null
}
```

#### Move File

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .move('public/old-path.png', 'public/new-path.png')
```

**Required Parameters:**
- `fromPath` (string): Current file path
- `toPath` (string): New file path

#### Copy File

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .copy('public/avatar1.png', 'public/avatar1-copy.png')
```

**Required Parameters:**
- `fromPath` (string): Source file path
- `toPath` (string): Destination file path

#### Delete Files

```javascript
const { data, error } = await supabase
  .storage
  .from('avatars')
  .remove(['public/avatar1.png', 'public/avatar2.png'])
```

**Required Parameters:**
- `paths` (string[]): Array of file paths to delete

### Image Transformation

```javascript
const { data } = supabase
  .storage
  .from('avatars')
  .getPublicUrl('public/avatar.png', {
    transform: {
      width: 200,
      height: 200,
      resize: 'cover',
      quality: 80
    }
  })
```

**Transform Options:**
- `width` (number): Target width
- `height` (number): Target height
- `resize` (string): 'cover', 'contain', 'fill'
- `quality` (number): 1-100, JPEG/WebP quality
- `format` (string): 'png', 'jpeg', 'webp'

### Storage Access Control

Storage uses RLS policies on the `storage.objects` table.

**Example Policy - Authenticated Upload:**

```sql
CREATE POLICY "Authenticated users can upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

**Example Policy - Public Read:**

```sql
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'public-bucket');
```

**Required Permissions:**
- `SELECT`: Download/list files
- `INSERT`: Upload files
- `UPDATE`: Update files (with upsert)
- `DELETE`: Delete files

---

## Row Level Security (RLS)

### Overview

RLS provides row-level access control using PostgreSQL policies. It's essential for securing data accessed via the API.

### Enabling RLS

**Enable on Table:**

```sql
ALTER TABLE movies ENABLE ROW LEVEL SECURITY;
```

**Best Practice:**
- Enable RLS on all tables in exposed schemas (default: `public`)
- Tables created via Dashboard have RLS enabled by default

### Policies

Policies are SQL rules that control data access.

#### Policy Structure

```sql
CREATE POLICY "policy_name"
ON table_name
FOR operation -- SELECT, INSERT, UPDATE, DELETE, ALL
TO role -- authenticated, anon, public
USING (condition) -- Determines which rows are visible
WITH CHECK (condition); -- Determines which rows can be modified
```

### Helper Functions

#### auth.uid()

Returns the authenticated user's ID.

```sql
CREATE POLICY "Users can only see their own data"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

**Note:** Returns `null` for unauthenticated requests.

#### auth.jwt()

Returns the full JWT payload.

```sql
CREATE POLICY "Check user role"
ON posts
FOR SELECT
TO authenticated
USING (
  (auth.jwt()->>'role')::text = 'admin'
);
```

**Access app_metadata:**

```sql
USING (
  (auth.jwt()->>'app_metadata'->'role')::text = 'admin'
)
```

### Policy Examples

#### SELECT Policies

**Public Read Access:**

```sql
CREATE POLICY "Public read access"
ON movies
FOR SELECT
TO public
USING (true);
```

**User-Specific Access:**

```sql
CREATE POLICY "Users can see own profiles"
ON profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```

#### INSERT Policies

**Authenticated Insert:**

```sql
CREATE POLICY "Authenticated users can insert"
ON posts
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

**Folder-Based Access:**

```sql
CREATE POLICY "Users can upload to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

#### UPDATE Policies

**User Can Update Own Data:**

```sql
CREATE POLICY "Users can update own posts"
ON posts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

**Note:** `USING` checks existing rows, `WITH CHECK` validates modified rows.

#### DELETE Policies

**User Can Delete Own Data:**

```sql
CREATE POLICY "Users can delete own posts"
ON posts
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### Multi-Factor Authentication Check

```sql
CREATE POLICY "Require MFA for updates"
ON sensitive_data
FOR UPDATE
TO authenticated
USING (
  (auth.jwt()->>'aal')::text = 'aal2'
)
WITH CHECK (
  (auth.jwt()->>'aal')::text = 'aal2'
);
```

### Team/Organization Access

```sql
-- Store team IDs in app_metadata
CREATE POLICY "Team member access"
ON documents
FOR SELECT
TO authenticated
USING (
  team_id = ANY(
    ARRAY(
      SELECT jsonb_array_elements_text(
        (auth.jwt()->'app_metadata'->'teams')::jsonb
      )
    )::uuid[]
  )
);
```

### Performance Optimization

#### 1. Add Indexes

```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
```

#### 2. Wrap Functions in SELECT

```sql
-- Instead of: auth.uid() = user_id
-- Use:
(SELECT auth.uid()) = user_id
```

**Impact:** 95%+ performance improvement

#### 3. Add Filters to Queries

```javascript
// Don't rely on RLS alone
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId) // Add explicit filter
```

**Impact:** ~95% performance improvement

#### 4. Use Security Definer Functions

```sql
CREATE FUNCTION check_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT role FROM user_roles WHERE user_id = auth.uid();
$$;

-- Use in policy
CREATE POLICY "Role-based access"
ON admin_data
FOR SELECT
TO authenticated
USING ((SELECT check_user_role()) = 'admin');
```

**Impact:** 99%+ performance improvement

#### 5. Specify Roles in Policies

```sql
-- Use TO clause to limit policy execution
CREATE POLICY "Authenticated only"
ON posts
FOR SELECT
TO authenticated -- Skips check for anon users
USING ((SELECT auth.uid()) = user_id);
```

**Impact:** 99%+ performance improvement for unmatched roles

### Bypassing RLS

**Using Service Key:**
- Service role key bypasses all RLS policies
- Use only on server-side
- Never expose in client code

**Creating Bypass Role:**

```sql
CREATE ROLE service_account;
ALTER ROLE service_account BYPASSRLS;
```

**Warning:** Never share credentials for roles with BYPASSRLS privilege.

---

## JavaScript Client Library

### Installation

```bash
npm install @supabase/supabase-js
```

### Initialization

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xyzcompany.supabase.co'
const supabaseKey = 'your-anon-key'
const supabase = createClient(supabaseUrl, supabaseKey)
```

**Required Parameters:**
- `supabaseUrl` (string): Your project URL
- `supabaseKey` (string): Your project API key (anon or service_role)

**Optional Configuration:**

```javascript
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: { 'x-custom-header': 'value' }
  }
})
```

### TypeScript Support

```typescript
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabase = createClient<Database>(supabaseUrl, supabaseKey)

// Typed queries
const { data, error } = await supabase
  .from('movies')
  .select('*')

// data is typed as Movie[]
```

**Generate Types:**

```bash
npx supabase gen types typescript --project-id "your-project-id" > database.types.ts
```

### Error Handling

```javascript
const { data, error } = await supabase
  .from('movies')
  .select('*')

if (error) {
  console.error('Error:', error.message)
  // Handle error
} else {
  console.log('Data:', data)
}
```

**Common Error Properties:**
- `message` (string): Error description
- `code` (string): Error code
- `details` (string): Additional details
- `hint` (string): Suggested fix

### Next.js Integration

**Using @supabase/ssr (Recommended):**

```javascript
// middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options })
        }
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  return response
}
```

### Abort Requests

```javascript
const controller = new AbortController()

const { data, error } = await supabase
  .from('movies')
  .select('*')
  .abortSignal(controller.signal)

// Cancel request
controller.abort()
```

---

## Connection Methods

### Overview

Supabase provides multiple ways to connect to your PostgreSQL database depending on your use case.

### Connection String Formats

#### Direct Connection (IPv6)

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Use Cases:**
- Persistent servers (VMs, long-running containers)
- Database migrations
- Database GUIs
- Commands like `pg_dump`

**Requirements:**
- IPv6 support
- For IPv4, use Session Mode or get IPv4 add-on

#### Session Mode (Supavisor)

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres?pgbouncer=true
```

**Use Cases:**
- Persistent clients without IPv6
- Application-side pooling
- Long-running queries

**Limitations:**
- Prepared statements not supported

#### Transaction Mode (Supavisor)

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Use Cases:**
- Serverless functions
- Edge functions
- Auto-scaling systems
- Short-lived connections

**Limitations:**
- No prepared statements
- No long transactions
- No session-level features

#### Dedicated Pooler (PgBouncer)

Available for paid plans. Provides better performance with dedicated resources.

```
postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres
```

**Benefits:**
- Co-located with database
- Lower latency
- Dedicated resources

**Requirements:**
- IPv6 or IPv4 add-on
- Paid plan

### Connection Pooling

#### Application-Side Poolers

Built into libraries like:
- Prisma
- SQLAlchemy
- PostgREST
- Drizzle

**Configuration Example (Prisma):**

```javascript
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

#### Server-Side Poolers

**Supavisor:**
- Shared pooler (free)
- Load balancer for connections
- Transaction and session modes

**PgBouncer:**
- Dedicated pooler (paid)
- Better performance
- Co-located with database

### SSL Connections

**Always use SSL in production:**

```javascript
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('./prod-ca-2021.crt').toString()
  }
})
```

**Get SSL Certificate:**
- Download from Project Settings > Database > SSL Certificate

### Connection Limits

**By Compute Tier:**

| Tier | Max Connections | Max Pooler Clients |
|------|----------------|-------------------|
| Free | 60 | 200 |
| Small | 90 | 400 |
| Medium | 120 | 600 |
| Large | 160 | 800 |
| XL | 240 | 1000 |
| 2XL | 380 | 1500 |

**Monitoring:**

```sql
-- Current connections
SELECT
  usename,
  COUNT(*)
FROM pg_stat_activity
GROUP BY usename;

-- Connection limit
SELECT setting::int
FROM pg_settings
WHERE name = 'max_connections';
```

### Troubleshooting

**"Connection refused" error:**
- Check project is running
- Verify connection string
- Check firewall settings

**"Password authentication failed":**
- Reset password in Database Settings
- Check password in connection string

**"Too many connections":**
- Use connection pooling
- Check for connection leaks
- Upgrade compute tier

---

## Rate Limits and Quotas

### Free Tier Limits

**Database:**
- 500 MB database size
- 1 GB file storage
- 2 GB bandwidth
- 500k Edge Function invocations

**Authentication:**
- 50,000 Monthly Active Users (MAU)
- 2 emails per hour (test service)

**API:**
- No hard rate limits on free tier
- Fair use policy applies
- Automatic throttling under heavy load

**Realtime:**
- 200 concurrent connections
- 10,000 messages per second

### Pro Tier Limits

**Database:**
- 8 GB database size (expandable)
- 100 GB file storage
- 250 GB bandwidth
- Unlimited Edge Function invocations

**Authentication:**
- $0.00325 per MAU after 50,000
- SMTP service included

**API:**
- Higher throughput
- Priority support
- Advanced monitoring

### Enterprise Tier

- Custom limits
- SLA guarantees
- Dedicated support
- Custom regions

### Best Practices

1. **Implement Client-Side Rate Limiting:**

```javascript
// Simple rate limiter
const limiter = {
  tokens: 10,
  maxTokens: 10,
  refillRate: 1, // tokens per second
  lastRefill: Date.now(),

  async acquire() {
    const now = Date.now()
    const timePassed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + timePassed * this.refillRate)
    this.lastRefill = now

    if (this.tokens < 1) {
      throw new Error('Rate limit exceeded')
    }

    this.tokens -= 1
  }
}
```

2. **Cache Frequently Accessed Data:**

```javascript
const cache = new Map()

async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key)
  }

  const { data, error } = await supabase
    .from('table')
    .select('*')
    .eq('id', key)
    .single()

  if (!error) {
    cache.set(key, data)
  }

  return data
}
```

3. **Use Pagination:**

```javascript
// Instead of fetching all records
const { data, error } = await supabase
  .from('posts')
  .select('*')
  .range(0, 9) // First 10 records
```

4. **Batch Operations:**

```javascript
// Insert multiple records at once
const { data, error } = await supabase
  .from('posts')
  .insert([
    { title: 'Post 1' },
    { title: 'Post 2' },
    { title: 'Post 3' }
  ])
```

5. **Monitor Usage:**
- Check Reports section in Dashboard
- Set up alerts for approaching limits
- Use database query optimization

---

## Best Practices

### Security

1. **Enable RLS on All Tables:**

```sql
ALTER TABLE your_table ENABLE ROW LEVEL SECURITY;
```

2. **Never Expose Service Role Key:**
- Use only on server-side
- Store in environment variables
- Use anon key for client-side

3. **Validate User Input:**

```javascript
// Use RLS policies instead of client-side checks
const { data, error } = await supabase
  .from('posts')
  .insert({ title, content }) // RLS enforces user_id
```

4. **Use Prepared Statements:**

```javascript
// Client handles this automatically
const { data } = await supabase
  .from('users')
  .select('*')
  .eq('email', userInput) // Safe from SQL injection
```

5. **Implement MFA for Sensitive Operations:**

```javascript
const { data: { aal } } = await supabase.auth.getClaims()

if (aal !== 'aal2') {
  // Require MFA enrollment/verification
}
```

### Performance

1. **Add Database Indexes:**

```sql
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
```

2. **Use Filters in Queries:**

```javascript
// Good - uses index
const { data } = await supabase
  .from('posts')
  .select('*')
  .eq('user_id', userId)

// Bad - scans all rows
const { data } = await supabase
  .from('posts')
  .select('*')
```

3. **Select Only Required Columns:**

```javascript
// Good
const { data } = await supabase
  .from('posts')
  .select('id, title')

// Bad - fetches unnecessary data
const { data } = await supabase
  .from('posts')
  .select('*')
```

4. **Use Connection Pooling:**
- Transaction mode for serverless
- Session mode for persistent clients
- Dedicated pooler for high-traffic apps

5. **Optimize Realtime Subscriptions:**

```javascript
// Filter on server-side
const channel = supabase
  .channel('posts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'posts',
    filter: 'user_id=eq.' + userId
  }, handleNewPost)
  .subscribe()
```

### Development

1. **Use TypeScript:**

```typescript
import { Database } from './database.types'

const supabase = createClient<Database>(url, key)
```

2. **Environment Variables:**

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
```

3. **Error Handling:**

```javascript
try {
  const { data, error } = await supabase
    .from('posts')
    .insert(post)

  if (error) throw error

  return { success: true, data }
} catch (error) {
  console.error('Error:', error.message)
  return { success: false, error: error.message }
}
```

4. **Use Database Migrations:**

```bash
# Create migration
supabase migration new create_posts_table

# Apply migrations
supabase db push
```

5. **Test Locally:**

```bash
# Start local Supabase
supabase start

# Run tests
npm test

# Stop local instance
supabase stop
```

### Monitoring

1. **Enable Query Performance Insights:**
- Available in Database Settings
- Identify slow queries
- Optimize with indexes

2. **Set Up Alerts:**
- CPU usage
- Memory usage
- Connection count
- API response times

3. **Use Logging:**

```javascript
// Enable query logging
const supabase = createClient(url, key, {
  auth: {
    debug: true
  }
})
```

4. **Monitor Auth Events:**

```javascript
supabase.auth.onAuthStateChange((event, session) => {
  // Log auth events
  analytics.track('auth_event', { event, userId: session?.user?.id })
})
```

### Backup and Recovery

1. **Enable Daily Backups:**
- Automatic on Pro tier
- Point-in-time recovery
- Download backup files

2. **Test Recovery Process:**
- Regular restore tests
- Document recovery procedures
- Verify backup integrity

3. **Export Important Data:**

```bash
# Export database
pg_dump -h db.xyz.supabase.co -U postgres -d postgres > backup.sql

# Export storage
supabase storage download bucket-name/path/to/files
```

### Scaling

1. **Upgrade Compute:**
- Monitor CPU/memory usage
- Upgrade when consistently >70%
- Consider dedicated compute

2. **Implement Caching:**
- Use Redis/Memcached
- Cache frequently accessed data
- Set appropriate TTLs

3. **Use CDN for Storage:**
- Automatic with Supabase Storage
- Configure cache headers
- Use image transformations

4. **Optimize Database:**
- Vacuum regularly
- Analyze query plans
- Partition large tables

5. **Consider Read Replicas:**
- Available on Enterprise
- Distribute read load
- Reduce latency

---

## Additional Resources

### Official Documentation

- [Supabase Documentation](https://supabase.com/docs)
- [API Reference](https://supabase.com/docs/reference)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

### Community

- [Discord Community](https://discord.supabase.com)
- [GitHub Discussions](https://github.com/supabase/supabase/discussions)
- [Twitter](https://twitter.com/supabase)

### Tools

- [Supabase CLI](https://github.com/supabase/cli)
- [Database Migrations](https://supabase.com/docs/guides/cli/local-development)
- [Type Generation](https://supabase.com/docs/guides/api/generating-types)

### Example Projects

- [Supabase Examples](https://github.com/supabase/supabase/tree/master/examples)
- [Next.js + Supabase](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
- [React + Supabase](https://github.com/supabase/supabase/tree/master/examples/auth/react-auth)

---

**Note:** This documentation is based on Supabase as of October 2025. Always refer to the official documentation for the most up-to-date information.
