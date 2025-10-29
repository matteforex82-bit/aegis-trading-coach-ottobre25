import yaml from "js-yaml"
import { AssetCategory, SetupDirection, SubscriptionPlan } from "@prisma/client"

/**
 * Interface for raw YAML setup data (before validation)
 */
interface RawYamlSetup {
  category?: string
  symbol?: string
  direction?: string
  timeframe?: string
  wavePattern?: string
  waveCount?: string
  entryPrice?: number | string
  stopLoss?: number | string
  takeProfit1?: number | string
  takeProfit2?: number | string
  takeProfit3?: number | string
  invalidation?: number | string
  targetArea?: number | string
  confidence?: number
  analysis?: string
  note?: string
  analysisDate?: string
  expiresAt?: string
  notes?: string
  pdfUrl?: string
  isPremium?: boolean
  requiredPlan?: string
  isActive?: boolean
}

/**
 * Validated and normalized trading setup
 */
export interface ParsedTradingSetup {
  category: AssetCategory
  symbol: string
  direction: SetupDirection
  timeframe: string
  wavePattern?: string | null
  waveCount?: string | null
  entryPrice?: number | null          // Optional for analysis-only setups
  stopLoss?: number | null             // Optional for analysis-only setups
  takeProfit1?: number | null
  takeProfit2?: number | null
  takeProfit3?: number | null
  invalidation?: number | null
  targetArea?: number | null           // Generic target (used in waiting_list)
  confidence?: number | null           // Confidence level 0-100
  analysis?: string | null             // Detailed Elliott Wave analysis
  analysisDate: Date
  expiresAt?: Date | null
  notes?: string | null
  pdfUrl?: string | null
  isPremium: boolean
  requiredPlan: SubscriptionPlan
  isActive: boolean
}

/**
 * Validation error with details
 */
export interface ValidationError {
  field: string
  message: string
  value?: any
}

/**
 * Result of parsing a single setup
 */
export interface SetupParseResult {
  success: boolean
  setup?: ParsedTradingSetup
  errors: ValidationError[]
  index: number
}

/**
 * Result of parsing entire YAML file
 */
export interface YamlParseResult {
  success: boolean
  setups: ParsedTradingSetup[]
  errors: Array<{
    index: number
    setupSymbol?: string
    errors: ValidationError[]
  }>
  metadata?: {
    version?: string
    author?: string
    importDate?: string
    source?: string
    pdfUrl?: string
  }
}

/**
 * Parse and validate YAML content
 */
