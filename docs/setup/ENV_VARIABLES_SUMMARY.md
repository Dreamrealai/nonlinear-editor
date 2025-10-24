# Environment Variables Summary

This document provides a quick reference summary of all environment variables documented for the DreamReal AI application.

## Files Created/Modified

1. **ENVIRONMENT_VARIABLES.md** (29KB) - Comprehensive documentation
2. **.env.example** (12KB) - Updated comprehensive example file
3. **ENV_VARIABLES_SUMMARY.md** (this file) - Quick reference

## Total Variables Documented: 35

### By Category

#### Required Variables (7)

1. `NODE_ENV` - Node environment mode
2. `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
3. `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
4. `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
5. `STRIPE_SECRET_KEY` - Stripe secret key
6. `STRIPE_WEBHOOK_SECRET` - Stripe webhook secret
7. `STRIPE_PREMIUM_PRICE_ID` - Stripe price ID

#### Application URLs (2)

8. `NEXT_PUBLIC_BASE_URL` - Base application URL
9. `NEXT_PUBLIC_APP_URL` - Alternative app URL

#### Supabase Management (2)

10. `SUPABASE_ACCESS_TOKEN` - Management API token
11. `SUPABASE_SERVICE_SECRET` - Legacy alias for service role key

#### Stripe Client (1)

12. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key

#### Google Cloud & AI Services (4)

13. `GOOGLE_SERVICE_ACCOUNT` - Google service account JSON
14. `AISTUDIO_API_KEY` - Google AI Studio key
15. `GEMINI_API_KEY` - Alternative Gemini key
16. `GCS_BUCKET_NAME` - Google Cloud Storage bucket

#### Video APIs (1)

17. `FAL_API_KEY` - Fal.ai API key

#### Audio APIs (3)

18. `ELEVENLABS_API_KEY` - ElevenLabs API key
19. `COMET_API_KEY` - Comet/Suno API key
20. `WAVESPEED_API_KEY` - Wavespeed API key

#### Logging & Monitoring (2)

21. `AXIOM_TOKEN` - Axiom API token
22. `AXIOM_DATASET` - Axiom dataset name

#### Other AI/ML APIs (2)

23. `OPENAI_API_KEY` - OpenAI API key
24. `ANTHROPIC_API_KEY` - Anthropic/Claude API key

#### Email Services (1)

25. `RESEND_API_KEY` - Resend email API key

#### Development & Deployment (3)

26. `VERCEL_TOKEN` - Vercel API token
27. `CI` - CI environment indicator
28. `BASE_URL` - E2E testing base URL

#### Performance (1)

29. `CACHE_MAX_SIZE` - In-memory cache size limit

#### Legacy/Netlify (6)

30. `FAL_KEY` - Legacy Fal.ai key (use FAL_API_KEY)
31. `GEMINI_KEY` - Legacy Gemini key (use AISTUDIO_API_KEY)
32. `JWT_SECRET` - Netlify JWT secret
33. `AUTH_PASSWORD` - Netlify auth password
34. `PROMPT_WEBHOOK_URL` - Netlify webhook URL
35. `GOOGLE_APPLICATION_CREDENTIALS_JSON` - Legacy Google creds (use GOOGLE_SERVICE_ACCOUNT)

### Additional Netlify Auto-Injected Variables (Not Counted)

- `ALLOWED_ORIGINS` - CORS origins
- `NETLIFY_SITE_ID` - Netlify site ID
- `DEPLOY_ID` - Netlify deploy ID
- `CONTEXT` - Netlify context
- `SITE_ID` - Netlify site ID
- `URL` - Netlify deployment URL
- `AWS_REGION` - AWS region

## Quick Setup Guide

### Minimum Required Setup (Development)

```bash
# 1. Copy example file
cp .env.example .env.local

# 2. Set required variables
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PREMIUM_PRICE_ID=price_...

# 3. Set at least one AI service
GOOGLE_SERVICE_ACCOUNT={"type":"service_account",...}
# OR
AISTUDIO_API_KEY=AIza...

# 4. Validate
npm run validate:env

