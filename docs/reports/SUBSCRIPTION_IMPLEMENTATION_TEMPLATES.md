# Subscription Implementation Code Templates

This document contains starter code templates for implementing the three-tier subscription system.

## 1. Database Migration: Create User Profiles Table

**File**: `/supabase/migrations/20250124000000_add_user_profiles.sql`

```sql
-- Create user_profiles table for subscription management
create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,

  -- Profile Information
  display_name text,
  avatar_url text,

  -- Subscription Information
  tier text not null default 'free'
    check (tier in ('free', 'pro', 'enterprise')),
  subscription_status text not null default 'active'
    check (subscription_status in ('active', 'cancelled', 'past_due', 'trial', 'paused')),

  -- Stripe Integration
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  stripe_price_id text,

  -- Trial Information
  trial_started_at timestamptz,
  trial_ends_at timestamptz,

  -- Billing Period
  current_period_start timestamptz,
  current_period_end timestamptz,

  -- Usage Tracking
  monthly_video_minutes integer default 0,
  monthly_video_limit integer not null default 10,
  monthly_ai_requests integer default 0,
  monthly_ai_limit integer not null default 50,
  storage_used_bytes bigint default 0,
  storage_limit_bytes bigint not null default 5368709120,  -- 5GB

  -- Metadata
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for Stripe lookups
create index if not exists user_profiles_stripe_customer_idx
  on user_profiles(stripe_customer_id);
create index if not exists user_profiles_stripe_subscription_idx
  on user_profiles(stripe_subscription_id);
create index if not exists user_profiles_tier_idx
  on user_profiles(tier);

-- Enable Row Level Security
alter table user_profiles enable row level security;

-- Users can only access their own profile
create policy "users_own_profile"
  on user_profiles for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Service role can manage all profiles (for webhooks)
create policy "service_role_manage_profiles"
  on user_profiles for all to service_role
  using (true);

-- Auto-update timestamp
create or replace function update_user_profiles_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger user_profiles_updated_at
  before update on user_profiles
  for each row
  execute function update_user_profiles_updated_at();

-- Create a user profile automatically when user signs up
-- This requires a trigger on auth.users (set up in Supabase dashboard)
-- Or call it manually from your signup endpoint

comment on table user_profiles is
  'Stores subscription tier, Stripe integration, and usage limits for each user';
```

---

## 2. Subscription Tiers Definition

**File**: `/lib/subscriptionTiers.ts`

```typescript
export interface SubscriptionTier {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  monthlyVideos: number | null; // null = unlimited
  monthlyAiRequests: number | null;
  storageGB: number;
  costPerMonth: number | string;
  stripePriceId: string | null;
  features: string[];
  color: string;
  badge?: string;
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionTier> = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyVideos: 10,
    monthlyAiRequests: 50,
    storageGB: 5,
    costPerMonth: 0,
    stripePriceId: null,
    color: 'gray',
    features: [
      'Basic video editing',
      'Asset management (5GB)',
      'Scene detection',
      'Keyframe editing',
      'Standard export (1080p)',
      'Chat assistant',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    monthlyVideos: 500,
    monthlyAiRequests: 2000,
    storageGB: 100,
    costPerMonth: 29,
    stripePriceId: 'price_1234567890', // Set this from Stripe dashboard
    color: 'blue',
    badge: 'POPULAR',
    features: [
      'Everything in Free',
      'AI video generation (500 min/month)',
      'AI image generation (2000 req/month)',
      'Text-to-speech generation',
      '4K export',
      '100GB storage',
      'Custom branding',
      'Priority support',
      'Advanced audio tools',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyVideos: null,
    monthlyAiRequests: null,
    storageGB: 1000,
    costPerMonth: 'Custom',
    stripePriceId: null, // Contact sales
    color: 'purple',
    badge: 'ADVANCED',
    features: [
      'Everything in Pro',
      'Unlimited AI operations',
      'Unlimited storage',
      'API access',
      'Webhooks',
      'Team collaboration',
      'SSO & advanced security',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
};

export function getTierByPrice(stripePriceId: string): SubscriptionTier | null {
  return Object.values(SUBSCRIPTION_TIERS).find((t) => t.stripePriceId === stripePriceId) || null;
}

export function getTier(tierId: string): SubscriptionTier {
  return SUBSCRIPTION_TIERS[tierId] || SUBSCRIPTION_TIERS.free;
}
```

---

## 3. Feature Gates Utility

**File**: `/lib/featureGates.ts`