export function parseYamlFile(yamlContent: string): YamlParseResult {
  try {
    // Parse YAML
    const data = yaml.load(yamlContent) as any

    if (!data || typeof data !== "object") {
      return {
        success: false,
        setups: [],
        errors: [
          {
            index: -1,
            errors: [
              {
                field: "root",
                message: "Invalid YAML structure. Expected an object with 'setups' array.",
              },
            ],
          },
        ],
      }
    }

    // Extract metadata (optional)
    const metadata = data.metadata || data.analysis_metadata || {}

    // Extract setups array - support 'setups', 'assets', and 'waiting_list' formats
    // Check for non-empty arrays first, then fall back to empty ones
    let rawSetups = null
    if (Array.isArray(data.setups) && data.setups.length > 0) {
      rawSetups = data.setups
    } else if (Array.isArray(data.assets) && data.assets.length > 0) {
      rawSetups = data.assets
    } else if (Array.isArray(data.waiting_list) && data.waiting_list.length > 0) {
      rawSetups = data.waiting_list
    } else {
      // Fall back to any existing array (even if empty)
      rawSetups = data.setups || data.assets || data.waiting_list
    }

    if (!Array.isArray(rawSetups)) {
      return {
        success: false,
        setups: [],
        errors: [
          {
            index: -1,
            errors: [
              {
                field: "setups",
                message: "'setups', 'assets', or 'waiting_list' must be an array of trading setups.",
              },
            ],
          },
        ],
        metadata,
      }
    }

    if (rawSetups.length === 0) {
      return {
        success: false,
        setups: [],
        errors: [
          {
            index: -1,
            errors: [
              {
                field: "setups",
                message: "No setups found in YAML file. 'setups' array is empty.",
              },
            ],
          },
        ],
        metadata,
      }
    }

    // Normalize assets format to setups format if needed
    const normalizedSetups = rawSetups.map((item: any) => {
      // If it's already in the flat format (has category, direction directly)
      if (item.category && item.direction) {
        return item
      }

      // If it's in the nested assets format (has trading_setup)
      if (item.trading_setup) {
        const entry = item.trading_setup.primary_entry || item.trading_setup.secondary_entry
        if (!entry) return item // Invalid, will fail validation

        // Determine direction from entry type
        const entryType = entry.type || ''
        const direction = entryType.toLowerCase().includes('buy') ? 'BUY' : 'SELL'

        // Map asset_type to category (supports both English and Italian)
        const assetType = item.asset_type || item.category || 'FOREX'
        let category = 'FOREX'
        if (assetType.toLowerCase().includes('index') || assetType.toLowerCase().includes('indic')) {
          category = 'INDICES'
        } else if (assetType.toLowerCase().includes('commod') || assetType.toLowerCase().includes('gold') || assetType.toLowerCase().includes('oil')) {
          category = 'COMMODITIES'
        } else if (assetType.toLowerCase().includes('metal') || assetType.toLowerCase().includes('xau') || assetType.toLowerCase().includes('silver')) {
          category = 'METALS'
        } else if (assetType.toLowerCase().includes('crypto') || assetType.toLowerCase().includes('btc') || assetType.toLowerCase().includes('bitcoin')) {
          category = 'CRYPTO'
        }

        return {
          category,
          symbol: item.symbol,
          direction,
          timeframe: item.trading_setup.timeframe || item.timeframe || 'Daily',
          wavePattern: item.wave_structure || item.trading_setup.wave_pattern,
          waveCount: item.trading_setup.wave_count,
          entryPrice: entry.price,
          stopLoss: item.trading_setup.stop_loss?.price,
          takeProfit1: item.trading_setup.take_profit_targets?.[0]?.price,
          takeProfit2: item.trading_setup.take_profit_targets?.[1]?.price,
          takeProfit3: item.trading_setup.take_profit_targets?.[2]?.price,
          invalidation: item.trading_setup.invalidation?.price,
          targetArea: item.targetArea,
          confidence: item.confidence,
          analysis: item.analysis,
          analysisDate: metadata.date || item.analysisDate || new Date().toISOString().split('T')[0],
          expiresAt: item.expiresAt,
          notes: item.notes || item.note || item.trading_setup.notes || entry.rationale,
          pdfUrl: metadata.pdfUrl || item.pdfUrl,
          isPremium: item.isPremium !== false,
          requiredPlan: item.requiredPlan,
          isActive: item.isActive !== false,
        }
      }

      return item
    })

    // Parse and validate each setup
    const results: SetupParseResult[] = normalizedSetups.map((rawSetup, index) =>
      parseAndValidateSetup(rawSetup, index)
    )

    // Separate successful and failed
    const validSetups = results.filter((r) => r.success).map((r) => r.setup!)
    const invalidSetups = results
      .filter((r) => !r.success)
      .map((r) => ({
        index: r.index,
        setupSymbol: (rawSetups[r.index] as any)?.symbol,
        errors: r.errors,
      }))

    return {
      success: invalidSetups.length === 0,
      setups: validSetups,
      errors: invalidSetups,
      metadata,
    }
  } catch (error: any) {
    return {
      success: false,
      setups: [],
      errors: [
        {
          index: -1,
          errors: [
            {
              field: "yaml",
              message: `YAML parsing error: ${error.message}`,
            },
          ],
        },
      ],
    }
  }
}

/**
 * Parse and validate a single trading setup
 */
