# Security Guidelines

## Overview

This document provides comprehensive security guidelines for the Non-Linear Video Editor project, including proper handling of API keys, environment variables, and sensitive data.

## Environment Variables

### Critical Security Rules

1. **NEVER commit `.env.local` to version control** - This file contains your actual API keys and secrets
2. **NEVER hardcode API keys in source code** - Always use environment variables
3. **NEVER share API keys publicly** - Treat them like passwords
4. **Rotate keys immediately if exposed** - If a key is accidentally committed, revoke it and generate a new one

### Required Environment Variables

The following environment variables are required for the application to function properly:

#### Authentication & Database (Required)

```bash
# Supabase - Authentication and Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_ACCESS_TOKEN=your-supabase-access-token-here

# Email Service - Required for authentication emails
RESEND_API_KEY=re_YOUR_API_KEY_HERE
```

#### Payment Processing (Required for subscriptions)

```bash
# Stripe - Payment processing
STRIPE_SECRET_KEY=sk_test_... # Use sk_test_ for dev, sk_live_ for production
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # Use pk_test_ for dev, pk_live_ for production
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### AI & Media Generation (Optional but recommended)

```bash
# Google AI Services
AISTUDIO_API_KEY=your-google-ai-studio-key
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}

# Image Generation
FAL_API_KEY=your-fal-api-key
REPLICATE_API_KEY=your-replicate-api-key
SEGMIND_API_KEY=your-segmind-api-key
PIAPI_API_KEY=your-piapi-api-key

# Audio Generation
COMET_API_KEY=your-comet-api-key
COMETSUNO_API_KEY=your-cometsuno-api-key
ELEVENLABS_API_KEY=your-elevenlabs-api-key
WAVESPEED_API_KEY=your-wavespeed-api-key

# Video Processing
SHOTSTACK_API_KEY=your-shotstack-api-key

# LLM APIs
OPENAI_API_KEY=your-openai-api-key
PERPLEXITY_API_KEY=your-perplexity-api-key
```

#### Infrastructure (Optional)

```bash
# Google Cloud Storage
GCS_BUCKET_NAME=your-bucket-name

# Logging & Monitoring
AXIOM_TOKEN=your-axiom-token
AXIOM_DATASET=genai-video-production

# Deployment
VERCEL_TOKEN=your-vercel-token
```

## Setup Instructions

### 1. Initial Setup

```bash
# Clone the repository
git clone <repository-url>
cd non-linear-editor

# Copy the environment template
cp .env.local.template .env.local

# Edit .env.local and fill in your actual API keys
# Use your preferred text editor
nano .env.local  # or vim, code, etc.
```

### 2. Getting API Keys

#### Supabase Setup
1. Go to https://app.supabase.com
2. Create a new project or select existing
3. Go to Project Settings > API
4. Copy the Project URL and API Keys
5. For access token: Account Settings > Access Tokens

#### Resend Email Setup
1. Sign up at https://resend.com
2. Go to API Keys section
3. Create a new API key
4. Configure SMTP or use their API
5. See `RESEND_SETUP.md` for detailed instructions

#### Stripe Setup
1. Go to https://dashboard.stripe.com
2. Get your API keys from Developers > API keys
3. For testing, use the test mode keys (sk_test_... and pk_test_...)
4. For production, switch to live mode and use live keys
5. Set up webhooks and get the webhook secret

#### Google AI Services
1. **AI Studio**: Go to https://aistudio.google.com/app/apikey
2. **Service Account**:
   - Go to https://console.cloud.google.com/iam-admin/serviceaccounts
   - Create a service account with appropriate permissions
   - Generate and download JSON key
   - Copy the entire JSON content to GOOGLE_SERVICE_ACCOUNT variable

#### Other Services
- **Fal.ai**: https://fal.ai/dashboard
- **Replicate**: https://replicate.com/account/api-tokens
- **ElevenLabs**: https://elevenlabs.io/
- **OpenAI**: https://platform.openai.com/api-keys
- **Shotstack**: https://shotstack.io/
- **Axiom**: https://axiom.co/

### 3. Verify Setup

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

# Check that all required services are accessible
# The app should start without environment variable errors
```

