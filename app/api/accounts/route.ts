import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import crypto from "crypto"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await db.tradingAccount.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Get accounts error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      login,
      broker,
      server,
      accountType,
      propFirm,
      phase,
      startBalance,
      maxDailyLoss,
      maxDrawdown,
      profitTarget,
    } = body

    // Validate required fields
    if (!login || !broker || !accountType || !startBalance) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Check if account already exists
    const existingAccount = await db.tradingAccount.findFirst({
      where: {
        userId: session.user.id,
        login,
        broker,
        deletedAt: null,
      },
    })

    if (existingAccount) {
      return NextResponse.json(
        { error: "Account already exists" },
        { status: 409 }
      )
    }

    // Create trading account
    const account = await db.tradingAccount.create({
      data: {
        userId: session.user.id,
        login,
        broker,
        server: server || "",
        accountType,
        propFirm: propFirm || null,
        phase: phase || null,
        startBalance: parseFloat(startBalance),
        currentBalance: parseFloat(startBalance),
        equity: parseFloat(startBalance),
        profit: 0,
        drawdown: 0,
        maxDailyLoss: maxDailyLoss ? parseFloat(maxDailyLoss) : null,
        maxDrawdown: maxDrawdown ? parseFloat(maxDrawdown) : null,
        profitTarget: profitTarget ? parseFloat(profitTarget) : null,
        status: "ACTIVE",
      },
    })

    // Auto-generate API key for MT5 connection
    const keyValue = `sk_aegis_${crypto.randomBytes(32).toString("hex")}`

    const apiKey = await db.apiKey.create({
      data: {
        userId: session.user.id,
        name: `MT5-${account.login}`,
        key: keyValue,
        isActive: true,
      },
    })

    // Return account + API key (ONLY TIME we show full key)
    return NextResponse.json({
      success: true,
      account,
      apiKey: {
        id: apiKey.id,
        key: keyValue, // Full key shown only on creation
        name: apiKey.name,
        createdAt: apiKey.createdAt,
      },
      message: "Account created successfully. Save your API key - you won't see it again!",
    })
  } catch (error) {
    console.error("Create account error:", error)
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    )
  }
}
