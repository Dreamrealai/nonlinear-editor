# Authentication & Subscription System Analysis

## Executive Summary

This is a comprehensive analysis of the Non-Linear Editor's current authentication, user data model, and payment infrastructure readiness. The application uses **Supabase Authentication** with a PostgreSQL database and is ready for a three-tier subscription model.

---

## 1. AUTHENTICATION SYSTEM

### Type: Supabase Auth (Built-in Authentication)

**Location**: `/lib/supabase.ts`

Supabase provides three client variants:

1. **Browser Client** - For Client Components (public anon key)
2. **Server Client** - For Server Components & API Routes (anon key with SSR)
3. **Service Role Client** - For admin operations (bypasses RLS)

### Auth Flow

```
User Signs Up/In → Supabase Auth → JWT Token (stored in httpOnly cookies)
↓
Session persists across tabs (browser managed)
↓
Auto-refresh (3600s default, 1 hour)
```

### Configuration

```
Environment Variables:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
```

### Current Auth Routes

- `GET /auth/callback` - OAuth callback handler
- `POST /api/auth/signout` - Sign out endpoint (with CSRF protection)

### Current Auth Pages

- `/signin` - Sign in page
- `/signup` - Sign up page
- `/settings` - Settings page (password change, account deletion)

---

## 2. CURRENT USER DATA MODEL

### No Custom User Profile Table

**IMPORTANT**: The application currently has **NO custom users table**. It relies entirely on:

- **Supabase's built-in `auth.users` table** (read-only from client)
- **Only field used**: `email` from the auth user object

### User Information Available from Supabase

```typescript
{
  id: UUID; // User ID (matches user_id in projects table)
  email: string; // Email address
  created_at: timestamp; // Account creation time
  last_sign_in_at: timestamp; // Last login
  // Other fields available but not currently used
}
```

### Data Stored Across Project-Related Tables

1. **projects** - Projects belonging to user
2. **assets** - Media files uploaded by user
3. **scenes** - Video scenes detected in user's projects
4. **timelines** - Editor state for user's projects
5. **scene_frames** - Keyframes extracted by user
6. **frame_edits** - AI edits made by user
7. **chat_messages** - Chat history in user's projects
8. **processing_jobs** - Async jobs for user's operations
9. **rate_limits** - Rate limiting per user/IP

### Row Level Security (RLS)

All tables use RLS with policies like:

```sql
using (auth.uid() = user_id)
```

All user data is isolated by `user_id` matching Supabase's `auth.users.id`.

---

## 3. CURRENT USER SETTINGS/PROFILE LOCATION

### URL: `/app/settings/page.tsx`

**Features Implemented**:

- Display current email
- Change password
- Delete account (with double confirmation)

**What's Missing**:

- No profile edit (name, bio, profile picture)
- No subscription/billing information
- No API keys or integrations
- No notification preferences
- No usage analytics/dashboard

### Current Settings Component

```typescript
const [userEmail, setUserEmail] = useState<string | null>(null);
const [newPassword, setNewPassword] = useState('');
const [confirmPassword, setConfirmPassword] = useState('');
```

---

## 4. EXISTING PAYMENT/SUBSCRIPTION CODE

### Current Status: NONE

**No existing code for**:

- Stripe integration
- Subscription management
- Payment processing
- Billing history
- Feature limits/quotas
- Usage tracking
- Premium badges or indicators

### Services That Could Track Usage

Already in place:

- `processing_jobs` table - tracks all async operations
- `rate_limits` table - tracks API requests
- Tables have `created_at` timestamps for analytics

---

## 5. DATABASE SCHEMA ANALYSIS

### Key Tables (Relevant for Subscriptions)

```sql
-- Auth-related (Read-only for app, managed by Supabase)
auth.users (
  id UUID PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP
)

-- User Projects
projects (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id),
  title TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

-- User Assets (Media Files)
assets (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id),
  source TEXT CHECK IN ('upload', 'genai', 'ingest'),
  created_at TIMESTAMP
)

-- Processing Jobs (Usage Tracking)
processing_jobs (
  id UUID PRIMARY KEY,
  user_id UUID → auth.users(id),
  job_type job_type ENUM,
  status job_status ENUM,
  provider TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
)

-- Rate Limits (API Usage)
rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER,
  reset_at TIMESTAMP,
  created_at TIMESTAMP
)
```

---

## 6. RECOMMENDED APPROACH FOR THREE-TIER SUBSCRIPTION SYSTEM

### Phase 1: Create User Profile Table (REQUIRED)

