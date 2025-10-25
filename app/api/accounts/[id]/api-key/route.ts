import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import crypto from "crypto"

// Generate new API key for account
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: accountId } = await params

    // Verify account ownership
    const account = await db.tradingAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Check if account already has an active API key
    const existingKey = await db.apiKey.findFirst({
      where: {
        userId: session.user.id,
        name: `MT5-${account.login}`,
        isActive: true,
      },
    })

    // If regenerating, deactivate old key
    if (existingKey) {
      await db.apiKey.update({
        where: { id: existingKey.id },
        data: { isActive: false },
      })
    }

    // Generate new API key
    const keyValue = `sk_aegis_${crypto.randomBytes(32).toString("hex")}`

    // Create API key record
    const apiKey = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: `MT5-${account.login}`,
        key: keyValue,
        isActive: true,
      },
    })

    // Return the key (this is the ONLY time we show the full key)
    return NextResponse.json({
      success: true,
      apiKey: {
        id: apiKey.id,
        key: keyValue, // Full key shown only once
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        accountLogin: account.login,
        broker: account.broker,
      },
      isRegenerated: !!existingKey,
    })
  } catch (error) {
    console.error("API key generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    )
  }
}

// Get API key info (without showing full key)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: accountId } = await params

    // Verify account ownership
    const account = await db.tradingAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Get active API key (without full key value)
    const apiKey = await db.apiKey.findFirst({
      where: {
        userId: session.user.id,
        name: `MT5-${account.login}`,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        isActive: true,
        // Don't include 'key' field for security
      },
    })

    if (!apiKey) {
      return NextResponse.json({ hasKey: false })
    }

    // Return masked key info
    return NextResponse.json({
      hasKey: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        createdAt: apiKey.createdAt,
        lastUsedAt: apiKey.lastUsedAt,
        preview: "sk_aegis_••••••••••••••••", // Masked preview
      },
    })
  } catch (error) {
    console.error("API key fetch error:", error)
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    )
  }
}

// Delete (deactivate) API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: accountId } = await params

    // Verify account ownership
    const account = await db.tradingAccount.findUnique({
      where: { id: accountId },
    })

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    // Deactivate API key
    await db.apiKey.updateMany({
      where: {
        userId: session.user.id,
        name: `MT5-${account.login}`,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("API key deletion error:", error)
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    )
  }
}
