import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { AssetCategory } from "@prisma/client"

/**
 * GET /api/trading-setups
 * Get active trading setups (requires PRO or ENTERPRISE subscription)
 * Supports filtering by category
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with subscription info AND role
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        plan: true,
        status: true,
        currentPeriodEnd: true,
        role: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // ADMIN has full access without subscription, others need PRO/ENTERPRISE
    const hasAccess =
      user.role === "ADMIN" || // ADMIN bypasses subscription check
      (
        (user.plan === "PRO" || user.plan === "ENTERPRISE") &&
        user.status === "ACTIVE" &&
        user.currentPeriodEnd &&
        new Date(user.currentPeriodEnd) > new Date()
      )

    if (!hasAccess) {
      return NextResponse.json(
        {
          error: "Premium subscription required",
          message: "Trading Room is available for PRO and ENTERPRISE plans only",
          requiredPlan: "PRO",
          currentPlan: user.plan,
        },
        { status: 403 }
      )
    }

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const categoryParam = searchParams.get("category")

    // Build query
    const where: any = {
      isActive: true,
    }

    // Filter by category if provided
    if (categoryParam) {
      if (!Object.values(AssetCategory).includes(categoryParam as AssetCategory)) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${Object.values(AssetCategory).join(", ")}` },
          { status: 400 }
        )
      }
      where.category = categoryParam as AssetCategory
    }

    // Get active setups
    const setups = await db.tradingSetup.findMany({
      where,
      orderBy: [
        { publishedAt: "desc" },
      ],
    })

    // Group by category for easier frontend rendering
    const groupedSetups = {
      FOREX: setups.filter((s) => s.category === "FOREX"),
      INDICES: setups.filter((s) => s.category === "INDICES"),
      COMMODITIES: setups.filter((s) => s.category === "COMMODITIES"),
      BITCOIN: setups.filter((s) => s.category === "BITCOIN"),
    }

    return NextResponse.json(
      {
        setups,
        groupedSetups,
        total: setups.length,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error fetching trading setups:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    )
  }
}
