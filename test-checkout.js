// Test script to verify Stripe configuration
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function testStripeConfig() {
  console.log('Testing Stripe Configuration...\n');

  console.log('Environment Variables:');
  console.log('STRIPE_SECRET_KEY:', process.env.STRIPE_SECRET_KEY ? '✓ Set' : '✗ Not set');
  console.log('STRIPE_PRICE_STARTER:', process.env.STRIPE_PRICE_STARTER || '✗ Not set');
  console.log('STRIPE_PRICE_PRO:', process.env.STRIPE_PRICE_PRO || '✗ Not set');
  console.log('STRIPE_PRICE_ENTERPRISE:', process.env.STRIPE_PRICE_ENTERPRISE || '✗ Not set');
  console.log('NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL || '✗ Not set');
  console.log('');

  try {
    // Test 1: Verify Stripe API key
    console.log('Test 1: Verifying Stripe API key...');
    const account = await stripe.customers.list({ limit: 1 });
    console.log('✓ Stripe API key is valid\n');

    // Test 2: Verify Price IDs
    console.log('Test 2: Verifying Price IDs...');
    const prices = [
      { name: 'Starter', id: process.env.STRIPE_PRICE_STARTER },
      { name: 'Pro', id: process.env.STRIPE_PRICE_PRO },
      { name: 'Enterprise', id: process.env.STRIPE_PRICE_ENTERPRISE },
    ];

    for (const price of prices) {
      if (!price.id) {
        console.log(`✗ ${price.name}: Not configured`);
        continue;
      }
      try {
        const priceData = await stripe.prices.retrieve(price.id);
        console.log(`✓ ${price.name}: ${priceData.id} - ${priceData.unit_amount / 100} ${priceData.currency.toUpperCase()}/${priceData.recurring?.interval}`);
      } catch (err) {
        console.log(`✗ ${price.name}: Invalid - ${err.message}`);
      }
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
  }
}

// Load .env.local
require('dotenv').config({ path: '.env.local' });
testStripeConfig();
