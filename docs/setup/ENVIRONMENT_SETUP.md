# Environment Setup

**Complete guide for configuring environment variables and deployment settings.**

Last Updated: 2025-10-25

---

## Table of Contents

1. [Required Environment Variables](#required-environment-variables)
2. [Local Development Setup](#local-development-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Service-Specific Configuration](#service-specific-configuration)
5. [Testing Environment](#testing-environment)

---

## Required Environment Variables

### Core Application

```bash
# Next.js
NODE_ENV=development # or production
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Authentication bypass (development only)
BYPASS_AUTH=false
```

### Supabase

```bash
# Public keys (safe to expose)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Server-only keys (NEVER expose to client)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_DB_URL=postgresql://...
```

### Stripe (Payments)

```bash
# Public key (safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Secret keys (server-only)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Price IDs
STRIPE_PRO_PRICE_ID=price_...
STRIPE_ENTERPRISE_PRICE_ID=price_...
```

### AI Services

```bash
# Fal.ai (Video generation)
FAL_KEY=your-fal-key

# Google Cloud (Imagen, Vertex AI)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
GOOGLE_CLOUD_PROJECT=your-project-id

# ElevenLabs (Audio generation)
ELEVENLABS_API_KEY=your-elevenlabs-key

# Comet/Suno (Music generation)
COMET_API_KEY=your-comet-key
```

### Monitoring & Analytics

```bash
# Axiom (Logging)
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=your-dataset

# PostHog (Analytics)
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry (Error tracking)
SENTRY_DSN=your-sentry-dsn
```

### Email (Resend)

```bash
RESEND_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

---

## Local Development Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/non-linear-editor.git
cd non-linear-editor
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

```bash
cp .env.example .env.local
```

### 4. Configure Environment Variables

Edit `.env.local` with your values:

```bash
# .env.local
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# For development, you can bypass auth
BYPASS_AUTH=true

# Add other keys as needed
```

### 5. Start Development Server

```bash
npm run dev
```

Access the app at http://localhost:3000

---

## Vercel Deployment

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Link Project

```bash
vercel link
```

### 3. Configure Environment Variables

**Option A: Via Vercel Dashboard**

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Add each variable
3. Select environment (Production/Preview/Development)

**Option B: Via CLI**

```bash
# Add production variable
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Add preview variable
vercel env add SUPABASE_SERVICE_ROLE_KEY preview

# Add development variable
vercel env add SUPABASE_SERVICE_ROLE_KEY development
```

### 4. Deploy

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Required Vercel Configuration

Add to `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_APP_URL": "https://your-domain.com"
  },
  "build": {
    "env": {
      "NODE_ENV": "production"
    }
  }
}
```

---

## Service-Specific Configuration

### Supabase Setup

1. **Create Project** at https://supabase.com
2. **Get API Keys** from Project Settings → API
3. **Configure RLS Policies:**

```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can only see their own projects"
ON projects FOR SELECT
USING (auth.uid() = user_id);
```

4. **Configure Storage Buckets:**

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('assets', 'assets', false);

-- Set up bucket policy
CREATE POLICY "Users can upload their own assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets' AND auth.uid() = owner);
```

### Stripe Setup

1. **Create Account** at https://stripe.com
2. **Get API Keys** from Developers → API keys
3. **Create Products & Prices:**

```bash
# Create Pro tier product
stripe products create \
  --name="Pro" \
  --description="Pro tier subscription"

# Create price
stripe prices create \
  --product=prod_xxx \
  --unit-amount=1900 \
  --currency=usd \
  --recurring interval=month
```

4. **Configure Webhook:**

```bash
# Create webhook endpoint
stripe webhook_endpoints create \
  --url=https://your-domain.com/api/webhooks/stripe \
  --enabled-events=customer.subscription.created \
  --enabled-events=customer.subscription.updated \
  --enabled-events=customer.subscription.deleted
```

### Google Cloud Setup

1. **Create Project** at https://console.cloud.google.com
2. **Enable APIs:**
   - Vertex AI API
   - Cloud Storage API
   - Cloud Vision API

3. **Create Service Account:**

```bash
gcloud iam service-accounts create non-linear-editor \
  --display-name="Non-Linear Editor"

# Download key
gcloud iam service-accounts keys create service-account.json \
  --iam-account=non-linear-editor@your-project.iam.gserviceaccount.com
```

4. **Set Environment Variable:**

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

---

## Testing Environment

### Test Environment Variables

```bash
# .env.test
NODE_ENV=test
BYPASS_AUTH=false

# Use test Supabase project
NEXT_PUBLIC_SUPABASE_URL=https://test-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=test-anon-key
SUPABASE_SERVICE_ROLE_KEY=test-service-key

# Mock API keys for testing
FAL_KEY=test-fal-key
STRIPE_SECRET_KEY=sk_test_...
```

### Running Tests

```bash
# Load test environment
export $(cat .env.test | xargs)

# Run tests
npm test
```

---

## Security Best Practices

### 1. Never Commit Secrets

```bash
# Add to .gitignore
.env
.env.local
.env.production
.env.test
service-account.json
```

### 2. Rotate Keys Regularly

```bash
# Rotate Supabase service role key
# 1. Generate new key in Supabase dashboard
# 2. Update environment variable
# 3. Revoke old key
```

### 3. Use Different Keys Per Environment

```bash
# Development
STRIPE_SECRET_KEY=sk_test_...

# Production
STRIPE_SECRET_KEY=sk_live_...
```

### 4. Scope API Keys

Grant minimal permissions:

- Supabase: Use anon key for client, service key for server
- Stripe: Use restricted keys when possible
- Google Cloud: Use service accounts with specific roles

---

## Troubleshooting

### Issue: "Missing environment variable"

**Solution:**

```bash
# Check if variable is set
echo $SUPABASE_SERVICE_ROLE_KEY

# If empty, add to .env.local and restart server
npm run dev
```

### Issue: "Invalid Supabase credentials"

**Solution:**

1. Verify keys in Supabase dashboard
2. Check for extra spaces in .env.local
3. Ensure using correct project URL

### Issue: "Stripe webhook signature verification failed"

**Solution:**

```bash
# Get webhook secret from Stripe dashboard
# Update STRIPE_WEBHOOK_SECRET in environment

# For local testing, use Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

---

## Additional Resources

- **[Vercel Configuration](/docs/setup/VERCEL_CONFIGURATION.md)** - Detailed Vercel setup
- **[Supabase Setup](/docs/SUPABASE_SETUP.md)** - Database configuration
- **[Stripe Setup](/docs/setup/STRIPE_SETUP.md)** - Payment integration
- **[Resend Setup](/docs/setup/RESEND_SETUP.md)** - Email configuration

---

**Last Updated:** 2025-10-25
**Consolidation:** Merged ENVIRONMENT_VARIABLES.md, ENV_VARIABLES_SUMMARY.md, VERCEL_CONFIGURATION.md, and VERCEL_ENV_SETUP.md