### 4. Pre-Commit Security Check

Before committing any changes, run the security check script:

```bash
# Make the script executable (first time only)
chmod +x scripts/check-secrets.sh

# Run the security check
./scripts/check-secrets.sh
```

This script will scan for accidentally committed secrets and warn you before they're pushed.

## Git Configuration

### What's Ignored

The following files are automatically ignored by `.gitignore`:

```
.env
.env.local
.env.development.local
.env.test.local
.env.production.local
.env*.local
```

### What's Safe to Commit

These files contain only placeholders and examples:
- `.env.local.example` - Basic template
- `.env.local.template` - Complete template with documentation
- All `*.md` files (after sanitization)

## Security Best Practices

### 1. Environment-Specific Keys

Use different API keys for different environments:

- **Development**: Use test/sandbox keys
- **Staging**: Use separate staging keys if available
- **Production**: Use production keys with appropriate permissions

### 2. Key Rotation

Regularly rotate your API keys, especially:
- After team member changes
- Every 90 days for critical services
- Immediately if a key is suspected to be compromised

### 3. Permission Scoping

Use the principle of least privilege:
- Service accounts should have minimal required permissions
- Use read-only keys where possible
- Restrict IP addresses when supported

### 4. Monitoring

- Enable logging for all API key usage
- Set up alerts for unusual activity
- Review API usage regularly in provider dashboards

### 5. Secrets in CI/CD

For Vercel deployment:
1. Go to Project Settings > Environment Variables
2. Add all required variables
3. Set appropriate environment scopes (Production, Preview, Development)
4. NEVER add secrets in `vercel.json` or public files

## What to Do If Secrets Are Exposed

If you accidentally commit secrets to the repository:

1. **Immediate Action**
   ```bash
   # DO NOT just delete the file and commit
   # The secret is still in git history

   # Revoke the exposed key immediately in the service provider
   ```

2. **Clean Git History** (if not pushed)
   ```bash
   # Reset the last commit
   git reset HEAD~1

   # Or use interactive rebase for older commits
   git rebase -i HEAD~N  # where N is number of commits
   ```

3. **If Already Pushed**
   - Revoke and rotate ALL exposed keys immediately
   - Contact repository administrators
   - Consider using tools like `git-filter-repo` or `BFG Repo-Cleaner`
   - Force push cleaned history (coordinate with team)

4. **Generate New Keys**
   - Create new API keys in all affected services
   - Update `.env.local` with new keys
   - Update Vercel environment variables
   - Test thoroughly

## Compliance

### Data Protection

This application may handle:
- User authentication data (Supabase)
- Payment information (Stripe - PCI DSS compliant)
- User-generated content (videos, images)
- API usage logs (Axiom)

### Regulatory Compliance

Ensure compliance with:
- **GDPR**: If serving EU users
- **CCPA**: If serving California users
- **PCI DSS**: Stripe handles this for payment data
- **SOC 2**: For enterprise customers

## Testing Credentials

For testing purposes, you can use these placeholder credentials:
- **Email**: test@example.com
- **Password**: test_password_123

**NEVER use real user credentials in documentation or code examples.**

## Support

If you have security concerns or questions:

1. Check this documentation first
2. Review individual service documentation (see links above)
3. Contact the development team
4. For security vulnerabilities, report privately to the security team

## Additional Resources

- [Supabase Security Guide](https://supabase.com/docs/guides/platform/going-into-prod)
- [Stripe Security](https://stripe.com/docs/security)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Google Cloud Security Best Practices](https://cloud.google.com/security/best-practices)

---

**Last Updated**: 2025-10-23

**Version**: 1.0.0
