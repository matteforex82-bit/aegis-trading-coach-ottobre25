import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { AssetCategory, SetupDirection, SubscriptionPlan } from "@prisma/client"

/**
 * PATCH /api/admin/trading-setups/[id]
 * Update a trading setup (Admin only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if setup exists
    const existingSetup = await db.tradingSetup.findUnique({
      where: { id },
    })

    if (!existingSetup) {
      return NextResponse.json(
        { error: "Trading setup not found" },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const updateData: any = {}

    // Only update fields that are provided
    if (body.category !== undefined) {
      if (!Object.values(AssetCategory).includes(body.category)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${Object.values(AssetCategory).join(", ")}` },
          { status: 400 }
        )
      }
      updateData.category = body.category as AssetCategory
    }

    if (body.symbol !== undefined) updateData.symbol = body.symbol.trim().toUpperCase()

    if (body.direction !== undefined) {
      if (!Object.values(SetupDirection).includes(body.direction)) {
        return NextResponse.json(
          { error: `Invalid direction. Must be one of: ${Object.values(SetupDirection).join(", ")}` },
          { status: 400 }
        )
      }
      updateData.direction = body.direction as SetupDirection
    }

    if (body.timeframe !== undefined) updateData.timeframe = body.timeframe.trim()
    if (body.wavePattern !== undefined) updateData.wavePattern = body.wavePattern?.trim() || null
    if (body.waveCount !== undefined) updateData.waveCount = body.waveCount?.trim() || null
    if (body.entryPrice !== undefined) updateData.entryPrice = parseFloat(body.entryPrice)
    if (body.stopLoss !== undefined) updateData.stopLoss = parseFloat(body.stopLoss)
    if (body.takeProfit1 !== undefined) updateData.takeProfit1 = body.takeProfit1 ? parseFloat(body.takeProfit1) : null
    if (body.takeProfit2 !== undefined) updateData.takeProfit2 = body.takeProfit2 ? parseFloat(body.takeProfit2) : null
    if (body.takeProfit3 !== undefined) updateData.takeProfit3 = body.takeProfit3 ? parseFloat(body.takeProfit3) : null
    if (body.invalidation !== undefined) updateData.invalidation = body.invalidation ? parseFloat(body.invalidation) : null
    if (body.analysisDate !== undefined) updateData.analysisDate = new Date(body.analysisDate)
    if (body.expiresAt !== undefined) updateData.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    if (body.notes !== undefined) updateData.notes = body.notes?.trim() || null
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl?.trim() || null
    if (body.isPremium !== undefined) updateData.isPremium = Boolean(body.isPremium)

    if (body.requiredPlan !== undefined) {
      if (!Object.values(SubscriptionPlan).includes(body.requiredPlan)) {
        return NextResponse.json(
          { error: `Invalid requiredPlan. Must be one of: ${Object.values(SubscriptionPlan).join(", ")}` },
          { status: 400 }
        )
      }
      updateData.requiredPlan = body.requiredPlan as SubscriptionPlan
    }

    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    // Update setup
    const setup = await db.tradingSetup.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(
      {
        message: "Trading setup updated successfully",
        setup,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error updating trading setup:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/trading-setups/[id]
 * Delete a trading setup (Admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Check if setup exists
    const existingSetup = await db.tradingSetup.findUnique({
      where: { id },
    })

    if (!existingSetup) {
      return NextResponse.json(
        { error: "Trading setup not found" },
        { status: 404 }
      )
    }

    // Delete setup
    await db.tradingSetup.delete({
      where: { id },
    })

    return NextResponse.json(
      {
        message: "Trading setup deleted successfully",
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error deleting trading setup:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