Since no custom user profile table exists, we need to create one:

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Profile Information
  display_name TEXT,
  avatar_url TEXT,

  -- Subscription Information
  tier TEXT NOT NULL DEFAULT 'free'
    CHECK (tier IN ('free', 'pro', 'enterprise')),
  subscription_status TEXT NOT NULL DEFAULT 'active'
    CHECK (subscription_status IN ('active', 'cancelled', 'past_due', 'trial')),

  -- Stripe Integration
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,  -- Current plan's price ID

  -- Trial Information
  trial_started_at TIMESTAMP,
  trial_ends_at TIMESTAMP,

  -- Billing Information
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,

  -- Feature Limits & Usage
  monthly_video_minutes INTEGER DEFAULT 0,
  monthly_video_limit INTEGER NOT NULL DEFAULT 10,  -- Minutes per month
  monthly_ai_requests INTEGER DEFAULT 0,
  monthly_ai_limit INTEGER NOT NULL DEFAULT 50,     -- API calls per month
  storage_used_bytes BIGINT DEFAULT 0,
  storage_limit_bytes BIGINT NOT NULL DEFAULT 5368709120,  -- 5GB

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- RLS Policy
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile"
  ON user_profiles FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### Phase 2: Define Tier Limits & Pricing

```typescript
// lib/subscriptionTiers.ts
export const SUBSCRIPTION_TIERS = {
  free: {
    name: 'Free',
    monthlyVideos: 10, // Minutes
    monthlyAiRequests: 50, // API calls
    storageGB: 5,
    features: [
      'Basic video editing',
      'Asset management',
      'Scene detection',
      'Keyframe editing',
      'Standard export (1080p)',
    ],
    stripePriceId: null, // Free tier
  },
  pro: {
    name: 'Pro',
    monthlyVideos: 500, // Minutes
    monthlyAiRequests: 2000, // API calls
    storageGB: 100,
    features: [
      'Everything in Free',
      'AI video generation',
      'AI image generation',
      'Text-to-speech',
      '4K export',
      'Custom branding',
      'Priority support',
    ],
    stripePriceId: 'price_xxxxx_pro', // Set in Stripe
    costPerMonth: 29,
  },
  enterprise: {
    name: 'Enterprise',
    monthlyVideos: null, // Unlimited
    monthlyAiRequests: null, // Unlimited
    storageGB: 1000,
    features: [
      'Everything in Pro',
      'Unlimited everything',
      'API access',
      'Custom integrations',
      'Dedicated support',
      'Team collaboration',
    ],
    stripePriceId: null, // Contact sales
    costPerMonth: 'Custom',
  },
};
```

### Phase 3: Stripe Integration Points

```typescript
// Required implementations:

1. Create Stripe Customer
   POST /api/billing/create-customer
   → Create Stripe customer linked to user_id
   → Store stripe_customer_id in user_profiles

2. Create Subscription
   POST /api/billing/create-subscription
   → user_id, priceId
   → Create Stripe subscription
   → Update user_profiles with subscription_id, tier

3. Manage Subscription
   POST /api/billing/update-subscription
   → Change tier, cancel, resume

4. Webhook Handler
   POST /api/webhooks/stripe
   → Handle: subscription created, updated, deleted
   → Handle: payment succeeded/failed
   → Update user_profiles accordingly

5. Usage Tracking
   POST /api/billing/track-usage
   → Increment monthly_video_minutes, monthly_ai_requests
   → Check against limits before allowing operations

6. Billing Portal
   POST /api/billing/create-portal-session
   → Return Stripe billing portal URL
   → Users manage subscription/payment methods
```

### Phase 4: Feature Gates & Limits

```typescript
// lib/featureGates.ts
export async function checkUserTier(userId: string): Promise<UserProfile> {
  const { data } = await supabaseClient
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();
  return data;
}

export async function canUseFeature(
  userId: string,
  feature: 'ai-video' | 'ai-image' | 'tts' | 'high-export'
): Promise<boolean> {
  const profile = await checkUserTier(userId);

  const tierFeatures = {
    free: [],
    pro: ['ai-video', 'ai-image', 'tts'],
    enterprise: ['ai-video', 'ai-image', 'tts', 'high-export'],
  };

  return tierFeatures[profile.tier].includes(feature);
}

export async function checkUsageLimit(
  userId: string,
  type: 'video_minutes' | 'ai_requests'
): Promise<boolean> {
  const profile = await checkUserTier(userId);

  if (type === 'video_minutes') {
    return profile.monthly_video_minutes < profile.monthly_video_limit;
  } else {
    return profile.monthly_ai_requests < profile.monthly_ai_limit;
  }
}
```

### Phase 5: Implementation Checklist

**Database Changes**:

- [ ] Create `user_profiles` table migration
- [ ] Create `billing_events` table (for audit trail)
- [ ] Create `usage_analytics` table (detailed tracking)
- [ ] Add indexes for stripe_customer_id, stripe_subscription_id

**Stripe Setup**:

