# Environment Variables Documentation

This document provides comprehensive documentation for all environment variables used in the DreamReal AI non-linear video editor application.

## Table of Contents

- [Quick Start](#quick-start)
- [Required Variables](#required-variables)
- [Optional Variables](#optional-variables)
- [Environment-Specific Configuration](#environment-specific-configuration)
- [Security Best Practices](#security-best-practices)
- [Validation](#validation)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. Copy the example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in the required variables (see [Required Variables](#required-variables))

3. Validate your configuration:

   ```bash
   npm run validate:env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Required Variables

These variables MUST be set for the application to function properly.

### Core Application

#### `NODE_ENV`

- **Type**: `development` | `production` | `test`
- **Required**: Auto-set by Next.js
- **Default**: `development`
- **Description**: Node environment mode
- **Example**: `development`
- **Notes**: Usually set automatically by Next.js, no need to configure manually

### Supabase (Authentication & Database)

#### `NEXT_PUBLIC_SUPABASE_URL`

- **Type**: String (URL)
- **Required**: Yes
- **Default**: None
- **Description**: Your Supabase project URL
- **Example**: `https://xxxxxxxxxxxxx.supabase.co`
- **Format**: Must match pattern `https://*.supabase.co`
- **Get from**: [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) > Project Settings > API > Project URL
- **Notes**: Public variable, safe to expose to client (prefix: `NEXT_PUBLIC_`)

#### `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- **Type**: String (JWT)
- **Required**: Yes
- **Default**: None
- **Description**: Supabase anonymous/public key for client-side authentication
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Format**: Must be a valid JWT token starting with `eyJ`
- **Get from**: [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) > Project Settings > API > anon/public key
- **Notes**:
  - Public variable, safe to expose to client
  - Respects Row Level Security (RLS) policies
  - Used for client-side Supabase operations

#### `SUPABASE_SERVICE_ROLE_KEY`

- **Type**: String (JWT)
- **Required**: Yes
- **Default**: None
- **Description**: Supabase service role key with admin privileges
- **Example**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Format**: Must be a valid JWT token starting with `eyJ`
- **Get from**: [Supabase Dashboard](https://app.supabase.com/project/_/settings/api) > Project Settings > API > service_role key
- **Notes**:
  - **CRITICAL**: NEVER expose to client or commit to version control
  - Bypasses Row Level Security (RLS)
  - Used for admin operations, webhooks, and background tasks
  - Also recognized as `SUPABASE_SERVICE_SECRET` (legacy name)

### Stripe (Payment Processing)

#### `STRIPE_SECRET_KEY`

- **Type**: String
- **Required**: Yes
- **Default**: None
- **Description**: Stripe secret key for API access
- **Example**: `sk_test_...` (test) or `sk_live_...` (production)
- **Format**: Must start with `sk_`
- **Get from**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) > Developers > API keys
- **Notes**:
  - **CRITICAL**: NEVER expose to client
  - Use `sk_test_` for development/testing
  - Use `sk_live_` for production

#### `STRIPE_WEBHOOK_SECRET`

- **Type**: String
- **Required**: Yes (production), Optional (development)
- **Default**: None
- **Description**: Stripe webhook signing secret for webhook verification
- **Example**: `whsec_...`
- **Format**: Must start with `whsec_`
- **Get from**: [Stripe Dashboard](https://dashboard.stripe.com/webhooks) > Webhooks
- **Setup**:

  **For local development:**

  ```bash
  # Install Stripe CLI
  stripe listen --forward-to localhost:3000/api/stripe/webhook
  # Copy the webhook signing secret from the output
  ```

  **For production:**
  1. Add webhook endpoint: `https://your-domain.com/api/stripe/webhook`
  2. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
  3. Copy the webhook signing secret

- **Notes**:
  - **CRITICAL**: Required for webhook security
  - Webhooks will fail with 503 error if not configured
  - Different secrets for development and production

#### `STRIPE_PREMIUM_PRICE_ID`

- **Type**: String
- **Required**: Optional (can be created via setup script)
- **Default**: None
- **Description**: Stripe price ID for Premium subscription tier ($49/month)
- **Example**: `price_...`
- **Format**: Must start with `price_`
- **Get from**: [Stripe Dashboard](https://dashboard.stripe.com/products) > Products
- **Setup**: Run `npm run setup:stripe` to create automatically
- **Notes**: Required for subscription features to work

## Optional Variables

These variables enable additional features but are not required for basic functionality.

### Application URLs

#### `NEXT_PUBLIC_BASE_URL`

- **Type**: String (URL)
- **Required**: No (recommended for production)
- **Default**: `http://localhost:3000` (development)
- **Description**: Base URL of the application for redirects and webhooks
- **Example**:
  - Development: `http://localhost:3000`
  - Production: `https://app.dreamreal.ai`
- **Format**: Must start with `http://` or `https://`
- **Notes**:
  - Public variable, exposed to client
  - Strongly recommended in production for Stripe webhooks and OAuth
  - Used for URL generation in webhooks and redirects

#### `NEXT_PUBLIC_APP_URL`

- **Type**: String (URL)
- **Required**: No
- **Default**: None
- **Description**: Alternative app URL (if different from BASE_URL)
- **Example**: `https://app.dreamreal.ai`
- **Format**: Must start with `http://` or `https://`
- **Notes**: Used as fallback if BASE_URL is not set

### Supabase Management

#### `SUPABASE_ACCESS_TOKEN`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Supabase Management API access token for programmatic management
- **Get from**: [Supabase Account](https://app.supabase.com/account/tokens) > Account > Access Tokens
- **Notes**: Optional, only needed for automated Supabase management tasks

#### `SUPABASE_SERVICE_SECRET`

- **Type**: String (JWT)
- **Required**: No
- **Default**: None
- **Description**: Legacy alias for `SUPABASE_SERVICE_ROLE_KEY`
- **Notes**: If both are set, `SUPABASE_SERVICE_ROLE_KEY` takes precedence

### Stripe Client-Side

#### `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Stripe publishable key for client-side Stripe.js
- **Example**: `pk_test_...` (test) or `pk_live_...` (production)
- **Format**: Must start with `pk_`
- **Get from**: [Stripe Dashboard](https://dashboard.stripe.com/apikeys) > Developers > API keys
- **Notes**:
  - Public variable, safe to expose
  - Only needed if using Stripe.js on the client side
  - Use `pk_test_` for development, `pk_live_` for production

### Google Cloud & AI Services

#### `GOOGLE_SERVICE_ACCOUNT`

- **Type**: JSON String
- **Required**: No (required for video/image generation features)
- **Default**: None
- **Description**: Google Cloud service account JSON for Vertex AI, GCS, and Video Intelligence
- **Example**:
  ```json
  {
    "type": "service_account",
    "project_id": "your-project",
    "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
    "client_email": "...@your-project.iam.gserviceaccount.com"
  }
  ```
- **Format**: Complete JSON service account key as a single-line string
- **Get from**: [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts) > IAM & Admin > Service Accounts
- **Required Permissions**:
  - Vertex AI User
  - Storage Admin
  - Video Intelligence API User
- **Features Enabled**:
  - Video generation (Veo)
  - Image generation (Imagen)
  - Video analysis (Cloud Vision Video Intelligence)
  - Google Cloud Storage
- **Notes**:
  - **CRITICAL**: NEVER expose to client or commit to version control
  - Required for all Google AI features
  - Entire JSON must be on a single line

#### `AISTUDIO_API_KEY`

- **Type**: String
- **Required**: No (recommended for Gemini chat)
- **Default**: None
- **Description**: Google AI Studio API key for Gemini chat
- **Example**: `AIza...`
- **Get from**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Features Enabled**: Gemini chat/text generation
- **Notes**:
  - Preferred over `GEMINI_API_KEY`
  - Supports "latest" model aliases (e.g., `gemini-flash-latest`)
  - Cannot be used for Vertex AI features (Veo, Imagen)

#### `GEMINI_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Alternative Google Gemini API key
- **Example**: `AIza...`
- **Get from**: [Google AI Studio](https://aistudio.google.com/app/apikey)
- **Features Enabled**: Gemini chat/text generation
- **Notes**:
  - Alternative to `AISTUDIO_API_KEY`
  - If both are set, `AISTUDIO_API_KEY` takes precedence
  - Also used in legacy Netlify functions

#### `GCS_BUCKET_NAME`

- **Type**: String
- **Required**: No (auto-created if not specified)
- **Default**: `{project_id}-video-processing` (auto-generated)
- **Description**: Google Cloud Storage bucket name for video processing
- **Example**: `my-project-video-processing`
- **Format**: Lowercase, alphanumeric with hyphens, 3-63 characters
- **Notes**:
  - Auto-created if not specified (requires `GOOGLE_SERVICE_ACCOUNT`)
  - Must be globally unique
  - Used for storing uploaded videos and processing outputs

### Video Generation APIs

#### `FAL_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Fal.ai API key for video upscaling and audio generation
- **Get from**: [Fal.ai Dashboard](https://fal.ai/dashboard/keys)
- **Features Enabled**:
  - Video upscaling
  - Audio generation (alternative to ElevenLabs)
- **Notes**: Optional, enhances video quality features

### Audio Generation APIs

#### `ELEVENLABS_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: ElevenLabs API key for text-to-speech and sound effects
- **Get from**: [ElevenLabs Dashboard](https://elevenlabs.io/app/settings/api-keys)
- **Features Enabled**:
  - Text-to-speech (TTS)
  - Sound effects generation
  - Voice cloning
- **Notes**: Required for audio narration features

#### `COMET_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Comet API key for Suno music generation
- **Get from**: [Comet API](https://api.comet.com/)
- **Features Enabled**: AI music generation
- **Notes**: Required for background music features

#### `WAVESPEED_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Wavespeed API key for audio processing
- **Notes**: Currently unused, reserved for future features

### Logging & Monitoring

#### `AXIOM_TOKEN`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Axiom API token for centralized logging and monitoring
- **Example**: `xaat-...`
- **Get from**: [Axiom Dashboard](https://app.axiom.co/settings/tokens) > Settings > Tokens
- **Features Enabled**:
  - Centralized log aggregation
  - Real-time monitoring
  - Error tracking
- **Notes**:
  - Highly recommended for production
  - Must be paired with `AXIOM_DATASET`

#### `AXIOM_DATASET`

- **Type**: String
- **Required**: No (required if `AXIOM_TOKEN` is set)
- **Default**: None
- **Description**: Axiom dataset name where logs are stored
- **Example**: `genai-video-production`
- **Get from**: [Axiom Dashboard](https://app.axiom.co/) > Datasets (will be auto-created)
- **Notes**:
  - Must be set if using Axiom logging
  - Will be auto-created if it doesn't exist

### Other AI/ML APIs

#### `OPENAI_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: OpenAI API key for GPT models and DALL-E
- **Example**: `sk-...`
- **Format**: Must start with `sk-`
- **Get from**: [OpenAI Platform](https://platform.openai.com/api-keys)
- **Notes**: Currently unused, reserved for future features

#### `ANTHROPIC_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Anthropic API key for Claude services
- **Example**: `sk-ant-...`
- **Format**: Must start with `sk-ant-`
- **Get from**: [Anthropic Console](https://console.anthropic.com/settings/keys)
- **Notes**: Currently unused, reserved for future features

### Email Services

#### `RESEND_API_KEY`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Resend API key for transactional emails
- **Example**: `re_...`
- **Format**: Must start with `re_`
- **Get from**: [Resend Dashboard](https://resend.com/api-keys)
- **Features Enabled**: Transactional email (signup, password reset)
- **Notes**: Currently unused, reserved for future email features

### Development & Testing

#### `VERCEL_TOKEN`

- **Type**: String
- **Required**: No
- **Default**: None
- **Description**: Vercel API token for deployment automation
- **Get from**: [Vercel Account](https://vercel.com/account/tokens) > Account > Tokens
- **Notes**: Used for automated deployments and environment variable management

#### `CI`

- **Type**: Boolean String
- **Required**: No (auto-set by CI systems)
- **Default**: None
- **Description**: CI environment indicator
- **Example**: `true`
- **Format**: `true`, `false`, `1`, or `0`
- **Notes**:
  - Automatically set by CI systems (GitHub Actions, etc.)
  - Affects test behavior (retries, workers, etc.)

#### `BASE_URL`

- **Type**: String (URL)
- **Required**: No
- **Default**: `http://localhost:3000`
- **Description**: Base URL for Playwright E2E tests
- **Example**: `http://localhost:3000`
- **Format**: Must start with `http://` or `https://`
- **Notes**: Used for end-to-end testing configuration

### Performance Tuning

#### `CACHE_MAX_SIZE`

- **Type**: Integer
- **Required**: No
- **Default**: `1000`
- **Description**: Maximum number of items to store in the in-memory cache
- **Example**: `1000`
- **Notes**: Affects memory usage and cache performance

### Legacy/Netlify Variables

These variables are used in the legacy `securestoryboard` Netlify functions and are not needed for the main Next.js application.

#### `FAL_KEY`

- **Type**: String
- **Required**: No (Netlify only)
- **Description**: Legacy name for `FAL_API_KEY` in Netlify functions
- **Notes**: Use `FAL_API_KEY` in the main app

#### `JWT_SECRET`

- **Type**: String
- **Required**: No (Netlify only)
- **Default**: `storyboard-secret-2024`
- **Description**: JWT signing secret for Netlify auth functions
- **Notes**: Only used in legacy Netlify functions

#### `AUTH_PASSWORD`

- **Type**: String
- **Required**: No (Netlify only)
- **Description**: Simple password auth for Netlify functions
- **Notes**: Only used in legacy Netlify functions

#### `PROMPT_WEBHOOK_URL`

- **Type**: String (URL)
- **Required**: No (Netlify only)
- **Description**: Webhook URL for prompt processing
- **Notes**: Auto-generated if not set in Netlify functions

#### `GOOGLE_APPLICATION_CREDENTIALS_JSON`

- **Type**: JSON String
- **Required**: No (Netlify only)
- **Description**: Legacy name for `GOOGLE_SERVICE_ACCOUNT` in Netlify functions
- **Notes**: Use `GOOGLE_SERVICE_ACCOUNT` in the main app

#### `ALLOWED_ORIGINS`

- **Type**: Comma-separated string
- **Required**: No (Netlify only)
- **Default**: None
- **Description**: CORS allowed origins for Netlify functions
- **Example**: `https://example.com,https://app.example.com`
- **Notes**: Only used in Netlify CORS configuration

#### Netlify Auto-Injected Variables

- `NETLIFY_SITE_ID`: Auto-injected by Netlify
- `DEPLOY_ID`: Auto-injected by Netlify
- `CONTEXT`: Auto-injected by Netlify (production, deploy-preview, etc.)
- `SITE_ID`: Auto-injected by Netlify
- `URL`: Auto-injected by Netlify (deployment URL)
- `AWS_REGION`: Auto-injected by Netlify

## Environment-Specific Configuration

### Development Environment

**Minimum Required Variables:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From: stripe listen --forward-to localhost:3000/api/stripe/webhook
STRIPE_PREMIUM_PRICE_ID=price_...  # Or run: npm run setup:stripe
```

**Recommended Additional Variables:**

```bash
# Google AI (for chat/video/image features)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
# OR
AISTUDIO_API_KEY=AIza...

# Audio generation
ELEVENLABS_API_KEY=...

# Logging
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=genai-video-production-dev
```

**Development Notes:**

- Set `NODE_ENV=development` (auto-set by `npm run dev`)
- Use Stripe test keys (`sk_test_`, `pk_test_`)
- Use Stripe CLI for local webhook testing
- Validation runs automatically on dev server start

### Production Environment

**Required Variables:**

```bash
# Node environment
NODE_ENV=production

# Application URLs
NEXT_PUBLIC_BASE_URL=https://your-domain.com

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (live mode)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...  # From production webhook endpoint
STRIPE_PREMIUM_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

**Highly Recommended:**

```bash
# Google AI services
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Logging & monitoring
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=genai-video-production
```

**Optional (feature-dependent):**

```bash
# Audio/video enhancement
ELEVENLABS_API_KEY=...
FAL_API_KEY=...
COMET_API_KEY=...
```

**Production Notes:**

- Use Stripe live keys (`sk_live_`, `pk_live_`)
- Configure production webhook endpoint in Stripe Dashboard
- Enable Axiom logging for monitoring
- Validate all required variables before deployment

### Testing Environment

**Required Variables:**

```bash
NODE_ENV=test

# Supabase (test instance)
NEXT_PUBLIC_SUPABASE_URL=https://test-instance.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe (test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_test_...
STRIPE_PREMIUM_PRICE_ID=price_test_...
```

**Testing Notes:**

- Use separate test Supabase instance
- Use Stripe test mode
- Set `CI=true` in CI/CD pipelines
- Configure `BASE_URL` for E2E tests

## Security Best Practices

### Secret Management

1. **Never commit secrets to version control**
   - Always use `.env.local` (gitignored)
   - Never use `.env` for sensitive data
   - Review changes before committing

2. **Use different keys per environment**
   - Development: test/sandbox keys
   - Production: live/production keys
   - Never share keys between environments

3. **Rotate secrets regularly**
   - Rotate API keys quarterly
   - Rotate after team member changes
   - Use API key rotation features when available

4. **Principle of least privilege**
   - Use service accounts with minimal required permissions
   - Avoid using personal API keys in production
   - Limit key access to specific IP ranges when possible

### Environment Variable Prefixes

Next.js handles environment variables with special prefixes:

- **`NEXT_PUBLIC_`**: Exposed to the browser (client-side)
  - Use for: URLs, public API keys, feature flags
  - Safe for: Supabase anon key, Stripe publishable key

- **No prefix**: Server-side only (never exposed)
  - Use for: Secret keys, service role keys
  - Required for: Stripe secret key, service account JSON

### Key Storage

**Development:**

- Store in `.env.local`
- Use password manager for team sharing
- Document in team wiki (without actual values)

**Production:**

- Store in deployment platform (Vercel, etc.)
- Use platform's secret management
- Enable encryption at rest
- Audit access logs regularly

### API Key Permissions

**Google Service Account:**

- Enable only required APIs
- Use role: `roles/aiplatform.user` (not `roles/owner`)
- Restrict to specific resources
- Enable audit logging

**Stripe:**

- Use restricted API keys when possible
- Limit webhook endpoints
- Enable webhook signature verification
- Monitor for suspicious activity

**Supabase:**

- Configure Row Level Security (RLS)
- Never expose service role key
- Use anon key with RLS policies
- Enable email verification

## Validation

### Automatic Validation

The application automatically validates environment variables in development mode:

```bash
npm run dev  # Validates on startup
```

### Manual Validation

Run validation anytime:

```bash
npm run validate:env
```

### Validation Script

For CI/CD or custom validation:

```bash
node scripts/validate-env.ts
```

### What Gets Validated

1. **Presence**: Required variables must be set
2. **Format**: Variables must match expected patterns
   - URLs must start with `http://` or `https://`
   - JWT tokens must start with `eyJ`
   - Stripe keys must have correct prefixes
   - Service account JSON must be valid JSON
3. **Common Issues**: Checks for typos and misconfigurations
4. **Environment-Specific**: Production requires additional variables

### Validation Output

**Success:**

```
✅ Environment variables validated successfully

Required Variables:
  ✅ NEXT_PUBLIC_SUPABASE_URL - Supabase project URL
  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY - Supabase anonymous/public key
  ✅ SUPABASE_SERVICE_ROLE_KEY - Supabase service role key
  ✅ STRIPE_SECRET_KEY - Stripe secret key for API access
```

**Errors:**

```
❌ Environment Variable Validation Failed:

1. Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL
   Description: Supabase project URL
   Example: https://xxxxxxxxxxxxx.supabase.co

2. Invalid format for STRIPE_SECRET_KEY
   STRIPE_SECRET_KEY must start with sk_ (secret key)
   Description: Stripe secret key for API access
   Example: sk_test_...
```

**Warnings:**

```
⚠️  Environment Variable Warnings:

1. No AI service configured. Set one of:
   - AISTUDIO_API_KEY (recommended for Gemini)
   - GEMINI_API_KEY (alternative for Gemini)
   - GOOGLE_SERVICE_ACCOUNT (for Vertex AI, Veo, Imagen)

2. NEXT_PUBLIC_BASE_URL is not set in production.
   This may cause issues with redirects and webhooks.
   Set it to your production domain (e.g., https://app.dreamreal.ai)
```

## Troubleshooting

### Common Issues

#### 1. "Missing environment variable" error

**Problem**: Required variable not set

**Solution**:

```bash
# Check if .env.local exists
ls -la .env.local

# Copy from example if missing
cp .env.local.example .env.local

# Edit and add the missing variable
vim .env.local
```

#### 2. Stripe webhook failing with 503 error

**Problem**: `STRIPE_WEBHOOK_SECRET` not configured

**Solution**:

For development:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the webhook signing secret (whsec_...) to .env.local
```

For production:

1. Go to [Stripe Dashboard > Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the webhook signing secret to your environment variables

#### 3. Google AI features not working

**Problem**: No AI service configured

**Solution**: Set at least one of:

```bash
# Option 1: AI Studio (easiest, for Gemini chat only)
AISTUDIO_API_KEY=AIza...

# Option 2: Service Account (required for Veo/Imagen)
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
```

To get service account JSON:

1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Select/create project
3. Create service account
4. Grant roles: Vertex AI User, Storage Admin
5. Create JSON key
6. Copy entire JSON as single line to environment variable

#### 4. Supabase authentication not working

**Problem**: Invalid or missing Supabase keys

**Solution**:

```bash
# Get keys from Supabase Dashboard
# https://app.supabase.com/project/YOUR_PROJECT/settings/api

# Set in .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Common mistakes**:

- Using `SUPABASE_URL` instead of `NEXT_PUBLIC_SUPABASE_URL`
- Using `SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Exposing service role key to client (never use `NEXT_PUBLIC_` prefix)

#### 5. Environment variables not updating

**Problem**: Changes not reflected after editing `.env.local`

**Solution**:

```bash
# Restart the development server
# Stop with Ctrl+C, then:
npm run dev

# For production (Vercel):
# 1. Update environment variables in Vercel dashboard
# 2. Redeploy the application
```

#### 6. "Invalid format" validation errors

**Problem**: Environment variable doesn't match expected format

**Solution**: Check the format requirements:

- Supabase URL: `https://*.supabase.co`
- Supabase keys: Must start with `eyJ` (JWT)
- Stripe secret key: Must start with `sk_`
- Stripe webhook secret: Must start with `whsec_`
- Stripe price ID: Must start with `price_`
- URLs: Must start with `http://` or `https://`

#### 7. Axiom logging not working

**Problem**: Logs not appearing in Axiom

**Solution**:

```bash
# Both variables must be set
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=genai-video-production

# Verify token and dataset
# 1. Check token at: https://app.axiom.co/settings/tokens
# 2. Create dataset at: https://app.axiom.co/
```

#### 8. CORS errors in development

**Problem**: CORS errors when accessing APIs

**Solution**:

```bash
# Ensure BASE_URL matches your dev server
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# For custom ports
NEXT_PUBLIC_BASE_URL=http://localhost:3001
```

### Debugging Tips

1. **Check variable is loaded**:

   ```typescript
   console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
   ```

2. **Verify environment**:

   ```bash
   npm run validate:env
   ```

3. **Check .env.local syntax**:
   - No spaces around `=`
   - No quotes unless value contains spaces
   - No trailing whitespace
   - Unix line endings (LF, not CRLF)

4. **Review logs**:

   ```bash
   # Development
   npm run dev

   # Production (Vercel)
   vercel logs
   ```

5. **Test in isolation**:
   ```bash
   # Create test script
   node -e "console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)"
   ```

### Getting Help

If you're still experiencing issues:

1. Check [SECURITY.md](/SECURITY.md) for setup guides
2. Review [docs/SUPABASE_SETUP.md](/docs/SUPABASE_SETUP.md)
3. See [SUBSCRIPTION_SETUP.md](/SUBSCRIPTION_SETUP.md) for Stripe
4. Check [docs/AXIOM_SETUP.md](/docs/AXIOM_SETUP.md) for logging

## Reference

### Complete Variable List

| Variable                             | Required | Type    | Default          | Used For             |
| ------------------------------------ | -------- | ------- | ---------------- | -------------------- |
| `NODE_ENV`                           | Auto     | Enum    | `development`    | Environment mode     |
| `NEXT_PUBLIC_BASE_URL`               | Prod     | URL     | None             | App URLs, webhooks   |
| `NEXT_PUBLIC_APP_URL`                | No       | URL     | None             | Alternative app URL  |
| `NEXT_PUBLIC_SUPABASE_URL`           | Yes      | URL     | None             | Supabase project     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Yes      | JWT     | None             | Client auth          |
| `SUPABASE_SERVICE_ROLE_KEY`          | Yes      | JWT     | None             | Admin operations     |
| `SUPABASE_ACCESS_TOKEN`              | No       | String  | None             | Management API       |
| `STRIPE_SECRET_KEY`                  | Yes      | String  | None             | Stripe API           |
| `STRIPE_WEBHOOK_SECRET`              | Prod     | String  | None             | Webhook verification |
| `STRIPE_PREMIUM_PRICE_ID`            | No       | String  | None             | Subscription pricing |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No       | String  | None             | Client Stripe.js     |
| `GOOGLE_SERVICE_ACCOUNT`             | No       | JSON    | None             | Google AI services   |
| `AISTUDIO_API_KEY`                   | No       | String  | None             | Gemini chat          |
| `GEMINI_API_KEY`                     | No       | String  | None             | Gemini chat (alt)    |
| `GCS_BUCKET_NAME`                    | No       | String  | Auto             | Video storage        |
| `FAL_API_KEY`                        | No       | String  | None             | Video upscaling      |
| `ELEVENLABS_API_KEY`                 | No       | String  | None             | Text-to-speech       |
| `COMET_API_KEY`                      | No       | String  | None             | Music generation     |
| `WAVESPEED_API_KEY`                  | No       | String  | None             | Audio processing     |
| `AXIOM_TOKEN`                        | No       | String  | None             | Log aggregation      |
| `AXIOM_DATASET`                      | No       | String  | None             | Log storage          |
| `OPENAI_API_KEY`                     | No       | String  | None             | OpenAI services      |
| `ANTHROPIC_API_KEY`                  | No       | String  | None             | Claude services      |
| `RESEND_API_KEY`                     | No       | String  | None             | Email service        |
| `VERCEL_TOKEN`                       | No       | String  | None             | Deployment           |
| `CI`                                 | Auto     | Boolean | None             | CI indicator         |
| `BASE_URL`                           | No       | URL     | `localhost:3000` | E2E testing          |
| `CACHE_MAX_SIZE`                     | No       | Integer | `1000`           | Cache size           |

### Environment Files

| File                  | Purpose                     | Committed                 |
| --------------------- | --------------------------- | ------------------------- |
| `.env.local`          | Local development secrets   | No (gitignored)           |
| `.env.local.example`  | Template with all variables | Yes                       |
| `.env.local.template` | Detailed template           | Yes                       |
| `.env`                | Default values (avoid)      | No (use platform instead) |
| `env.d.ts`            | TypeScript definitions      | Yes                       |

### Related Documentation

- [SECURITY.md](/SECURITY.md) - Security best practices and setup guides
- [docs/SUPABASE_SETUP.md](/docs/SUPABASE_SETUP.md) - Supabase configuration
- [SUBSCRIPTION_SETUP.md](/SUBSCRIPTION_SETUP.md) - Stripe setup
- [docs/AXIOM_SETUP.md](/docs/AXIOM_SETUP.md) - Logging setup
- [README.md](/README.md) - General project documentation
- [CLAUDE.md](/CLAUDE.md) - Development workflow

### Validation Scripts

- `scripts/validate-env.ts` - Environment validation
- `lib/validateEnv.ts` - Validation logic
- `npm run validate:env` - Run validation
- `npm run dev` - Auto-validates on start
