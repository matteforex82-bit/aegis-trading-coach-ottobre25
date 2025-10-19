import { TradingSetup } from "@prisma/client"
import { ParsedTradingSetup } from "./yaml-parser"

/**
 * Action to take for a setup during import
 */
export type ImportAction = "INSERT" | "UPDATE" | "UPDATE_DATE_ONLY" | "SKIP"

/**
 * Result of matching a parsed setup against existing setups
 */
export interface SetupMatchResult {
  action: ImportAction
  reason: string
  existingSetup?: TradingSetup
  parsedSetup: ParsedTradingSetup
}

/**
 * Find if a parsed setup already exists in the database and determine action
 *
 * Matching logic (as per requirements):
 * - Compare: symbol + entryPrice + stopLoss
 * - If match found:
 *   - Same values → UPDATE_DATE_ONLY (only update analysisDate)
 *   - Different values → UPDATE (full update)
 * - If no match → INSERT (new setup)
 */
export function matchSetup(
  parsedSetup: ParsedTradingSetup,
  existingSetups: TradingSetup[]
): SetupMatchResult {
  // Find potential duplicate
  const duplicate = findDuplicate(parsedSetup, existingSetups)

  if (!duplicate) {
    return {
      action: "INSERT",
      reason: "New setup - no existing match found",
      parsedSetup,
    }
  }

  // Found duplicate - check if values are different
  const hasChanges = hasSignificantChanges(parsedSetup, duplicate)

  if (!hasChanges) {
    return {
      action: "UPDATE_DATE_ONLY",
      reason: "Duplicate found with same values - will only update analysis date",
      existingSetup: duplicate,
      parsedSetup,
    }
  }

  return {
    action: "UPDATE",
    reason: "Duplicate found with different values - will perform full update",
    existingSetup: duplicate,
    parsedSetup,
  }
}

/**
 * Find duplicate setup based on symbol + entryPrice + stopLoss
 */
function findDuplicate(
  parsedSetup: ParsedTradingSetup,
  existingSetups: TradingSetup[]
): TradingSetup | undefined {
  return existingSetups.find(
    (existing) =>
      existing.symbol === parsedSetup.symbol &&
      Math.abs(existing.entryPrice - parsedSetup.entryPrice) < 0.00001 && // Float comparison with epsilon
      Math.abs(existing.stopLoss - parsedSetup.stopLoss) < 0.00001
  )
}

/**
 * Check if parsed setup has significant changes compared to existing
 * (i.e., anything other than just analysisDate)
 */
function hasSignificantChanges(
  parsedSetup: ParsedTradingSetup,
  existingSetup: TradingSetup
): boolean {
  // Compare all fields except analysisDate, createdAt, updatedAt, id
  return (
    existingSetup.category !== parsedSetup.category ||
    existingSetup.direction !== parsedSetup.direction ||
    existingSetup.timeframe !== parsedSetup.timeframe ||
    existingSetup.wavePattern !== parsedSetup.wavePattern ||
    existingSetup.waveCount !== parsedSetup.waveCount ||
    !pricesEqual(existingSetup.takeProfit1, parsedSetup.takeProfit1) ||
    !pricesEqual(existingSetup.takeProfit2, parsedSetup.takeProfit2) ||
    !pricesEqual(existingSetup.takeProfit3, parsedSetup.takeProfit3) ||
    !pricesEqual(existingSetup.invalidation, parsedSetup.invalidation) ||
    !datesEqual(existingSetup.expiresAt, parsedSetup.expiresAt) ||
    existingSetup.notes !== parsedSetup.notes ||
    existingSetup.pdfUrl !== parsedSetup.pdfUrl ||
    existingSetup.isPremium !== parsedSetup.isPremium ||
    existingSetup.requiredPlan !== parsedSetup.requiredPlan ||
    existingSetup.isActive !== parsedSetup.isActive
  )
}

/**
 * Compare two prices with float epsilon tolerance
 */
function pricesEqual(a: number | null | undefined, b: number | null | undefined): boolean {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  if (a === null || a === undefined || b === null || b === undefined) return false
  return Math.abs(a - b) < 0.00001
}

/**
 * Compare two dates (ignoring time component)
 */
function datesEqual(a: Date | null | undefined, b: Date | null | undefined): boolean {
  if ((a === null || a === undefined) && (b === null || b === undefined)) return true
  if (a === null || a === undefined || b === null || b === undefined) return false

  const dateA = new Date(a)
  const dateB = new Date(b)

  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  )
}

/**
 * Batch match all parsed setups against existing setups
 */
export function matchSetups(
  parsedSetups: ParsedTradingSetup[],
  existingSetups: TradingSetup[]
): SetupMatchResult[] {
  return parsedSetups.map((parsed) => matchSetup(parsed, existingSetups))
}

/**
 * Get statistics from match results
 */
export interface MatchStatistics {
  total: number
  toInsert: number
  toUpdate: number
  toUpdateDateOnly: number
  byCategory: Record<string, number>
  byDirection: Record<string, number>
}

export function getMatchStatistics(results: SetupMatchResult[]): MatchStatistics {
  const stats: MatchStatistics = {
    total: results.length,
    toInsert: 0,
    toUpdate: 0,
    toUpdateDateOnly: 0,
    byCategory: {},
    byDirection: {},
  }

  results.forEach((result) => {
    // Count actions
    if (result.action === "INSERT") stats.toInsert++
    else if (result.action === "UPDATE") stats.toUpdate++
    else if (result.action === "UPDATE_DATE_ONLY") stats.toUpdateDateOnly++

    // Count by category
    const category = result.parsedSetup.category
    stats.byCategory[category] = (stats.byCategory[category] || 0) + 1

    // Count by direction
    const direction = result.parsedSetup.direction
    stats.byDirection[direction] = (stats.byDirection[direction] || 0) + 1
  })

  return stats
}