# 5. Start
npm run dev
```

### Recommended Production Setup

Add to minimum required:

```bash
NEXT_PUBLIC_BASE_URL=https://your-domain.com
AXIOM_TOKEN=xaat-...
AXIOM_DATASET=genai-video-production
ELEVENLABS_API_KEY=...
COMET_API_KEY=...
FAL_API_KEY=...
```

## Environment Variable Prefixes

### `NEXT_PUBLIC_` (Client-Side)

Exposed to browser, safe for public keys:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BASE_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

### No Prefix (Server-Side Only)

Never exposed to client, for secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GOOGLE_SERVICE_ACCOUNT`
- All API keys

## Validation

The application includes comprehensive environment variable validation:

- **Automatic**: Runs on `npm run dev` startup
- **Manual**: Run `npm run validate:env`
- **Script**: `scripts/validate-env.ts`
- **Library**: `lib/validateEnv.ts`

### What Gets Validated

- Presence (required variables exist)
- Format (correct patterns/prefixes)
- Common mistakes (typos, wrong prefixes)
- Environment-specific requirements

## Documentation Structure

### ENVIRONMENT_VARIABLES.md (Main Documentation)

- Quick Start Guide
- Required Variables (detailed)
- Optional Variables (detailed)
- Environment-Specific Configuration
- Security Best Practices
- Validation Guide
- Troubleshooting
- Complete Reference Table

### .env.example (Template)

- All variables with examples
- Organized by category
- Setup checklist
- Helpful commands
- Documentation links

### env.d.ts (TypeScript Definitions)

- Type definitions for all variables
- IDE autocomplete support
- Type safety

### .env.local.example (Existing)

- Detailed template with instructions
- Comprehensive comments
- Setup guides

### .env.local.template (Existing)

- Alternative detailed template
- Extensive documentation

## Related Documentation

- `ENVIRONMENT_VARIABLES.md` - Main comprehensive documentation
- `SECURITY.md` - Security best practices
- `docs/SUPABASE_SETUP.md` - Supabase setup guide
- `SUBSCRIPTION_SETUP.md` - Stripe setup guide
- `docs/AXIOM_SETUP.md` - Axiom logging setup
- `README.md` - General project documentation
- `CLAUDE.md` - Development workflow

## Key Features

1. **Comprehensive Coverage**: All 35+ environment variables documented
2. **Clear Organization**: Grouped by category and purpose
3. **Security Guidance**: Best practices and security notes
4. **Environment-Specific**: Different configs for dev/prod/test
5. **Validation**: Automatic and manual validation tools
6. **Troubleshooting**: Common issues and solutions
7. **Quick Reference**: Summary tables and checklists
8. **Type Safety**: TypeScript definitions included

## Implementation Notes

### Search Methods Used

- Searched for `process.env.` usage across all TypeScript/JavaScript files
- Searched for `NEXT_PUBLIC_` prefix usage
- Examined validation logic in `lib/validateEnv.ts`
- Reviewed type definitions in `env.d.ts`
- Checked existing .env template files
- Identified legacy Netlify function variables

### Variables Not Documented

We intentionally excluded:

- Build-time Next.js variables (handled automatically)
- Vercel system variables (auto-injected)
- Temporary test variables (test-only)

### Legacy Variables

Documented but marked as legacy:

- Netlify function variables (securestoryboard)
- Alternative naming conventions
- Deprecated API keys

## Testing

To verify the documentation:

```bash
# 1. Validate current environment
npm run validate:env

# 2. Check documentation completeness
grep -E "^####\s+\`[A-Z_]+\`" ENVIRONMENT_VARIABLES.md | wc -l

# 3. Verify .env.example
cat .env.example | grep -E "^[A-Z_]+=" | wc -l

# 4. Test with minimal setup
cp .env.example .env.test
# Edit .env.test with required values
NODE_ENV=test npm run validate:env
```

## Summary

This documentation provides complete coverage of all environment variables used in the DreamReal AI non-linear video editor, including:

- **35 documented variables** across 10+ categories
- **7 required variables** for basic functionality
- **28 optional variables** for enhanced features
- **Comprehensive documentation** with examples and troubleshooting
- **Validation tools** for automatic checking
- **Security best practices** and setup guides

The documentation is production-ready and provides clear guidance for developers setting up the application in any environment.