- [ ] Create Stripe account & test mode keys
- [ ] Define price objects (Pro, Enterprise)
- [ ] Create webhook endpoint
- [ ] Test webhook signatures

**API Endpoints**:

- [ ] POST `/api/billing/create-customer`
- [ ] POST `/api/billing/create-subscription`
- [ ] POST `/api/billing/update-subscription`
- [ ] POST `/api/billing/cancel-subscription`
- [ ] GET `/api/billing/subscription`
- [ ] POST `/api/billing/create-portal-session`
- [ ] POST `/api/webhooks/stripe`
- [ ] POST `/api/billing/track-usage`

**UI Components**:

- [ ] Update `/app/settings` with billing section
- [ ] Create `/app/billing` page (manage subscription)
- [ ] Create upgrade/downgrade modals
- [ ] Add tier badges to projects list
- [ ] Add feature unlock paywall components

**Feature Gates**:

- [ ] Add usage checks before AI operations
- [ ] Add storage checks before uploads
- [ ] Add feature availability checks in UI
- [ ] Add rate limiting enforcement

**Monitoring**:

- [ ] Track subscription lifecycle events
- [ ] Monitor usage patterns
- [ ] Alert on failed payments
- [ ] Analytics for conversion rates

---

## 7. ENVIRONMENT VARIABLES NEEDED

For Stripe integration, add to `.env.local`:

```env
# Stripe Keys
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Optional: Stripe dashboard URLs
STRIPE_DASHBOARD_URL=https://dashboard.stripe.com
```

---

## 8. SECURITY CONSIDERATIONS

1. **Service Role Key**: Already configured for admin operations
   - Used in webhooks to update user_profiles
   - Bypasses RLS for system operations

2. **RLS Policies**: Already in place
   - Users can only access their own profile
   - Service role can update profiles for Stripe webhooks

3. **Webhook Signature Verification**: Required
   - Verify Stripe webhook signatures in handler
   - Use STRIPE_WEBHOOK_SECRET for verification

4. **PCI Compliance**: Automatic with Stripe
   - Stripe handles all payment data
   - App never sees credit card numbers
   - Use Stripe.js for tokenization

5. **Rate Limiting**: Already implemented
   - `rate_limits` table tracks API usage
   - Can enforce stricter limits for free tier

---

## 9. MIGRATION PATH

### Step 1: Create Infrastructure (1-2 days)

```
- Create user_profiles table
- Create billing-related tables
- Set up Stripe account
- Create webhook endpoint
```

### Step 2: Implement Backend (2-3 days)

```
- Implement Stripe API calls
- Create /api/billing/* endpoints
- Create webhook handler
- Implement usage tracking
```

### Step 3: Update Settings Page (1 day)

```
- Add billing section
- Show current tier
- Add upgrade button
- Show usage limits
```

### Step 4: Add Feature Gates (1-2 days)

```
- Add tier checks before AI operations
- Add upgrade prompts
- Add paywall components
```

### Step 5: Testing & Launch (2-3 days)

```
- Test Stripe integration (test mode)
- Test upgrade/downgrade flow
- Test webhook handling
- Beta test with select users
```

**Total: 1-2 weeks** for full three-tier system

---

## 10. SUMMARY

| Aspect          | Current State      | For Subscriptions          |
| --------------- | ------------------ | -------------------------- |
| Authentication  | Supabase Auth ✅   | Ready to use               |
| User Data       | `auth.users` only  | Need `user_profiles` table |
| RLS/Security    | Implemented ✅     | Extend for billing data    |
| Database        | 9 tables + RLS ✅  | Add 2-3 billing tables     |
| Payment Code    | None               | Need Stripe integration    |
| Feature Gates   | None               | Need to build              |
| Settings UI     | Basic ✅           | Need billing section       |
| Usage Tracking  | processing_jobs ✅ | Need metrics aggregation   |
| Webhook Handler | None               | Need for Stripe            |
| Documentation   | Comprehensive ✅   | Add billing docs           |

---

## File Paths for Reference

**Key Files**:

- `/lib/supabase.ts` - Supabase client setup
- `/components/providers/SupabaseProvider.tsx` - Auth context
- `/app/settings/page.tsx` - Current settings UI
- `/supabase/migrations/20250101000000_init_schema.sql` - Schema
- `/.env.local.example` - Environment variables

**Where to Add**:

- `/supabase/migrations/YYYYMMDD_add_user_profiles.sql` - New table
- `/lib/subscriptionTiers.ts` - Tier definitions
- `/lib/featureGates.ts` - Feature checking logic
- `/app/api/billing/*` - Stripe API routes (create 6-8 files)
- `/app/api/webhooks/stripe.ts` - Webhook handler
- `/app/billing/page.tsx` - Billing management UI
- `.env.local` - Add Stripe keys
