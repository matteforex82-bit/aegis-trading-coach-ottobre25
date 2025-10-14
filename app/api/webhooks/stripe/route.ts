import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import Stripe from 'stripe'
import { SubscriptionPlan, SubscriptionStatus } from '@prisma/client'

const PLAN_MAPPING: Record<string, SubscriptionPlan> = {
  STARTER: 'STARTER',
  PRO: 'PRO',
  ENTERPRISE: 'ENTERPRISE',
}

const STATUS_MAPPING: Record<string, SubscriptionStatus> = {
  active: 'ACTIVE',
  trialing: 'TRIAL',
  past_due: 'PAST_DUE',
  canceled: 'CANCELED',
  unpaid: 'EXPIRED',
  incomplete: 'PAST_DUE',
  incomplete_expired: 'EXPIRED',
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = (await headers()).get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdate(subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaymentFailed(invoice)
        break
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Stripe Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId
  const plan = session.metadata?.plan as SubscriptionPlan

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in checkout session metadata')
    return
  }

  console.log(`[Stripe Webhook] Checkout completed for user ${userId}, plan: ${plan}`)

  // Update user with subscription info
  await db.user.update({
    where: { id: userId },
    data: {
      stripeCustomerId: session.customer as string,
      plan: plan || 'FREE',
      status: 'TRIAL',
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    },
  })
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId
  const plan = subscription.metadata?.plan as SubscriptionPlan

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata')
    return
  }

  const status = STATUS_MAPPING[subscription.status] || 'ACTIVE'

  console.log(`[Stripe Webhook] Subscription update for user ${userId}, status: ${subscription.status} -> ${status}`)

  // Type assertion for subscription fields
  const sub = subscription as any

  // Update or create subscription record
  await db.subscription.upsert({
    where: { userId },
    create: {
      userId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
      plan: plan || 'FREE',
      status,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: subscription.items.data[0]?.price.id,
      stripeCurrentPeriodEnd: new Date(sub.current_period_end * 1000),
      plan: plan || 'FREE',
      status,
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
      canceledAt: sub.canceled_at
        ? new Date(sub.canceled_at * 1000)
        : null,
    },
  })

  // Update user record
  await db.user.update({
    where: { id: userId },
    data: {
      plan: plan || 'FREE',
      status,
      subscriptionId: subscription.id,
      currentPeriodStart: new Date(sub.current_period_start * 1000),
      currentPeriodEnd: new Date(sub.current_period_end * 1000),
      cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    },
  })
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId

  if (!userId) {
    console.error('[Stripe Webhook] Missing userId in subscription metadata')
    return
  }

  console.log(`[Stripe Webhook] Subscription deleted for user ${userId}`)

  // Update subscription status
  await db.subscription.update({
    where: { userId },
    data: {
      status: 'CANCELED',
      canceledAt: new Date(),
    },
  })

  // Downgrade user to FREE plan
  await db.user.update({
    where: { id: userId },
    data: {
      plan: 'FREE',
      status: 'CANCELED',
      subscriptionId: null,
      currentPeriodEnd: null,
    },
  })
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subscriptionId = inv.subscription as string

  if (!subscriptionId) {
    return
  }

  // Find subscription to get userId
  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[Stripe Webhook] Subscription not found for invoice: ${invoice.id}`)
    return
  }

  console.log(`[Stripe Webhook] Invoice paid: ${invoice.id}`)

  // Create invoice record
  await db.invoice.create({
    data: {
      subscriptionId: subscription.id,
      stripeInvoiceId: invoice.id,
      amount: inv.amount_paid / 100, // Convert from cents to dollars
      currency: inv.currency.toUpperCase(),
      status: 'paid',
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000)
        : new Date(),
    },
  })
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const inv = invoice as any
  const subscriptionId = inv.subscription as string

  if (!subscriptionId) {
    return
  }

  // Find subscription to get userId
  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    return
  }

  console.log(`[Stripe Webhook] Invoice payment failed: ${invoice.id}`)

  // Update subscription status to PAST_DUE
  await db.subscription.update({
    where: { id: subscription.id },
    data: { status: 'PAST_DUE' },
  })

  await db.user.update({
    where: { id: subscription.userId },
    data: { status: 'PAST_DUE' },
  })

  // TODO: Send email notification to user about failed payment
}
