# Resend Email Setup - READY TO USE!

Your application is now fully configured with Resend for reliable email delivery!

## ✅ What's Configured

- **SMTP Host:** smtp.resend.com
- **SMTP Port:** 465 (SSL)
- **Sender Email:** onboarding@resend.dev (Resend test email - no verification needed!)
- **Sender Name:** Nonlinear Video Editor
- **Email Rate Limit:** 100 emails/hour
- **Production URL:** https://nonlinear-editor-8as1xg8gf-dream-real-b2bc4dd2.vercel.app
- **Vercel Environment:** RESEND_API_KEY added to production & preview

## 🎉 Emails Are Working!

Since we're using Resend's test email (`onboarding@resend.dev`), **no domain verification is required**. You can start using email features immediately:

1. Sign up for an account
2. Receive confirmation email
3. Reset password via email

## Optional: Custom Domain Setup

If you want to use a custom domain (like `noreply@yourdomain.com`), follow these steps:

### Step 1: Log in to Resend

Go to https://resend.com/login and sign in with your account.

### Step 2: Add Your Domain

1. Navigate to **Domains** in the Resend dashboard
2. Click **Add Domain**
3. Enter: `dreamreal.ai`
4. Click **Add**

### Step 3: Add DNS Records

Resend will provide DNS records to add to your domain:

1. **DKIM Record** - for email authentication
2. **SPF Record** - for sender verification
3. **DMARC Record** - for email policy (optional but recommended)

Add these records to your DNS provider (wherever dreamreal.ai is hosted):

**Example DNS Records:**
```
TXT resend._domainkey.dreamreal.ai    [DKIM value from Resend]
TXT dreamreal.ai                       v=spf1 include:_spf.resend.com ~all
TXT _dmarc.dreamreal.ai                v=DMARC1; p=none; ...
```

### Step 4: Verify Domain

1. After adding DNS records, click **Verify** in Resend dashboard
2. DNS propagation can take up to 48 hours, but usually completes in a few minutes
3. Once verified, you'll see a green checkmark

## Current Setup (No Action Needed)

Your app is already configured to use Resend's test email (`onboarding@resend.dev`), which:
- ✅ Works immediately without verification
- ✅ Sends reliable emails via Resend
- ✅ Perfect for testing and development
- ⚠️ May go to spam folder (check there first!)

## Testing Email Delivery

Once your domain is verified:

1. Go to `/signup` on your app
2. Create a new account
3. Check your email for the confirmation link
4. Click the link to confirm your account
5. Sign in at `/signin`

## Troubleshooting

### Emails Not Sending

1. **Check Resend Dashboard** → Logs to see if emails are being sent
2. **Verify domain status** in Resend
3. **Check spam folder** in your email
4. **Verify DNS records** are correct

### Domain Not Verifying

1. Wait 5-10 minutes for DNS propagation
2. Use a DNS checker tool: https://dnschecker.org
3. Ensure DNS records exactly match what Resend provides
4. Contact Resend support if issues persist

## Current Configuration

### Local Development
Your `.env.local` contains:
```bash
RESEND_API_KEY=re_MiRoJWD9_24yz1Nw6nNyedABG6qQJYQZR
```

### Vercel Production
Environment variable added via Vercel CLI:
- `RESEND_API_KEY` → production & preview environments

### Supabase SMTP
Configured via Supabase Management API:
- Host: smtp.resend.com
- Port: 465
- User: resend
- Pass: [your Resend API key]
- From: Nonlinear Video Editor <onboarding@resend.dev>
- Site URL: https://nonlinear-editor-8as1xg8gf-dream-real-b2bc4dd2.vercel.app

## Email Types

Your app will send these emails:

1. **Signup Confirmation** - verify email address
2. **Password Reset** - reset forgotten password
3. **Email Change Confirmation** - verify new email
4. **Magic Link** - passwordless login (if enabled)

All emails are sent through Resend with your branding!

## Resend Free Tier

- 100 emails/day
- 1 domain verification
- Full API access
- Email logs and analytics

Upgrade to paid plan if you need more: https://resend.com/pricing

---

For more information: https://resend.com/docs
