import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { SubscriptionPlan } from '@prisma/client'

const PLAN_TO_PRICE_ID: Record<SubscriptionPlan, string> = {
  FREE: '',
  STARTER: process.env.STRIPE_PRICE_STARTER || '',
  PRO: process.env.STRIPE_PRICE_PRO || '',
  ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Change Plan API] Starting plan change flow...')
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      console.error('[Change Plan API] No session found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Change Plan API] User email:', session.user.email)

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        plan: true,
        subscriptionId: true,
        stripeCustomerId: true,
        subscription: {
          select: {
            stripeSubscriptionId: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { plan: newPlan } = body as { plan: SubscriptionPlan }

    console.log('[Change Plan API] Current plan:', user.plan)
    console.log('[Change Plan API] Requested plan:', newPlan)

    // Validate new plan
    if (!newPlan || !['STARTER', 'PRO', 'ENTERPRISE'].includes(newPlan)) {
      console.error('[Change Plan API] Invalid plan:', newPlan)
      return NextResponse.json(
        { error: 'Invalid plan selected', requestedPlan: newPlan },
        { status: 400 }
      )
    }

    // Check if user is trying to change to the same plan
    if (user.plan === newPlan) {
      return NextResponse.json(
        { error: 'You are already on this plan' },
        { status: 400 }
      )
    }

    // Handle downgrade to FREE
    if (newPlan === 'FREE') {
      if (!user.subscription?.stripeSubscriptionId) {
        return NextResponse.json(
          { error: 'No active subscription found' },
          { status: 400 }
        )
      }

      // Cancel the subscription at period end
      console.log('[Change Plan API] Downgrading to FREE - canceling subscription')
      await stripe.subscriptions.update(user.subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      })

      return NextResponse.json({
        success: true,
        message: 'Your subscription will be canceled at the end of the billing period',
      })
    }

    // Handle upgrade/downgrade between paid plans
    const newPriceId = PLAN_TO_PRICE_ID[newPlan]

    if (!newPriceId) {
      console.error('[Change Plan API] Price ID not configured for plan:', newPlan)
      return NextResponse.json(
        { error: 'Price ID not configured for this plan', plan: newPlan },
        { status: 500 }
      )
    }

    // If user doesn't have a subscription, create a new checkout session
    if (!user.subscription?.stripeSubscriptionId) {
      console.log('[Change Plan API] No existing subscription - redirecting to checkout')

      if (!user.stripeCustomerId) {
        return NextResponse.json(
          { error: 'No Stripe customer found. Please contact support.' },
          { status: 400 }
        )
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: user.stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: newPriceId,
            quantity: 1,
          },
        ],
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?upgrade=success`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?upgrade=cancelled`,
        metadata: {
          userId: user.id,
          plan: newPlan,
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            plan: newPlan,
          },
        },
        allow_promotion_codes: true,
      })

      return NextResponse.json({
        success: true,
        checkoutUrl: checkoutSession.url,
      })
    }

    // Update existing subscription
    console.log('[Change Plan API] Updating existing subscription')
    console.log('[Change Plan API] Subscription ID:', user.subscription.stripeSubscriptionId)
    console.log('[Change Plan API] New Price ID:', newPriceId)

    const subscription = await stripe.subscriptions.retrieve(
      user.subscription.stripeSubscriptionId
    )

    // Update the subscription with the new price
    const updatedSubscription = await stripe.subscriptions.update(
      user.subscription.stripeSubscriptionId,
      {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPriceId,
          },
        ],
        proration_behavior: 'create_prorations', // Create proration for the difference
        metadata: {
          userId: user.id,
          plan: newPlan,
        },
      }
    )

    console.log('[Change Plan API] Subscription updated:', updatedSubscription.id)
    console.log('[Change Plan API] New status:', updatedSubscription.status)

    // The webhook will handle the database update, but we'll do it here too for immediate feedback
    await db.user.update({
      where: { id: user.id },
      data: { plan: newPlan },
    })

    await db.subscription.update({
      where: { userId: user.id },
      data: { plan: newPlan },
    })

    console.log('[Change Plan API] Database updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Plan changed successfully',
      newPlan,
    })
  } catch (error: any) {
    console.error('[Change Plan API] Fatal error:', error)
    console.error('[Change Plan API] Error type:', error.type)
    console.error('[Change Plan API] Error message:', error.message)

    return NextResponse.json(
      {
        error: 'Failed to change plan',
        message: error.message || 'Unknown error',
        type: error.type || 'unknown',
      },
      { status: 500 }
    )
  }
}
