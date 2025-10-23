#!/usr/bin/env tsx

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover' as const,
  typescript: true,
});

async function createPremiumProduct() {
  try {
    console.log('Creating DreamReal Premium product...');

    // Create product
    const product = await stripe.products.create({
      name: 'DreamReal Premium',
      description: 'Premium subscription with advanced video editing features',
      metadata: {
        tier: 'premium',
      },
    });

    console.log('✓ Created product:', product.id);

    // Create price ($49/month)
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 4900, // $49.00 in cents
      currency: 'usd',
      recurring: {
        interval: 'month',
      },
      metadata: {
        tier: 'premium',
      },
    });

    console.log('✓ Created price:', price.id);
    console.log('\n✓ Success! Add this to your environment variables:');
    console.log(`\nSTRIPE_PREMIUM_PRICE_ID=${price.id}\n`);

    return {
      productId: product.id,
      priceId: price.id,
    };
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    throw error;
  }
}

createPremiumProduct()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
