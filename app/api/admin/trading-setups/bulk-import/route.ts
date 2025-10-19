import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { parseYamlFile } from "@/lib/yaml-parser"
import { matchSetups } from "@/lib/setup-matcher"

/**
 * POST /api/admin/trading-setups/bulk-import
 * Import validated trading setups from YAML
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

    // If there are parsing errors, reject import
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "YAML validation failed",
          parseErrors: parseResult.errors,
        },
        { status: 400 }
      )
    }

    // Get existing setups from database
    const existingSetups = await db.tradingSetup.findMany()

    // Match parsed setups against existing ones
    const matchResults = matchSetups(parseResult.setups, existingSetups)

    // Perform import in a transaction
    const result = await db.$transaction(async (tx) => {
      const inserted: string[] = []
      const updated: string[] = []
      const updatedDateOnly: string[] = []

      for (const matchResult of matchResults) {
        const { action, parsedSetup, existingSetup } = matchResult

        if (action === "INSERT") {
          // Create new setup
          const created = await tx.tradingSetup.create({
            data: {
              category: parsedSetup.category,
              symbol: parsedSetup.symbol,
              direction: parsedSetup.direction,
              timeframe: parsedSetup.timeframe,
              wavePattern: parsedSetup.wavePattern,
              waveCount: parsedSetup.waveCount,
              entryPrice: parsedSetup.entryPrice,
              stopLoss: parsedSetup.stopLoss,
              takeProfit1: parsedSetup.takeProfit1,
              takeProfit2: parsedSetup.takeProfit2,
              takeProfit3: parsedSetup.takeProfit3,
              invalidation: parsedSetup.invalidation,
              analysisDate: parsedSetup.analysisDate,
              expiresAt: parsedSetup.expiresAt,
              notes: parsedSetup.notes,
              pdfUrl: parsedSetup.pdfUrl,
              isPremium: parsedSetup.isPremium,
              requiredPlan: parsedSetup.requiredPlan,
              isActive: parsedSetup.isActive,
            },
          })
          inserted.push(created.id)
        } else if (action === "UPDATE_DATE_ONLY") {
          // Only update analysisDate
          if (!existingSetup) continue

          const updated_setup = await tx.tradingSetup.update({
            where: { id: existingSetup.id },
            data: {
              analysisDate: parsedSetup.analysisDate,
            },
          })
          updatedDateOnly.push(updated_setup.id)
        } else if (action === "UPDATE") {
          // Full update
          if (!existingSetup) continue

          const updated_setup = await tx.tradingSetup.update({
            where: { id: existingSetup.id },
            data: {
              category: parsedSetup.category,
              symbol: parsedSetup.symbol,
              direction: parsedSetup.direction,
              timeframe: parsedSetup.timeframe,
              wavePattern: parsedSetup.wavePattern,
              waveCount: parsedSetup.waveCount,
              entryPrice: parsedSetup.entryPrice,
              stopLoss: parsedSetup.stopLoss,
              takeProfit1: parsedSetup.takeProfit1,
              takeProfit2: parsedSetup.takeProfit2,
              takeProfit3: parsedSetup.takeProfit3,
              invalidation: parsedSetup.invalidation,
              analysisDate: parsedSetup.analysisDate,
              expiresAt: parsedSetup.expiresAt,
              notes: parsedSetup.notes,
              pdfUrl: parsedSetup.pdfUrl,
              isPremium: parsedSetup.isPremium,
              requiredPlan: parsedSetup.requiredPlan,
              isActive: parsedSetup.isActive,
            },
          })
          updated.push(updated_setup.id)
        }
      }

      return { inserted, updated, updatedDateOnly }
    })

    return NextResponse.json(
      {
        success: true,
        message: "Trading setups imported successfully",
        result: {
          inserted: result.inserted.length,
          updated: result.updated.length,
          updatedDateOnly: result.updatedDateOnly.length,
          total:
            result.inserted.length +
            result.updated.length +
            result.updatedDateOnly.length,
          insertedIds: result.inserted,
          updatedIds: result.updated,
          updatedDateOnlyIds: result.updatedDateOnly,
        },
        metadata: parseResult.metadata,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error("Error importing trading setups:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error.message,
      },
      { status: 500 }
    )
  }
}
