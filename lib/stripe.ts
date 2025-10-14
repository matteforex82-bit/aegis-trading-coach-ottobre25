import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
  typescript: true,
})

// Stripe Price IDs - Add these to your .env file after creating products in Stripe Dashboard
export const STRIPE_PLANS = {
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PRO: process.env.STRIPE_PRICE_PRO || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
} as const

// Plan pricing (for display purposes)
export const PLAN_PRICES = {
  FREE: 0,
  STARTER: 29,
  PRO: 99,
  ENTERPRISE: 299,
} as const
