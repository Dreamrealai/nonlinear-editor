# Resend Email Setup

Your application is now configured to use Resend for reliable email delivery!

## What's Configured

- **SMTP Host:** smtp.resend.com
- **SMTP Port:** 465 (SSL)
- **Sender Email:** noreply@dreamreal.ai
- **Sender Name:** Nonlinear Video Editor
- **Email Rate Limit:** 100 emails/hour

## Important: Verify Your Domain

Before emails can be sent, you need to verify your domain in Resend:

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

## Alternative: Use Resend Test Email

If you don't want to verify a domain right now, you can use Resend's test email for development:

1. In Supabase Dashboard: **Settings → Auth → SMTP Settings**
2. Change sender email to: `onboarding@resend.dev`
3. This bypasses domain verification but emails may go to spam

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

Your `.env.local` contains:
```bash
RESEND_API_KEY=re_MiRoJWD9_24yz1Nw6nNyedABG6qQJYQZR
```

Your Supabase SMTP is configured with:
- Host: smtp.resend.com
- Port: 465
- User: resend
- Pass: [your Resend API key]
- From: Nonlinear Video Editor <noreply@dreamreal.ai>

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
