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
      status: 'ACTIVE',
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

  // Type assertion to access fields that exist but aren't in the type definition
  const sub = subscription as any

  // Extract dates with proper null checks
  const currentPeriodEnd = sub.current_period_end && typeof sub.current_period_end === 'number'
    ? new Date(sub.current_period_end * 1000)
    : null
  const currentPeriodStart = sub.current_period_start && typeof sub.current_period_start === 'number'
    ? new Date(sub.current_period_start * 1000)
    : null
  const canceledAt = sub.canceled_at && typeof sub.canceled_at === 'number'
    ? new Date(sub.canceled_at * 1000)
    : null

  // DEBUG: Log values
  console.log(`[Stripe Webhook] Raw period_end: ${sub.current_period_end}, Converted: ${currentPeriodEnd?.toISOString()}`)
  console.log(`[Stripe Webhook] Raw period_start: ${sub.current_period_start}, Converted: ${currentPeriodStart?.toISOString()}`)
  console.log(`[Stripe Webhook] Subscription ID: ${subscription.id}`)
  console.log(`[Stripe Webhook] Price ID: ${subscription.items.data[0]?.price.id}`)

  // Get plan from metadata or default to STARTER
  const subscriptionPlan: SubscriptionPlan = plan && ['STARTER', 'PRO', 'ENTERPRISE'].includes(plan)
    ? plan
    : 'STARTER'

  console.log(`[Stripe Webhook] Using plan: ${subscriptionPlan}`)

  try {
    // Update or create subscription record
    const subscriptionRecord = await db.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        plan: subscriptionPlan,
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
      update: {
        stripeSubscriptionId: subscription.id,
        stripePriceId: subscription.items.data[0]?.price.id,
        stripeCurrentPeriodEnd: currentPeriodEnd,
        plan: subscriptionPlan,
        status,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
        canceledAt: canceledAt,
      },
    })

    console.log(`[Stripe Webhook] Subscription record updated: ${subscriptionRecord.id}, stripeCurrentPeriodEnd: ${subscriptionRecord.stripeCurrentPeriodEnd?.toISOString()}`)

    // Update user record
    const userRecord = await db.user.update({
      where: { id: userId },
      data: {
        plan: subscriptionPlan,
        status,
        subscriptionId: subscription.id,
        currentPeriodStart: currentPeriodStart,
        currentPeriodEnd: currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      },
    })

    console.log(`[Stripe Webhook] User record updated: ${userRecord.id}, currentPeriodEnd: ${userRecord.currentPeriodEnd?.toISOString()}`)
  } catch (error) {
    console.error('[Stripe Webhook] Database update error:', error)
    throw error
  }
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
    console.log('[Stripe Webhook] Invoice has no subscription, skipping')
    return
  }

  console.log(`[Stripe Webhook] Processing paid invoice: ${invoice.id}`)

  // Find subscription to get userId
  const subscription = await db.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) {
    console.error(`[Stripe Webhook] Subscription not found for invoice: ${invoice.id}, subscriptionId: ${subscriptionId}`)
    return
  }

  console.log(`[Stripe Webhook] Found subscription: ${subscription.id} for user: ${subscription.userId}`)

  try {
    // Check if invoice already exists
    const existingInvoice = await db.invoice.findUnique({
      where: { stripeInvoiceId: invoice.id },
    })

    if (existingInvoice) {
      console.log(`[Stripe Webhook] Invoice ${invoice.id} already exists, skipping`)
      return
    }

    // Create invoice record
    const createdInvoice = await db.invoice.create({
      data: {
        subscriptionId: subscription.id,
        stripeInvoiceId: invoice.id,
        amount: inv.amount_paid, // Store in cents as received from Stripe
        currency: inv.currency.toUpperCase(),
        status: 'paid',
        paidAt: inv.status_transitions?.paid_at
          ? new Date(inv.status_transitions.paid_at * 1000)
          : new Date(),
      },
    })

    console.log(`[Stripe Webhook] Invoice created: ${createdInvoice.id}, amount: ${createdInvoice.amount} ${createdInvoice.currency}`)
  } catch (error) {
    console.error('[Stripe Webhook] Error creating invoice:', error)
    throw error
  }
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
