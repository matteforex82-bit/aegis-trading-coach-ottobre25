import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has active subscription
    const hasActiveSubscription =
      user.status === 'ACTIVE' ||
      user.status === 'TRIALING'

    // Check if subscription is valid (not expired for non-active statuses)
    const isSubscriptionValid = hasActiveSubscription &&
      user.currentPeriodEnd &&
      new Date(user.currentPeriodEnd) > new Date()

    return NextResponse.json({
      plan: user.plan,
      status: user.status,
      currentPeriodEnd: user.currentPeriodEnd,
      hasActiveSubscription,
      isSubscriptionValid,
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json(
      { error: 'Failed to check subscription status' },
      { status: 500 }
    )
  }
}
