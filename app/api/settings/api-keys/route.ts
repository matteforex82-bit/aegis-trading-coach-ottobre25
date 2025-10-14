import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

const prisma = new PrismaClient()

// GET - List all API keys for current user
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
        // Don't return the actual key hash for security
        key: false,
      },
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error('Failed to fetch API keys:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Generate new API key
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user already has 5+ active keys (rate limiting)
    const existingKeysCount = await prisma.apiKey.count({
      where: { userId: user.id, isActive: true },
    })

    if (existingKeysCount >= 5) {
      return NextResponse.json(
        { error: 'Maximum API keys limit reached (5)', hint: 'Please revoke an existing key first' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name } = body

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ error: 'API key name is required' }, { status: 400 })
    }

    // Generate new API key
    const rawKey = 'sk_aegis_' + randomBytes(32).toString('hex')
    const hashedKey = await bcrypt.hash(rawKey, 12)

    const apiKey = await prisma.apiKey.create({
      data: {
        key: hashedKey,
        userId: user.id,
        name: name.trim(),
        isActive: true,
      },
    })

    // Return the raw key ONLY this one time
    return NextResponse.json({
      id: apiKey.id,
      name: apiKey.name,
      key: rawKey, // ⚠️ Only shown once!
      createdAt: apiKey.createdAt,
      message: 'API key generated successfully. Save it now - it will not be shown again!',
    })
  } catch (error) {
    console.error('Failed to create API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const keyId = searchParams.get('id')

    if (!keyId) {
      return NextResponse.json({ error: 'API key ID is required' }, { status: 400 })
    }

    // Check ownership
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: keyId },
    })

    if (!apiKey) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    if (apiKey.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete by marking as inactive
    await prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    })

    return NextResponse.json({ message: 'API key revoked successfully' })
  } catch (error) {
    console.error('Failed to delete API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