```typescript
import { createServerSupabaseClient, createBrowserSupabaseClient } from '@/lib/supabase';
import { SUBSCRIPTION_TIERS } from '@/lib/subscriptionTiers';

export interface UserProfile {
  user_id: string;
  tier: 'free' | 'pro' | 'enterprise';
  subscription_status: string;
  monthly_video_minutes: number;
  monthly_video_limit: number;
  monthly_ai_requests: number;
  monthly_ai_limit: number;
  storage_used_bytes: number;
  storage_limit_bytes: number;
}

// Server-side function
export async function checkUserTierServer(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error) {
    console.error('Failed to check user tier:', error);
    return null;
  }
}

// Client-side hook (use in components)
export async function checkUserTierClient(userId: string): Promise<UserProfile | null> {
  try {
    const supabase = createBrowserSupabaseClient();
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data as UserProfile;
  } catch (error) {
    console.error('Failed to check user tier:', error);
    return null;
  }
}

// Check if user can use a specific feature
export async function canUseFeature(
  userId: string,
  feature: 'ai-video' | 'ai-image' | 'tts' | 'export-4k' | 'api-access'
): Promise<boolean> {
  const profile = await checkUserTierServer(userId);
  if (!profile) return false;

  const tierFeatures = {
    free: [],
    pro: ['ai-video', 'ai-image', 'tts', 'export-4k'],
    enterprise: ['ai-video', 'ai-image', 'tts', 'export-4k', 'api-access'],
  };

  return tierFeatures[profile.tier].includes(feature);
}

// Check usage limits
export async function checkVideoUsage(userId: string): Promise<{
  available: number;
  used: number;
  limit: number;
  percentage: number;
  canUse: boolean;
}> {
  const profile = await checkUserTierServer(userId);
  if (!profile) {
    return { available: 0, used: 0, limit: 0, percentage: 0, canUse: false };
  }

  const used = profile.monthly_video_minutes;
  const limit = profile.monthly_video_limit;
  const available = Math.max(0, limit - used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return {
    available,
    used,
    limit,
    percentage,
    canUse: available > 0,
  };
}

export async function checkAiRequestUsage(userId: string): Promise<{
  available: number;
  used: number;
  limit: number;
  percentage: number;
  canUse: boolean;
}> {
  const profile = await checkUserTierServer(userId);
  if (!profile) {
    return { available: 0, used: 0, limit: 0, percentage: 0, canUse: false };
  }

  const used = profile.monthly_ai_requests;
  const limit = profile.monthly_ai_limit;
  const available = Math.max(0, limit - used);
  const percentage = limit > 0 ? (used / limit) * 100 : 0;

  return {
    available,
    used,
    limit,
    percentage,
    canUse: available > 0,
  };
}

export async function checkStorageUsage(userId: string): Promise<{
  available: bigint;
  used: bigint;
  limit: bigint;
  percentage: number;
  canUpload: (fileSizeBytes: number) => boolean;
}> {
  const profile = await checkUserTierServer(userId);
  if (!profile) {
    return {
      available: 0n,
      used: 0n,
      limit: 0n,
      percentage: 0,
      canUpload: () => false,
    };
  }

  const used = BigInt(profile.storage_used_bytes);
  const limit = BigInt(profile.storage_limit_bytes);
  const available = limit > used ? limit - used : 0n;
  const percentage = limit > 0n ? Number((used * 100n) / limit) : 0;

  return {
    available,
    used,
    limit,
    percentage,
    canUpload: (fileSizeBytes: number) => {
      return available > BigInt(fileSizeBytes);
    },
  };
}
```

---

## 4. Stripe API Endpoint: Create Subscription

**File**: `/app/api/billing/create-subscription/route.ts`

```typescript
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18',
});

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { priceId } = await request.json();

    if (!priceId) {
      return NextResponse.json({ error: 'Price ID required' }, { status: 400 });
    }

    // Get or create Stripe customer
    let { data: profile } = await supabase
      .from('user_profiles')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    let stripeCustomerId = profile?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Update user profile with Stripe customer ID
      await supabase.from('user_profiles').upsert({
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      });
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        user_id: user.id,
      },
    });

    return NextResponse.json({
      subscriptionId: subscription.id,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret,
    });
  } catch (error) {
    console.error('Subscription creation error:', error);
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }
}
```

---

## 5. Stripe Webhook Handler

**File**: `/app/api/webhooks/stripe/route.ts`

```typescript
import { createServiceSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') || '';

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const supabase = createServiceSupabaseClient();

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Get customer to find user_id
        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.user_id;

        if (!userId) {
          console.error('User ID not found in Stripe customer metadata');
          break;
        }

        // Determine tier from price ID
        let tier = 'free';
        if (subscription.items.data.length > 0) {
          const priceId = subscription.items.data[0].price.id;
          if (priceId.includes('pro')) tier = 'pro';
          if (priceId.includes('enterprise')) tier = 'enterprise';
        }

        // Update user profile
        await supabase.from('user_profiles').upsert({
          user_id: userId,
          stripe_subscription_id: subscription.id,
          tier,
          subscription_status: 'active',
          current_period_start: new Date(subscription.current_period_start * 1000),
          current_period_end: new Date(subscription.current_period_end * 1000),
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.user_id;

        if (userId) {
          await supabase
            .from('user_profiles')
            .update({
              tier: 'free',
              subscription_status: 'cancelled',
              stripe_subscription_id: null,
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.user_id;

        if (userId) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'past_due',
            })
            .eq('user_id', userId);
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const customer = await stripe.customers.retrieve(customerId);
        const userId = customer.metadata?.user_id;

        if (userId) {
          await supabase
            .from('user_profiles')
            .update({
              subscription_status: 'active',
            })
            .eq('user_id', userId);
        }
        break;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
```

