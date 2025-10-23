#!/usr/bin/env tsx
// =============================================================================
// Setup Stripe Products and Prices
// =============================================================================
// This script creates the Premium subscription product and price in Stripe
// Run with: npx tsx scripts/setup-stripe.ts
// =============================================================================

import { createPremiumProduct } from '../lib/stripe';

async function main() {
  console.log('🚀 Setting up Stripe products...\n');

  try {
    const { productId, priceId } = await createPremiumProduct();

    console.log('✅ Premium subscription created successfully!\n');
    console.log('Product ID:', productId);
    console.log('Price ID:', priceId);
    console.log('\n📝 Add this to your .env.local file:');
    console.log(`STRIPE_PREMIUM_PRICE_ID=${priceId}`);
    console.log('\n⚠️  Important: Update your webhook settings in Stripe Dashboard');
    console.log('Webhook URL: https://your-domain.com/api/stripe/webhook');
    console.log('Events to listen for:');
    console.log('  - checkout.session.completed');
    console.log('  - customer.subscription.updated');
    console.log('  - customer.subscription.deleted');
  } catch (error) {
    console.error('❌ Error setting up Stripe:', error);
    process.exit(1);
  }
}

main();
