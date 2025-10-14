import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET - Get user preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create default preferences if they don't exist
    if (!user.preferences) {
      const preferences = await prisma.userPreferences.create({
        data: { userId: user.id },
      })
      return NextResponse.json(preferences)
    }

    return NextResponse.json(user.preferences)
  } catch (error) {
    console.error('Failed to fetch preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Update user preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { preferences: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { emailNotifications, dailyReport, drawdownAlert, theme } = body

    // Upsert preferences (create or update)
    const preferences = await prisma.userPreferences.upsert({
      where: { userId: user.id },
      update: {
        ...(emailNotifications !== undefined && { emailNotifications }),
        ...(dailyReport !== undefined && { dailyReport }),
        ...(drawdownAlert !== undefined && { drawdownAlert }),
        ...(theme !== undefined && { theme }),
      },
      create: {
        userId: user.id,
        emailNotifications: emailNotifications ?? true,
        dailyReport: dailyReport ?? false,
        drawdownAlert: drawdownAlert ?? true,
        theme: theme ?? 'system',
      },
    })

    return NextResponse.json({
      message: 'Preferences updated successfully',
      preferences,
    })
  } catch (error) {
    console.error('Failed to update preferences:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
