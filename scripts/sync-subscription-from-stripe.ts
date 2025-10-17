/**
 * Script to sync subscription data from Stripe API to database
 *
 * This script fetches subscription data directly from Stripe and updates
 * the local database to ensure currentPeriodEnd and other fields are correct.
 *
 * Usage:
 *   npx tsx scripts/sync-subscription-from-stripe.ts <userEmail>
 *
 * Example:
 *   npx tsx scripts/sync-subscription-from-stripe.ts 234@test.com
 */

import * as dotenv from 'dotenv'
import * as path from 'path'
import Stripe from 'stripe'
import { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-11-20.acacia',
})

const db = new PrismaClient()

const STATUS_MAPPING: Record<string, SubscriptionStatus> = {
  active: 'ACTIVE',
  trialing: 'TRIAL',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  unpaid: 'CANCELED',
  incomplete: 'TRIAL',
  incomplete_expired: 'EXPIRED',
  paused: 'CANCELED',
}

async function syncSubscription(userEmail: string) {
  console.log(`\n🔄 Syncing subscription for user: ${userEmail}\n`)

  // Find user in database
  const user = await db.user.findUnique({
    where: { email: userEmail },
    include: { subscription: true },
  })

  if (!user) {
    console.error(`❌ User not found: ${userEmail}`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.id}`)
  console.log(`   Current plan: ${user.plan}`)
  console.log(`   Current status: ${user.status}`)
  console.log(`   Stripe Customer ID: ${user.stripeCustomerId}`)
  console.log(`   Subscription ID: ${user.subscriptionId}`)
  console.log(`   Current Period End: ${user.currentPeriodEnd}`)

  if (!user.stripeCustomerId) {
    console.error(`❌ User has no Stripe customer ID`)
    process.exit(1)
  }

  // Fetch subscriptions from Stripe
  console.log(`\n📡 Fetching subscriptions from Stripe...`)

  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    limit: 10,
  })

  if (subscriptions.data.length === 0) {
    console.log(`⚠️  No subscriptions found in Stripe for this customer`)
    process.exit(0)
  }

  console.log(`✅ Found ${subscriptions.data.length} subscription(s) in Stripe\n`)

  // Find active subscription
  const activeSubscription = subscriptions.data.find(
    (sub) => sub.status === 'active' || sub.status === 'trialing'
  ) || subscriptions.data[0]

  console.log(`📋 Subscription Details:`)
  console.log(`   ID: ${activeSubscription.id}`)
  console.log(`   Status: ${activeSubscription.status}`)
  console.log(`   Plan: ${activeSubscription.metadata?.plan || 'N/A'}`)
  console.log(`   Price ID: ${activeSubscription.items.data[0]?.price.id}`)

  // Extract dates safely
  const sub = activeSubscription as any
  const currentPeriodEnd = sub.current_period_end
    ? new Date(sub.current_period_end * 1000)
    : null
  const currentPeriodStart = sub.current_period_start
    ? new Date(sub.current_period_start * 1000)
    : null
  const canceledAt = sub.canceled_at
    ? new Date(sub.canceled_at * 1000)
    : null

  console.log(`   Current Period Start: ${currentPeriodStart?.toISOString() || 'N/A'}`)
  console.log(`   Current Period End: ${currentPeriodEnd?.toISOString() || 'N/A'}`)
  console.log(`   Cancel at Period End: ${activeSubscription.cancel_at_period_end}`)
  console.log(`   Canceled At: ${canceledAt?.toISOString() || 'N/A'}`)

  // Determine plan from metadata or price
  const metadataPlan = activeSubscription.metadata?.plan as SubscriptionPlan
  const subscriptionPlan: SubscriptionPlan =
    metadataPlan && ['STARTER', 'PRO', 'ENTERPRISE'].includes(metadataPlan)
      ? metadataPlan
      : 'STARTER'

  // Map status
  const status = STATUS_MAPPING[activeSubscription.status] || 'ACTIVE'

  console.log(`\n💾 Updating database...`)

  try {
    // Update or create subscription record
    const subscriptionRecord = await db.subscription.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stripeSubscriptionId: activeSubscription.id,
        stripePriceId: activeSubscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        plan: subscriptionPlan,
        status,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
        canceledAt,
      },
      update: {
        stripeSubscriptionId: activeSubscription.id,
        stripePriceId: activeSubscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        plan: subscriptionPlan,
        status,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
        canceledAt,
      },
    })

    console.log(`✅ Subscription record updated: ${subscriptionRecord.id}`)

    // Update user record
    const updatedUser = await db.user.update({
      where: { id: user.id },
      data: {
        plan: subscriptionPlan,
        status,
        subscriptionId: activeSubscription.id,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: activeSubscription.cancel_at_period_end || false,
      },
    })

    console.log(`✅ User record updated: ${updatedUser.id}`)
    console.log(`\n📊 Updated Values:`)
    console.log(`   Plan: ${updatedUser.plan}`)
    console.log(`   Status: ${updatedUser.status}`)
    console.log(`   Current Period Start: ${updatedUser.currentPeriodStart?.toISOString() || 'N/A'}`)
    console.log(`   Current Period End: ${updatedUser.currentPeriodEnd?.toISOString() || 'N/A'}`)
    console.log(`   Cancel at Period End: ${updatedUser.cancelAtPeriodEnd}`)

    // Fetch and sync invoices
    console.log(`\n📄 Fetching invoices from Stripe...`)
    const invoices = await stripe.invoices.list({
      subscription: activeSubscription.id,
      limit: 10,
    })

    console.log(`✅ Found ${invoices.data.length} invoice(s)`)

    for (const invoice of invoices.data) {
      if (invoice.status === 'paid') {
        // Check if invoice already exists
        const existingInvoice = await db.invoice.findUnique({
          where: { stripeInvoiceId: invoice.id },
        })

        if (!existingInvoice) {
          const inv = invoice as any
          const createdInvoice = await db.invoice.create({
            data: {
              subscriptionId: subscriptionRecord.id,
              stripeInvoiceId: invoice.id,
              amount: inv.amount_paid || 0, // Store in cents
              currency: (inv.currency || 'usd').toUpperCase(),
              status: 'paid',
              paidAt: inv.status_transitions?.paid_at
                ? new Date(inv.status_transitions.paid_at * 1000)
                : new Date(invoice.created * 1000),
            },
          })
          console.log(`   ✅ Created invoice: ${createdInvoice.stripeInvoiceId} (${createdInvoice.amount} cents = $${(createdInvoice.amount / 100).toFixed(2)})`)
        } else {
          console.log(`   ⏭️  Invoice already exists: ${invoice.id}`)
        }
      }
    }

    console.log(`\n✅ Sync completed successfully!\n`)
  } catch (error) {
    console.error(`\n❌ Error updating database:`, error)
    throw error
  } finally {
    await db.$disconnect()
  }
}

// Main execution
const userEmail = process.argv[2]

if (!userEmail) {
  console.error(`\n❌ Usage: npx tsx scripts/sync-subscription-from-stripe.ts <userEmail>\n`)
  process.exit(1)
}

syncSubscription(userEmail)
  .then(() => {
    console.log(`✅ Script completed`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`❌ Script failed:`, error)
    process.exit(1)
  })
