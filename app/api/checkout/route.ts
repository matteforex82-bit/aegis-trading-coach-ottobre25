import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'
import { SubscriptionPlan } from '@prisma/client'

const PLAN_TO_PRICE_ID: Record<string, string> = {
  starter: process.env.STRIPE_PRICE_STARTER || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
}

const PLAN_TO_ENUM: Record<string, SubscriptionPlan> = {
  starter: 'STARTER',
  pro: 'PRO',
  enterprise: 'ENTERPRISE',
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Checkout API] Starting checkout flow...')
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      console.error('[Checkout API] No session found')
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[Checkout API] User email:', session.user.email)

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        stripeCustomerId: true,
        plan: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { plan } = body
    console.log('[Checkout API] Plan requested:', plan)

    if (!plan || !PLAN_TO_PRICE_ID[plan]) {
      console.error('[Checkout API] Invalid plan:', plan)
      return NextResponse.json(
        { error: 'Invalid plan selected', requestedPlan: plan },
        { status: 400 }
      )
    }

    const priceId = PLAN_TO_PRICE_ID[plan]
    console.log('[Checkout API] Price ID:', priceId)

    if (!priceId) {
      console.error('[Checkout API] Price ID not configured for plan:', plan)
      return NextResponse.json(
        { error: 'Price ID not configured for this plan', plan },
        { status: 500 }
      )
    }

    // Create or retrieve Stripe customer
    let stripeCustomerId = user.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })

      stripeCustomerId = customer.id

      // Save Stripe customer ID to database
      await db.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
    }

    // Create Stripe Checkout Session
    console.log('[Checkout API] Creating Stripe checkout session...')
    console.log('[Checkout API] Customer ID:', stripeCustomerId)
    console.log('[Checkout API] App URL:', process.env.NEXT_PUBLIC_APP_URL)

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
      metadata: {
        userId: user.id,
        plan: PLAN_TO_ENUM[plan],
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          plan: PLAN_TO_ENUM[plan],
        },
        trial_period_days: 14, // 14-day free trial
      },
      allow_promotion_codes: true,
    })

    console.log('[Checkout API] Checkout session created:', checkoutSession.id)
    console.log('[Checkout API] Checkout URL:', checkoutSession.url)

    return NextResponse.json({
      sessionId: checkoutSession.id,
      url: checkoutSession.url,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
