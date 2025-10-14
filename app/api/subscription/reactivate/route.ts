import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { stripe } from '@/lib/stripe'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, subscriptionId: true, cancelAtPeriodEnd: true },
    })

    if (!user || !user.subscriptionId) {
      return NextResponse.json(
        { error: 'No subscription found' },
        { status: 404 }
      )
    }

    if (!user.cancelAtPeriodEnd) {
      return NextResponse.json(
        { error: 'Subscription is not scheduled for cancellation' },
        { status: 400 }
      )
    }

    // Reactivate subscription (remove cancel_at_period_end)
    await stripe.subscriptions.update(user.subscriptionId, {
      cancel_at_period_end: false,
    })

    // Update database
    await db.user.update({
      where: { id: user.id },
      data: { cancelAtPeriodEnd: false },
    })

    await db.subscription.update({
      where: { userId: user.id },
      data: { cancelAtPeriodEnd: false },
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription reactivated successfully',
    })
  } catch (error) {
    console.error('Reactivate subscription error:', error)
    return NextResponse.json(
      {
        error: 'Failed to reactivate subscription',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