function parseAndValidateSetup(
  raw: RawYamlSetup,
  index: number
): SetupParseResult {
  const errors: ValidationError[] = []

  // Validate required fields (always needed)
  if (!raw.category) {
    errors.push({ field: "category", message: "Required field missing" })
  }
  if (!raw.symbol) {
    errors.push({ field: "symbol", message: "Required field missing" })
  }
  if (!raw.direction) {
    errors.push({ field: "direction", message: "Required field missing" })
  }
  if (!raw.timeframe) {
    errors.push({ field: "timeframe", message: "Required field missing" })
  }
  if (!raw.analysisDate) {
    errors.push({ field: "analysisDate", message: "Required field missing" })
  }

  // Validate setup type: Must have EITHER (entryPrice + stopLoss) OR targetArea
  const hasExecutionPrices = (raw.entryPrice !== undefined && raw.entryPrice !== null) &&
                             (raw.stopLoss !== undefined && raw.stopLoss !== null)
  const hasTargetArea = raw.targetArea !== undefined && raw.targetArea !== null

  if (!hasExecutionPrices && !hasTargetArea) {
    errors.push({
      field: "prices",
      message: "Setup must have either (entryPrice + stopLoss) for executable trades OR targetArea for analysis-only setups"
    })
  }

  // Return early if required fields missing
  if (errors.length > 0) {
    return { success: false, errors, index }
  }

  // Validate and normalize category
  const categoryUpper = raw.category!.toUpperCase()
  if (!Object.values(AssetCategory).includes(categoryUpper as AssetCategory)) {
    errors.push({
      field: "category",
      message: `Invalid category. Must be one of: ${Object.values(AssetCategory).join(", ")}`,
      value: raw.category,
    })
  }

  // Validate and normalize direction
  const directionUpper = raw.direction!.toUpperCase()
  if (!Object.values(SetupDirection).includes(directionUpper as SetupDirection)) {
    errors.push({
      field: "direction",
      message: `Invalid direction. Must be one of: ${Object.values(SetupDirection).join(", ")}`,
      value: raw.direction,
    })
  }

  // Normalize symbol
  const symbol = raw.symbol!.trim().toUpperCase()

  // Validate and parse prices (only if present)
  let entryPrice: number | null = null
  if (raw.entryPrice !== undefined && raw.entryPrice !== null) {
    entryPrice = parsePrice(raw.entryPrice)
    if (entryPrice === null || entryPrice <= 0) {
      errors.push({
        field: "entryPrice",
        message: "Must be a positive number",
        value: raw.entryPrice,
      })
    }
  }

  let stopLoss: number | null = null
  if (raw.stopLoss !== undefined && raw.stopLoss !== null) {
    stopLoss = parsePrice(raw.stopLoss)
    if (stopLoss === null || stopLoss <= 0) {
      errors.push({
        field: "stopLoss",
        message: "Must be a positive number",
        value: raw.stopLoss,
      })
    }
  }

  const takeProfit1 = raw.takeProfit1 ? parsePrice(raw.takeProfit1) : null
  if (raw.takeProfit1 && (takeProfit1 === null || takeProfit1 <= 0)) {
    errors.push({
      field: "takeProfit1",
      message: "Must be a positive number",
      value: raw.takeProfit1,
    })
  }

  const takeProfit2 = raw.takeProfit2 ? parsePrice(raw.takeProfit2) : null
  if (raw.takeProfit2 && (takeProfit2 === null || takeProfit2 <= 0)) {
    errors.push({
      field: "takeProfit2",
      message: "Must be a positive number",
      value: raw.takeProfit2,
    })
  }

  const takeProfit3 = raw.takeProfit3 ? parsePrice(raw.takeProfit3) : null
  if (raw.takeProfit3 && (takeProfit3 === null || takeProfit3 <= 0)) {
    errors.push({
      field: "takeProfit3",
      message: "Must be a positive number",
      value: raw.takeProfit3,
    })
  }

  const invalidation = raw.invalidation ? parsePrice(raw.invalidation) : null
  if (raw.invalidation && (invalidation === null || invalidation <= 0)) {
    errors.push({
      field: "invalidation",
      message: "Must be a positive number",
      value: raw.invalidation,
    })
  }

  // Validate targetArea (for analysis-only setups)
  const targetArea = raw.targetArea ? parsePrice(raw.targetArea) : null
  if (raw.targetArea && (targetArea === null || targetArea <= 0)) {
    errors.push({
      field: "targetArea",
      message: "Must be a positive number",
      value: raw.targetArea,
    })
  }

  // Validate confidence (must be 0-100 if present)
  let confidence: number | null = null
  if (raw.confidence !== undefined && raw.confidence !== null) {
    const confidenceValue = raw.confidence
    confidence = typeof confidenceValue === 'number' ? confidenceValue : parseInt(String(confidenceValue))
    if (isNaN(confidence) || confidence < 0 || confidence > 100) {
      errors.push({
        field: "confidence",
        message: "Must be a number between 0 and 100",
        value: raw.confidence,
      })
    }
  }

  // Validate and parse dates
  const analysisDate = parseDate(raw.analysisDate!)
  if (!analysisDate) {
    errors.push({
      field: "analysisDate",
      message: "Invalid date format. Use YYYY-MM-DD",
      value: raw.analysisDate,
    })
  }

  // Validate analysisDate is not in the future
  if (analysisDate && analysisDate > new Date()) {
    errors.push({
      field: "analysisDate",
      message: "Analysis date cannot be in the future",
      value: raw.analysisDate,
    })
  }

  const expiresAt = raw.expiresAt ? parseDate(raw.expiresAt) : null
  if (raw.expiresAt && !expiresAt) {
    errors.push({
      field: "expiresAt",
      message: "Invalid date format. Use YYYY-MM-DD",
      value: raw.expiresAt,
    })
  }

  // Validate expiresAt > analysisDate
  if (expiresAt && analysisDate && expiresAt <= analysisDate) {
    errors.push({
      field: "expiresAt",
      message: "Expiration date must be after analysis date",
      value: raw.expiresAt,
    })
  }

  // Validate requiredPlan (if provided)
  let requiredPlan: SubscriptionPlan = SubscriptionPlan.PRO
  if (raw.requiredPlan) {
    const planUpper = raw.requiredPlan.toUpperCase()
    if (!Object.values(SubscriptionPlan).includes(planUpper as SubscriptionPlan)) {
      errors.push({
        field: "requiredPlan",
        message: `Invalid plan. Must be one of: ${Object.values(SubscriptionPlan).join(", ")}`,
        value: raw.requiredPlan,
      })
    } else {
      requiredPlan = planUpper as SubscriptionPlan
    }
  }

  // Return if any validation errors
  if (errors.length > 0) {
    return { success: false, errors, index }
  }

  // Construct validated setup
  const setup: ParsedTradingSetup = {
    category: categoryUpper as AssetCategory,
    symbol,
    direction: directionUpper as SetupDirection,
    timeframe: raw.timeframe!.trim(),
    wavePattern: raw.wavePattern?.trim() || null,
    waveCount: raw.waveCount?.trim() || null,
    entryPrice: entryPrice,
    stopLoss: stopLoss,
    takeProfit1,
    takeProfit2,
    takeProfit3,
    invalidation,
    targetArea,
    confidence,
    analysis: raw.analysis?.trim() || null,
    analysisDate: analysisDate!,
    expiresAt,
    notes: raw.notes?.trim() || raw.note?.trim() || null,
    pdfUrl: raw.pdfUrl?.trim() || null,
    isPremium: raw.isPremium !== false, // default true
    requiredPlan,
    isActive: raw.isActive !== false, // default true
  }

  return { success: true, setup, errors: [], index }
}

/**
 * Parse price from string or number
 */
function parsePrice(value: string | number): number | null {
  if (typeof value === "number") {
    return value
  }
  const parsed = parseFloat(value)
  return isNaN(parsed) ? null : parsed
}

/**
 * Parse date from string (YYYY-MM-DD format)
 */
function parseDate(value: string): Date | null {
  try {
    // Validate ISO format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null
    }

    const date = new Date(value + "T00:00:00.000Z")
    return isNaN(date.getTime()) ? null : date
  } catch {
    return null
  }
}
