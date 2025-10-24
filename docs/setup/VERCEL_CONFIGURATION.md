# Vercel Configuration

## Correct Project Settings

Your project is correctly configured on Vercel:

- **Team**: `dream-real-b2bc4dd2` (DreamReal - Vercel Pro)
- **Project Name**: `nonlinear-editor` (no hyphen)
- **Production URL**: https://nonlinear-editor.vercel.app
- **Project ID**: `prj_Apjk1ePoqArLnNAuwV7a2PYFqPj7`
- **Org ID**: `team_ra9Xgu9c3IP9hFzqynTmhkwp`

## Environment Variables Status

✅ **All major environment variables are configured:**

- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- SUPABASE_ACCESS_TOKEN
- STRIPE_SECRET_KEY
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
- GOOGLE_SERVICE_ACCOUNT
- GCS_BUCKET_NAME
- AXIOM_TOKEN
- AXIOM_DATASET
- FAL_API_KEY
- COMET_API_KEY
- ELEVENLABS_API_KEY
- WAVESPEED_API_KEY
- RESEND_API_KEY
- VERCEL_TOKEN
- OPENAI_API_KEY
- SHOTSTACK_API_KEY
- PERPLEXITY_API_KEY
- SEGMIND_API_KEY
- REPLICATE_API_KEY
- PIAPI_API_KEY

All variables are set for **Production**, **Preview**, and **Development** environments.

## Missing Variables

⚠️ **Optional but recommended:**

1. **STRIPE_WEBHOOK_SECRET** - Required for Stripe webhook signature verification
   - Without this, subscription webhooks will return 503 errors
   - Get from: Stripe Dashboard → Developers → Webhooks
   - Add with: `vercel env add STRIPE_WEBHOOK_SECRET production`

2. **NEXT_PUBLIC_BASE_URL** - For consistent URLs across environments
   - Should be: `https://nonlinear-editor.vercel.app`
   - Add with: `vercel env add NEXT_PUBLIC_BASE_URL production`

3. **STRIPE_PREMIUM_PRICE_ID** - For checkout flow
   - Get from: Stripe Dashboard → Products → Premium → Pricing
   - Add with: `vercel env add STRIPE_PREMIUM_PRICE_ID production`

## Recent Fix

Previously, the project was incorrectly linked to team `dream-real` (project name `non-linear-editor` with hyphen), which had no environment variables and caused all deployments to fail.

**Fixed on**: 2025-10-23

- Removed duplicate project from wrong team
- Relinked to correct team: `dream-real-b2bc4dd2`
- All deployments now succeeding ✅
- **Created `.vercelrc`** to permanently lock to correct team

## Permanent Team Lock

A `.vercelrc` file has been created in the project root to ensure the CLI always uses the correct team:

```json
{
  "scope": "dream-real-b2bc4dd2"
}
```

This file is committed to the repository, so all team members and CI/CD pipelines will automatically use the correct Vercel team. **No manual switching required!**

## Deployment Commands

```bash
# Deploy to production
vercel --prod

# List environment variables
vercel env ls

# Add new environment variable
vercel env add VARIABLE_NAME production

# Pull environment variables for local development
vercel env pull .env.local
```

## Troubleshooting

If deployments fail or CLI shows "No Environment Variables found":

1. Verify you're on the correct team:

   ```bash
   vercel whoami  # Should show: dreamrealai
   ```

2. Check project link:

   ```bash
   cat .vercel/project.json
   # Should show orgId: team_ra9Xgu9c3IP9hFzqynTmhkwp
   ```

3. Re-link if necessary:
   ```bash
   rm -rf .vercel
   vercel link --scope dream-real-b2bc4dd2 --project nonlinear-editor
   ```

## Production Status

✅ **Deployment Status**: SUCCESS
✅ **Site Accessible**: https://nonlinear-editor.vercel.app (200 OK)
✅ **Environment Variables**: 48+ variables configured
⚠️ **Stripe Webhooks**: Need STRIPE_WEBHOOK_SECRET for full functionality
