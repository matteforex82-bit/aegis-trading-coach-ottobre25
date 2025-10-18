import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { AssetCategory, SetupDirection, SubscriptionPlan } from "@prisma/client"

/**
 * POST /api/admin/trading-setups
 * Create a new trading setup (Admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const {
      category,
      symbol,
      direction,
      timeframe,
      wavePattern,
      waveCount,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      invalidation,
      analysisDate,
      expiresAt,
      notes,
      pdfUrl,
      isPremium = true,
      requiredPlan = "PRO",
    } = body

    // Validate required fields
    if (!category || !symbol || !direction || !timeframe || !entryPrice || !stopLoss || !analysisDate) {
      return NextResponse.json(
        { error: "Missing required fields: category, symbol, direction, timeframe, entryPrice, stopLoss, analysisDate" },
        { status: 400 }
      )
    }

    // Validate enums
    if (!Object.values(AssetCategory).includes(category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${Object.values(AssetCategory).join(", ")}` },
        { status: 400 }
      )
    }

    if (!Object.values(SetupDirection).includes(direction)) {
      return NextResponse.json(
        { error: `Invalid direction. Must be one of: ${Object.values(SetupDirection).join(", ")}` },
        { status: 400 }
      )
    }

    if (!Object.values(SubscriptionPlan).includes(requiredPlan)) {
      return NextResponse.json(
        { error: `Invalid requiredPlan. Must be one of: ${Object.values(SubscriptionPlan).join(", ")}` },
        { status: 400 }
      )
    }

    // Create trading setup
    const setup = await db.tradingSetup.create({
      data: {
        category: category as AssetCategory,
        symbol: symbol.trim().toUpperCase(),
        direction: direction as SetupDirection,
        timeframe: timeframe.trim(),
        wavePattern: wavePattern?.trim() || null,
        waveCount: waveCount?.trim() || null,
        entryPrice: parseFloat(entryPrice),
        stopLoss: parseFloat(stopLoss),
        takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : null,
        takeProfit2: takeProfit2 ? parseFloat(takeProfit2) : null,
        takeProfit3: takeProfit3 ? parseFloat(takeProfit3) : null,
        invalidation: invalidation ? parseFloat(invalidation) : null,
        analysisDate: new Date(analysisDate),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes?.trim() || null,
        pdfUrl: pdfUrl?.trim() || null,
        isPremium: Boolean(isPremium),
        requiredPlan: requiredPlan as SubscriptionPlan,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        message: "Trading setup created successfully",
        setup,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("Error creating trading setup:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/trading-setups
 * Get all trading setups (Admin only) - includes inactive setups
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is admin
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    })

    if (user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      )
    }

    // Get all setups (including inactive for admin)
    const setups = await db.tradingSetup.findMany({
      orderBy: [
        { isActive: "desc" },
        { publishedAt: "desc" },
      ],
    })

    return NextResponse.json({ setups }, { status: 200 })
  } catch (error: any) {
    console.error("Error fetching trading setups:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
