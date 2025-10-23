# Subscription System Setup Guide

This document provides step-by-step instructions for setting up and configuring the three-tier subscription system with Stripe integration.

## Overview

The system supports three user tiers:
- **Free**: 10 video minutes/month, 50 AI requests/month, 5 GB storage
- **Premium**: 500 video minutes/month, 2,000 AI requests/month, 100 GB storage ($49/month)
- **Admin**: Unlimited resources with admin dashboard access

## Prerequisites

- Stripe account (https://stripe.com)
- Supabase project with service role key
- Node.js and npm installed

## Step 1: Run Database Migration

Apply the subscription system migration to your Supabase database:

```bash
# Connect to your Supabase project and run the migration
# You can do this through the Supabase Dashboard or using the CLI
supabase db push
```

Or manually run the migration file:
```
supabase/migrations/20251023000000_add_user_subscription_system.sql
```

## Step 2: Configure Environment Variables

Your `.env.local` file should already contain the Stripe keys. You'll need to add one more:

```bash
STRIPE_PREMIUM_PRICE_ID=<will be generated in next step>
STRIPE_WEBHOOK_SECRET=<will be generated when you create webhook>
```

## Step 3: Set Up Stripe Products

Run the setup script to create the Premium product and price in Stripe:

```bash
npx tsx scripts/setup-stripe.ts
```

This will output a `STRIPE_PREMIUM_PRICE_ID`. Add it to your `.env.local` file.

## Step 4: Configure Stripe Webhook

1. Go to the Stripe Dashboard: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Enter your webhook URL: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook signing secret
6. Add it to `.env.local` as `STRIPE_WEBHOOK_SECRET`

## Step 5: Create Your First Admin User

1. First, sign up for an account through your app's normal signup flow
2. Run the admin creation script with your email:

```bash
npx tsx scripts/create-admin.ts your-email@example.com
```

3. You can now access the admin dashboard at `/admin`

## Step 6: Test the Subscription Flow

### Test Premium Subscription (Free → Premium)

1. Create a test user account (or use your existing account)
2. Go to `/settings`
3. Click "Upgrade to Premium"
4. Use Stripe test card: `4242 4242 4242 4242`
5. Complete checkout
6. Verify you're upgraded to Premium tier

### Test Subscription Management

1. Go to `/settings`
2. Click "Manage Subscription"
3. Test canceling/resuming subscription

### Test Admin Dashboard

1. Log in as admin user
2. Go to `/admin`
3. Test changing user tiers
4. Test viewing all users and statistics

## Step 7: Usage Tracking

The system automatically tracks usage. To increment usage:

```typescript
// Example: Track video generation
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('id', userId)
  .single();

// Check if user has quota
if (profile.video_minutes_used >= profile.video_minutes_limit) {
  throw new Error('Video minute quota exceeded. Please upgrade.');
}

// Increment usage
await supabase
  .from('user_profiles')
  .update({
    video_minutes_used: profile.video_minutes_used + minutesGenerated
  })
  .eq('id', userId);
```

## Monthly Usage Reset

The database has a function `reset_monthly_usage()` that resets usage counters. Set up a cron job to call it monthly:

```sql
-- Example: Reset usage on the 1st of each month
SELECT reset_monthly_usage();
```

Or use Supabase Edge Functions with a cron trigger.

## Production Deployment Checklist

- [ ] Database migration applied
- [ ] All environment variables set (including webhook secret)
- [ ] Stripe webhook configured with production URL
- [ ] Stripe Premium product and price created
- [ ] Admin user created
- [ ] Test subscription flow works
- [ ] Usage tracking implemented in API routes
- [ ] Monthly usage reset scheduled
- [ ] Webhook endpoint is publicly accessible
- [ ] SSL/HTTPS enabled for webhook endpoint

## Stripe Test Cards

For testing:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Authentication Required: `4000 0025 0000 3155`

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct and publicly accessible
- Verify STRIPE_WEBHOOK_SECRET is set correctly
- Check webhook logs in Stripe Dashboard

### User not upgraded after payment
- Check webhook received `checkout.session.completed` event
- Verify user_profiles table was updated
- Check API logs for errors

### Admin dashboard access denied
- Verify user tier is set to 'admin' in database
- Check user is logged in
- Verify RLS policies allow admin access

## API Endpoints

- `POST /api/stripe/checkout` - Create checkout session
- `POST /api/stripe/portal` - Create billing portal session
- `POST /api/stripe/webhook` - Handle Stripe webhooks
- `POST /api/admin/change-tier` - Change user tier (admin only)
- `POST /api/admin/delete-user` - Delete user account (admin only)

## Database Tables

- `user_profiles` - User subscription and usage data
- `subscription_history` - Subscription change log
- `usage_tracking` - Historical usage data

## Support

For issues or questions:
1. Check webhook logs in Stripe Dashboard
2. Check application logs for errors
3. Verify database migrations ran successfully
4. Test with Stripe test cards first
