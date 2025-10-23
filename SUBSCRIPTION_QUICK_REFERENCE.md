# Quick Reference: Authentication & Subscriptions

## Current State at a Glance

```
┌─────────────────────────────────────────────────────────────┐
│           NON-LINEAR EDITOR - CURRENT SETUP                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Authentication:  ✅ Supabase Auth (Built-in)               │
│  Users Table:     ❌ NO custom users/profiles table          │
│  Payment Code:    ❌ NO Stripe integration                   │
│  Settings Page:   ✅ Basic (password only)                   │
│  Feature Gates:   ❌ NO subscription limits                  │
│  RLS Security:    ✅ Implemented for all tables              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## What Exists

### Authentication
- Supabase Auth with email/password
- OAuth callback handler
- Session management via httpOnly cookies
- JWT tokens with auto-refresh

### User Data Currently Used
- Email address from `auth.users`
- User ID (UUID) from `auth.users`

### Data Stored Per User
- Projects (editing projects)
- Assets (media files)
- Scenes (detected scenes)
- Timelines (editor state)
- Processing jobs (async operations)

## What's Missing for Subscriptions

1. **User Profile Table**
   - Store subscription tier (free/pro/enterprise)
   - Store Stripe customer ID
   - Store usage limits and current usage

2. **Stripe Integration**
   - Create customer endpoint
   - Create subscription endpoint
   - Webhook handler for events
   - Billing portal link

3. **Feature Gates**
   - Check tier before allowing AI features
   - Check usage limits before operations
   - Enforce storage limits

4. **Settings UI Update**
   - Show current subscription
   - Add upgrade button
   - Show usage dashboard

## Database Schema To Add

```sql
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY → auth.users,
  
  -- Subscription
  tier TEXT DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  
  -- Usage
  monthly_video_minutes INTEGER,
  monthly_video_limit INTEGER,
  monthly_ai_requests INTEGER,
  monthly_ai_limit INTEGER,
  storage_used_bytes BIGINT,
  storage_limit_bytes BIGINT,
  
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## API Endpoints To Create

```
POST   /api/billing/create-customer
POST   /api/billing/create-subscription
POST   /api/billing/update-subscription
POST   /api/billing/cancel-subscription
GET    /api/billing/subscription
POST   /api/billing/create-portal-session
POST   /api/webhooks/stripe          ← Handles Stripe events
POST   /api/billing/track-usage
```

## Tier Definition Example

```
FREE (Default)
├─ 10 min video/month
├─ 50 AI requests/month
├─ 5 GB storage
└─ Basic editing features

PRO ($29/month)
├─ 500 min video/month
├─ 2,000 AI requests/month
├─ 100 GB storage
├─ AI video generation
├─ AI image generation
└─ Text-to-speech

ENTERPRISE (Custom)
├─ Unlimited everything
├─ 1 TB storage
├─ API access
├─ Team collaboration
└─ Dedicated support
```

## Implementation Order

1. **Create user_profiles table** (1 day)
2. **Set up Stripe account & keys** (1 day)
3. **Implement backend endpoints** (2 days)
4. **Add webhook handler** (1 day)
5. **Update settings UI** (1 day)
6. **Add feature gates** (2 days)
7. **Testing & launch** (2-3 days)

**Total: ~10-12 days**

## Key Files To Know

### Current Code
- `/lib/supabase.ts` - Supabase client setup
- `/components/providers/SupabaseProvider.tsx` - Auth context
- `/app/settings/page.tsx` - Current settings (update this)
- `/supabase/migrations/20250101000000_init_schema.sql` - Schema

### Files To Create
- `/supabase/migrations/[DATE]_add_user_profiles.sql` - New table
- `/lib/subscriptionTiers.ts` - Define tier limits
- `/lib/featureGates.ts` - Check user tier & limits
- `/app/api/billing/create-subscription.ts` - Stripe API
- `/app/api/webhooks/stripe.ts` - Webhook handler
- `/app/billing/page.tsx` - Billing management
- `/components/BillingSection.tsx` - Settings UI component

## Environment Variables To Add

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Critical Security Notes

1. Stripe never touches credit cards (uses Stripe.js)
2. Service role key (already configured) used for webhook updates
3. RLS policies prevent users from modifying their own subscription
4. Webhook signature verification is mandatory
5. Rate limiting table (already exists) can enforce free tier limits

## Next Steps

1. Read the full report: `AUTHENTICATION_AND_SUBSCRIPTION_ANALYSIS.md`
2. Create Stripe account (test mode first)
3. Create `user_profiles` table migration
4. Implement `/api/billing/*` endpoints
5. Update settings page UI
6. Test with test Stripe account
7. Deploy when ready

