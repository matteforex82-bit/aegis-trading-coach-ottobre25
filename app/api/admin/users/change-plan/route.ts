import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { SubscriptionPlan } from '@prisma/client'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check admin authentication
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, newPlan } = body

    if (!userId || !newPlan) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, newPlan' },
        { status: 400 }
      )
    }

    // Validate plan
    const validPlans: SubscriptionPlan[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']
    if (!validPlans.includes(newPlan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Update user plan
    const user = await db.user.update({
      where: { id: userId },
      data: {
        plan: newPlan,
        // If upgrading from FREE, set to ACTIVE status
        ...(newPlan !== 'FREE' && { status: 'ACTIVE' }),
      },
    })

    // Update subscription record if exists
    const subscription = await db.subscription.findUnique({
      where: { userId },
    })

    if (subscription) {
      await db.subscription.update({
        where: { userId },
        data: { plan: newPlan },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Plan changed to ${newPlan}`,
      user: {
        id: user.id,
        plan: user.plan,
        status: user.status,
      },
    })
  } catch (error) {
    console.error('Change plan error:', error)
    return NextResponse.json(
      {
        error: 'Failed to change plan',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
