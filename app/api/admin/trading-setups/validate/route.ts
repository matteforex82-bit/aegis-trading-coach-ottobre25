import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseYamlFile } from "@/lib/yaml-parser"
import { matchSetups, getMatchStatistics } from "@/lib/setup-matcher"

/**
 * POST /api/admin/trading-setups/validate
 * Validate YAML file and return preview of what would be imported
 * (Admin only)
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
    const { yamlContent } = body

    if (!yamlContent || typeof yamlContent !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'yamlContent' field" },
        { status: 400 }
      )
    }

    // Parse YAML
    const parseResult = parseYamlFile(yamlContent)

    // If YAML parsing failed completely
    if (!parseResult.success && parseResult.setups.length === 0) {
      return NextResponse.json(
        {
          valid: false,
          stats: {
            total: 0,
            toInsert: 0,
            toUpdate: 0,
            toUpdateDateOnly: 0,
            errors: parseResult.errors.length,
          },
          items: [],
          parseErrors: parseResult.errors,
          metadata: parseResult.metadata,
        },
        { status: 200 }
      )
    }

    // Get existing setups from database
    const existingSetups = await db.tradingSetup.findMany()

    // Match parsed setups against existing ones
    const matchResults = matchSetups(parseResult.setups, existingSetups)

    // Get statistics
    const stats = getMatchStatistics(matchResults)

    // Build response items
    const items = matchResults.map((result, index) => ({
      index,
      setup: result.parsedSetup,
      action: result.action,
      reason: result.reason,
      existingSetup: result.existingSetup
        ? {
            id: result.existingSetup.id,
            symbol: result.existingSetup.symbol,
            category: result.existingSetup.category,
            direction: result.existingSetup.direction,
            entryPrice: result.existingSetup.entryPrice,
            stopLoss: result.existingSetup.stopLoss,
            analysisDate: result.existingSetup.analysisDate,
          }
        : null,
    }))

    // Add parsing errors if any
    const allErrors = parseResult.errors.map((err) => ({
      index: err.index,
      setupSymbol: err.setupSymbol,
      errors: err.errors,
      action: "ERROR" as const,
    }))

    return NextResponse.json(
      {
        valid: parseResult.success,
        stats: {
          total: parseResult.setups.length + parseResult.errors.length,
          toInsert: stats.toInsert,
          toUpdate: stats.toUpdate,
          toUpdateDateOnly: stats.toUpdateDateOnly,
          errors: parseResult.errors.length,
          byCategory: stats.byCategory,
          byDirection: stats.byDirection,
        },
        items,
        parseErrors: allErrors,
        metadata: parseResult.metadata,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error validating YAML:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
