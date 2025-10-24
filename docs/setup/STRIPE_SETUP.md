# Stripe Setup Guide for DreamReal Video Editor

## ✅ What's Already Done

- ✅ Stripe CLI installed (v1.31.1)
- ✅ Stripe SDK packages installed (`stripe`, `@stripe/stripe-js`)
- ✅ Stripe integration code complete
- ✅ API routes created (`/api/stripe/checkout`, `/api/stripe/webhook`, `/api/stripe/portal`)
- ✅ `STRIPE_SECRET_KEY` added to Vercel (Production, Preview, Development)
- ✅ `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` added to Vercel (Production, Preview, Development)
- ✅ `STRIPE_WEBHOOK_SECRET` added to Vercel (Production, Preview, Development)
- ✅ `STRIPE_PREMIUM_PRICE_ID` added to Vercel (Production, Preview, Development)
- ✅ Webhook endpoints created in Stripe Dashboard
- ✅ Product created: "DreamReal Premium" at $49/month

## 🚀 Quick Setup (3 Steps)

### Step 1: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate.

### Step 2: Add Webhook Secret to Vercel

**Option A: Use the helper script (easiest)**

```bash
bash /tmp/add_webhook_secret.sh
```

**Option B: Manual setup**

1. Go to https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Click "Reveal" on the "Signing secret"
4. Copy the secret (starts with `whsec_...`)
5. Run:

```bash
echo -n "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET production
echo -n "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET preview
echo -n "whsec_YOUR_SECRET" | vercel env add STRIPE_WEBHOOK_SECRET development
```

### Step 3: Create Product & Price (Optional but Recommended)

**Option A: Use the helper script**

```bash
bash /tmp/create_stripe_product.sh
```

**Option B: Create in Stripe Dashboard**

1. Go to https://dashboard.stripe.com/products
2. Click "Add product"
3. Name: "DreamReal Premium"
4. Price: $49.00 USD / month
5. Copy the Price ID (starts with `price_...`)
6. Add to Vercel:

```bash
echo -n "price_YOUR_PRICE_ID" | vercel env add STRIPE_PREMIUM_PRICE_ID production
```

## 🧪 Local Development Testing

### Test webhooks locally:

```bash
# Terminal 1: Start your dev server
npm run dev

# Terminal 2: Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

The `stripe listen` command will give you a temporary webhook secret. Add it to `.env.local`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_TEMPORARY_SECRET_FROM_CLI
```

### Trigger test events:

```bash
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## 📋 Webhook Events Configuration

Your webhook should listen to these events (already configured in your dashboard):

### Critical Events:

- ✅ `checkout.session.completed` - Payment succeeded
- ✅ `customer.subscription.created` - New subscription
- ✅ `customer.subscription.updated` - Subscription changed
- ✅ `customer.subscription.deleted` - Subscription canceled

### Recommended Events:

- `invoice.paid` - Successful recurring payment
- `invoice.payment_failed` - Failed payment (suspend access)
- `customer.created` - New customer
- `customer.updated` - Customer info changed

## 🔧 Useful Stripe CLI Commands

```bash
# List products
stripe products list

# List prices
stripe prices list

# List customers
stripe customers list

# View webhook events
stripe events list

# Test webhook endpoint
stripe events resend evt_xxx

# View logs in real-time
stripe logs tail
```

## 📊 Environment Variables Checklist

| Variable                             | Status                                  | Environments                     |
| ------------------------------------ | --------------------------------------- | -------------------------------- |
| `STRIPE_SECRET_KEY`                  | ✅ Set                                  | Production, Preview, Development |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ Set                                  | Production, Preview, Development |
| `STRIPE_WEBHOOK_SECRET`              | ✅ Set                                  | Production, Preview, Development |
| `STRIPE_PREMIUM_PRICE_ID`            | ✅ Set (price_1SLTjICDzJvN2nPVswgvCTkJ) | Production, Preview, Development |

## 🎯 Subscription Flow

1. User clicks "Upgrade" → `SubscriptionManager` component
2. POST `/api/stripe/checkout` → Creates checkout session
3. Redirect to Stripe Checkout → User enters payment info
4. Payment complete → Stripe sends webhook to `/api/stripe/webhook`
5. Webhook updates Supabase → User upgraded to `premium` tier
6. User can manage → "Manage Subscription" → Stripe Customer Portal

## 🔍 Verify Setup

After completing the setup, verify everything works:

1. **Check environment variables:**

```bash
vercel env ls | grep STRIPE
```

2. **Test checkout flow:**
   - Go to your app's settings page
   - Click "Upgrade to Premium"
   - Use test card: `4242 4242 4242 4242`
   - Any future date for expiry
   - Any 3 digits for CVC

3. **Check webhook logs:**
   - Go to https://dashboard.stripe.com/webhooks
   - Click on your endpoint
   - Check recent deliveries

4. **Verify database:**
   - Check `user_profiles` table
   - Verify `tier` is set to `premium`
   - Verify `subscription_status` is `active`

## 🐛 Troubleshooting

### Webhook signature verification fails

- Verify `STRIPE_WEBHOOK_SECRET` is set correctly in Vercel
- Check the secret matches your webhook endpoint
- Redeploy your application after adding the secret

### Checkout session not redirecting

- Verify `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct
- Check browser console for errors
- Ensure user is authenticated (logged in)

### Database not updating after payment

- Check webhook logs in Stripe Dashboard
- Check your application logs in Vercel
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set
- Check `user_profiles` table has all required columns

## 📚 Additional Resources

- [Stripe CLI Documentation](https://stripe.com/docs/cli)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Testing Stripe](https://stripe.com/docs/testing)
- [Stripe API Reference](https://stripe.com/docs/api)

## 🔐 Security Notes

- Never commit API keys to git
- Use test mode for development
- Verify webhook signatures (already implemented)
- Use HTTPS for webhook endpoints (Vercel provides this)
- Store secrets in environment variables (not in code)

---

**Need help?** Check the Stripe Dashboard logs or run `stripe logs tail` for real-time debugging.
