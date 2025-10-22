# Vercel Environment Variables Setup

This guide explains how to configure environment variables in Vercel for this project.

## Required Environment Variables

Your application requires the following environment variables to function properly:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
SUPABASE_ACCESS_TOKEN=<your-access-token>
```

### Email Service (Resend)
```
RESEND_API_KEY=<your-resend-api-key>
```

### Vercel Token
```
VERCEL_TOKEN=<your-vercel-token>
```

### Audio Generation APIs
```
COMET_API_KEY=<your-comet-api-key>
ELEVENLABS_API_KEY=<your-elevenlabs-api-key>
WAVESPEED_API_KEY=<your-wavespeed-api-key>
```

**📋 Quick Reference**: All actual values are stored in your local `.env.local` file. Copy them from there when setting up Vercel.

### Google Service Account
```
GOOGLE_SERVICE_ACCOUNT=<your-service-account-json-from-env-local>
```

**Note**: Copy the full JSON value from your `.env.local` file. Do NOT include the actual credentials in this documentation.

## Setup Methods

### Method 1: Vercel Dashboard (Recommended)

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (non-linear-editor)
3. Go to **Settings** → **Environment Variables**
4. Add each variable:
   - **Key**: Variable name (e.g., `COMET_API_KEY`)
   - **Value**: The actual value
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**
6. **Redeploy** your application for changes to take effect

### Method 2: Vercel CLI

If you have Vercel CLI installed:

```bash
# Set individual variables
vercel env add COMET_API_KEY production
vercel env add ELEVENLABS_API_KEY production
vercel env add WAVESPEED_API_KEY production
vercel env add GOOGLE_SERVICE_ACCOUNT production

# Or use a script to set all at once (create a file called set-env.sh):
#!/bin/bash
cat .env.local | while read line; do
  if [[ $line != \#* ]] && [[ $line =~ ^[A-Z] ]]; then
    vercel env add $(echo $line | cut -d= -f1) production
  fi
done
```

### Method 3: Using vercel.json (Not Recommended for Secrets)

For non-sensitive variables only, you can add to `vercel.json`:

```json
{
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://wrximmuaibfjmjrfriej.supabase.co"
  }
}
```

**⚠️ WARNING**: Never commit sensitive keys to `vercel.json` as it's tracked by git!

## Verification

After setting environment variables:

1. Go to your Vercel deployment
2. Check **Deployments** → **Latest Deployment** → **Environment Variables**
3. Verify all variables are present (values will be hidden)
4. Redeploy if needed: **Deployments** → **...** → **Redeploy**

## Environment Variable Precedence

Vercel uses the following precedence (highest to lowest):
1. Environment Variables set in Vercel Dashboard/CLI
2. `.env.production` (for production)
3. `.env.local` (not deployed to Vercel)
4. `.env`

## Security Notes

- ✅ `.env.local` is in `.gitignore` and never committed to git
- ✅ Environment variables in Vercel are encrypted at rest
- ✅ Only team members with proper permissions can view them
- ⚠️ Never expose sensitive keys in client-side code
- ⚠️ Use `NEXT_PUBLIC_*` prefix only for non-sensitive variables

## Troubleshooting

**Variables not working after deployment:**
- Verify variable names match exactly (case-sensitive)
- Check you've redeployed after adding variables
- Verify the environment is correct (Production/Preview/Development)

**Build failing:**
- Check for required variables in build process
- Some variables may need to be available at build time

**Runtime errors:**
- Verify `process.env.VARIABLE_NAME` syntax in code
- Check Edge Runtime compatibility for edge functions

## Contact

If you need to rotate any keys or have issues, contact the project maintainer.