---

## 6. Usage Tracking API

**File**: `/app/api/billing/track-usage/route.ts`

```typescript
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, amount } = await request.json();

    if (!type || !amount) {
      return NextResponse.json({ error: 'Type and amount required' }, { status: 400 });
    }

    // Track usage based on type
    const updateField =
      type === 'video'
        ? { monthly_video_minutes: { increment: amount } }
        : type === 'ai'
          ? { monthly_ai_requests: { increment: amount } }
          : null;

    if (!updateField) {
      return NextResponse.json({ error: 'Invalid usage type' }, { status: 400 });
    }

    // Update user profile
    const { error } = await supabase
      .from('user_profiles')
      .update(updateField)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      message: `Tracked ${amount} ${type} usage`,
    });
  } catch (error) {
    console.error('Usage tracking error:', error);
    return NextResponse.json({ error: 'Failed to track usage' }, { status: 500 });
  }
}
```

---

## 7. Billing Settings Component

**File**: `/components/BillingSection.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/components/providers/SupabaseProvider';
import { SUBSCRIPTION_TIERS } from '@/lib/subscriptionTiers';
import { checkUserTierClient } from '@/lib/featureGates';
import toast from 'react-hot-toast';

export default function BillingSection() {
  const { supabaseClient, user } = useSupabase();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabaseClient) return;

    const loadProfile = async () => {
      try {
        const profile = await checkUserTierClient(user.id);
        setProfile(profile);
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, supabaseClient]);

  const handleUpgrade = async (tierId: string) => {
    if (!user) return;

    try {
      // Call your subscription endpoint
      const response = await fetch('/api/billing/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: SUBSCRIPTION_TIERS[tierId].stripePriceId
        })
      });

      if (!response.ok) throw new Error('Failed to create subscription');

      const { clientSecret } = await response.json();
      // Redirect to Stripe checkout or use Stripe.js
      toast.success('Subscription created! Redirecting...');
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to upgrade subscription');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>Failed to load billing information</div>;

  const currentTier = SUBSCRIPTION_TIERS[profile.tier];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-4">Billing & Subscription</h2>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600">Current Plan</p>
              <p className="text-2xl font-bold text-blue-900">{currentTier.name}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-blue-900">
                {typeof currentTier.costPerMonth === 'number'
                  ? `$${currentTier.costPerMonth}`
                  : currentTier.costPerMonth}
              </p>
              {typeof currentTier.costPerMonth === 'number' && (
                <p className="text-sm text-blue-600">/month</p>
              )}
            </div>
          </div>
        </div>

        {/* Usage Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {profile.monthly_video_limit && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Video Minutes</p>
              <p className="text-lg font-semibold">
                {profile.monthly_video_minutes} / {profile.monthly_video_limit}
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(profile.monthly_video_minutes / profile.monthly_video_limit) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          )}
          {profile.monthly_ai_limit && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">AI Requests</p>
              <p className="text-lg font-semibold">
                {profile.monthly_ai_requests} / {profile.monthly_ai_limit}
              </p>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${(profile.monthly_ai_requests / profile.monthly_ai_limit) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade Options */}
        {profile.tier !== 'enterprise' && (
          <div className="space-y-4">
            {profile.tier === 'free' && (
              <button
                onClick={() => handleUpgrade('pro')}
                className="w-full bg-blue-600 text-white rounded-lg py-3 font-semibold hover:bg-blue-700"
              >
                Upgrade to Pro - $29/month
              </button>
            )}
            {profile.tier === 'pro' && (
              <button
                onClick={() => handleUpgrade('enterprise')}
                className="w-full bg-purple-600 text-white rounded-lg py-3 font-semibold hover:bg-purple-700"
              >
                Upgrade to Enterprise
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 8. Environment Configuration

**Update `.env.local`** with:

```env
# Stripe (get from https://dashboard.stripe.com)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_YOUR_WEBHOOK_SECRET_HERE
```

---

## Implementation Checklist

- [ ] Create migration: `20250124000000_add_user_profiles.sql`
- [ ] Create `/lib/subscriptionTiers.ts`
- [ ] Create `/lib/featureGates.ts`
- [ ] Create `/app/api/billing/create-subscription/route.ts`
- [ ] Create `/app/api/webhooks/stripe/route.ts`
- [ ] Create `/app/api/billing/track-usage/route.ts`
- [ ] Create `/components/BillingSection.tsx`
- [ ] Update `/app/settings/page.tsx` to include BillingSection
- [ ] Add Stripe dependencies: `npm install stripe`
- [ ] Set environment variables in `.env.local`
- [ ] Test with Stripe test mode
- [ ] Create Stripe webhook endpoint in dashboard
- [ ] Test subscription flow end-to-end
