/**
 * Symbol Mapper Utility
 *
 * Handles symbol mapping and validation between standard symbols and broker-specific symbols.
 * Supports automatic fuzzy matching and manual mappings.
 */

import { db as prisma } from '@/lib/db';

// ============================================================================
// TYPES
// ============================================================================

export interface SymbolSpec {
  symbol: string;
  description?: string;
  digits: number;
  point: number;
  contractSize: number;
  minLot: number;
  maxLot: number;
  lotStep: number;
  stopLevel: number;
  freezeLevel: number;
  tradeMode: string;
  spread?: number;
  leverage?: number;
  marginRequired?: number;
}

export interface SymbolMappingResult {
  found: boolean;
  brokerSymbol?: string;
  standardSymbol?: string;
  confidence: number; // 0.0 to 1.0
  source: 'exact' | 'mapping' | 'fuzzy' | 'not_found';
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  normalizedLotSize?: number;
}

// ============================================================================
// COMMON SYMBOL PATTERNS
// ============================================================================

const SYMBOL_VARIATIONS: Record<string, string[]> = {
  // Precious Metals
  'GOLD': ['XAUUSD', 'GOLD', 'GOLDm', '#GOLD'],
  'SILVER': ['XAGUSD', 'SILVER', 'SILVERm', '#SILVER'],
  'XAUUSD': ['XAUUSD', 'GOLD', 'GOLDm', '#GOLD'],
  'XAGUSD': ['XAGUSD', 'SILVER', 'SILVERm', '#SILVER'],

  // Oil
  'WTI': ['XTIUSD', 'USOIL', 'CL', 'WTI', '#USOIL'],
  'BRENT': ['XBRUSD', 'UKOIL', 'BRENT', '#UKOIL'],
  'USOIL': ['XTIUSD', 'USOIL', 'CL', 'WTI', '#USOIL'],
  'UKOIL': ['XBRUSD', 'UKOIL', 'BRENT', '#UKOIL'],

  // Major Indices
  'US30': ['US30', 'DJ30', 'DOWJONES', 'US30.cash', '#US30'],
  'NAS100': ['NAS100', 'USTEC', 'NASDAQ', 'NAS100.cash', '#NAS100'],
  'SPX500': ['SPX500', 'US500', 'SP500', 'SPX500.cash', '#SPX500'],
  'DAX': ['GER40', 'DAX', 'DE40', 'GER40.cash', '#DAX'],
  'FTSE': ['UK100', 'FTSE', 'FTSE100', 'UK100.cash', '#FTSE'],

  // Major Forex Pairs (usually standard but can have suffixes)
  'EURUSD': ['EURUSD', 'EURUSDm', 'EURUSD.', 'EURUSD..'],
  'GBPUSD': ['GBPUSD', 'GBPUSDm', 'GBPUSD.', 'GBPUSD..'],
  'USDJPY': ['USDJPY', 'USDJPYm', 'USDJPY.', 'USDJPY..'],
  'USDCHF': ['USDCHF', 'USDCHFm', 'USDCHF.', 'USDCHF..'],
  'AUDUSD': ['AUDUSD', 'AUDUSDm', 'AUDUSD.', 'AUDUSD..'],
  'USDCAD': ['USDCAD', 'USDCADm', 'USDCAD.', 'USDCAD..'],
  'NZDUSD': ['NZDUSD', 'NZDUSDm', 'NZDUSD.', 'NZDUSD..'],

  // Crypto
  'BTC': ['BTCUSD', 'XBTUSD', 'BTC', '#BTCUSD'],
  'ETH': ['ETHUSD', 'XETUSD', 'ETH', '#ETHUSD'],
};

// ============================================================================
// SYMBOL MAPPING FUNCTIONS
// ============================================================================

/**
 * Map a standard symbol to broker-specific symbol for a given account
 */
export async function mapSymbolToBroker(
  standardSymbol: string,
  accountId: string
): Promise<SymbolMappingResult> {
  const normalized = standardSymbol.toUpperCase().trim();

  // Step 1: Check for exact manual mapping
  const mapping = await prisma.symbolMapping.findUnique({
    where: {
      standardSymbol_accountId: {
        standardSymbol: normalized,
        accountId: accountId,
      },
    },
  });

  if (mapping) {
    return {
      found: true,
      brokerSymbol: mapping.brokerSymbol,
      standardSymbol: normalized,
      confidence: mapping.confidence,
      source: 'mapping',
    };
  }

  // Step 2: Check if the symbol exists as-is in broker specs (exact match)
  const exactSpec = await prisma.brokerSymbolSpec.findUnique({
    where: {
      accountId_symbol: {
        accountId: accountId,
        symbol: normalized,
      },
    },
  });

  if (exactSpec) {
    return {
      found: true,
      brokerSymbol: normalized,
      standardSymbol: normalized,
      confidence: 1.0,
      source: 'exact',
    };
  }

  // Step 3: Try fuzzy matching using known variations
  const variations = SYMBOL_VARIATIONS[normalized] || [];
  for (const variant of variations) {
    const spec = await prisma.brokerSymbolSpec.findUnique({
      where: {
        accountId_symbol: {
          accountId: accountId,
          symbol: variant,
        },
      },
    });

    if (spec) {
      // Auto-create mapping for future use
      await prisma.symbolMapping.upsert({
        where: {
          standardSymbol_accountId: {
            standardSymbol: normalized,
            accountId: accountId,
          },
        },
        create: {
          accountId: accountId,
          standardSymbol: normalized,
          brokerSymbol: variant,
          confidence: 0.8,
          source: 'auto',
        },
        update: {},
      });

      return {
        found: true,
        brokerSymbol: variant,
        standardSymbol: normalized,
        confidence: 0.8,
        source: 'fuzzy',
      };
    }
  }

  // Step 4: Try partial matching (contains)
  const allSpecs = await prisma.brokerSymbolSpec.findMany({
    where: { accountId: accountId },
    select: { symbol: true },
  });

  for (const spec of allSpecs) {
    const brokerSymbol = spec.symbol;
    const cleanBroker = brokerSymbol.replace(/[^A-Z0-9]/g, '');
    const cleanStandard = normalized.replace(/[^A-Z0-9]/g, '');

    if (cleanBroker.includes(cleanStandard) || cleanStandard.includes(cleanBroker)) {
      // Partial match found
      await prisma.symbolMapping.upsert({
        where: {
          standardSymbol_accountId: {
            standardSymbol: normalized,
            accountId: accountId,
          },
        },
        create: {
          accountId: accountId,
          standardSymbol: normalized,
          brokerSymbol: brokerSymbol,
          confidence: 0.5,
          source: 'auto',
        },
        update: {},
      });

      return {
        found: true,
        brokerSymbol: brokerSymbol,
        standardSymbol: normalized,
        confidence: 0.5,
        source: 'fuzzy',
      };
    }
  }

  // Not found
  return {
    found: false,
    confidence: 0,
    source: 'not_found',
  };
}

/**
 * Get broker symbol specifications for validation
 */
export async function getSymbolSpec(
  brokerSymbol: string,
  accountId: string
): Promise<SymbolSpec | null> {
  const spec = await prisma.brokerSymbolSpec.findUnique({
    where: {
      accountId_symbol: {
        accountId: accountId,
        symbol: brokerSymbol,
      },
    },
  });

  if (!spec) return null;

  return {
    symbol: spec.symbol,
    description: spec.description || undefined,
    digits: spec.digits,
    point: spec.point,
    contractSize: spec.contractSize,
    minLot: spec.minLot,
    maxLot: spec.maxLot,
    lotStep: spec.lotStep,
    stopLevel: spec.stopLevel,
    freezeLevel: spec.freezeLevel,
    tradeMode: spec.tradeMode,
    spread: spec.spread || undefined,
    leverage: spec.leverage || undefined,
    marginRequired: spec.marginRequired || undefined,
  };
}

/**
 * Validate if a symbol exists on broker
 */
export async function validateSymbolForAccount(
  symbol: string,
  accountId: string
): Promise<boolean> {
  const mapping = await mapSymbolToBroker(symbol, accountId);
  return mapping.found;
}

/**
 * Normalize lot size according to broker constraints
 */
export function normalizeLotSize(
  requestedLotSize: number,
  symbolSpec: SymbolSpec
): number {
  let normalized = requestedLotSize;

  // Clamp to min/max
  normalized = Math.max(symbolSpec.minLot, normalized);
  normalized = Math.min(symbolSpec.maxLot, normalized);

  // Round to nearest lotStep
  const steps = Math.round(normalized / symbolSpec.lotStep);
  normalized = steps * symbolSpec.lotStep;

  // Ensure minimum
  if (normalized < symbolSpec.minLot) {
    normalized = symbolSpec.minLot;
  }

  return normalized;
}

/**
 * Validate stop loss distance for LIMIT orders
 */
export function validateStopLevel(
  entryPrice: number | null,
  stopLoss: number,
  symbolSpec: SymbolSpec,
  direction: 'BUY' | 'SELL'
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // For MARKET orders (no entry price), stop level validation is done by broker
  if (!entryPrice) {
    return { valid: true, errors, warnings };
  }

  // Calculate distance in points
  const priceDifference = Math.abs(entryPrice - stopLoss);
  const distanceInPoints = Math.round(priceDifference / symbolSpec.point);

  // Check minimum stop level
  if (distanceInPoints < symbolSpec.stopLevel) {
    errors.push(
      `Stop loss too close to entry. Minimum distance: ${symbolSpec.stopLevel} points, current: ${distanceInPoints} points`
    );
  }

  // Validate direction
  if (direction === 'BUY' && stopLoss >= entryPrice) {
    errors.push('For BUY orders, stop loss must be below entry price');
  }
  if (direction === 'SELL' && stopLoss <= entryPrice) {
    errors.push('For SELL orders, stop loss must be above entry price');
  }

  // Warning if very close to minimum
  if (distanceInPoints < symbolSpec.stopLevel * 1.5) {
    warnings.push(
      `Stop loss is close to minimum distance (${distanceInPoints} points). Consider increasing for better execution.`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate order parameters against broker specifications
 */
export async function validateOrderForExecution(
  standardSymbol: string,
  accountId: string,
  lotSize: number,
  entryPrice: number | null,
  stopLoss: number,
  direction: 'BUY' | 'SELL'
): Promise<ValidationResult & { brokerSymbol?: string; normalizedLotSize?: number }> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Step 1: Map symbol
  const mapping = await mapSymbolToBroker(standardSymbol, accountId);
  if (!mapping.found || !mapping.brokerSymbol) {
    errors.push(`Symbol "${standardSymbol}" not found on broker. Please check symbol mapping.`);
    return { valid: false, errors, warnings };
  }

  const brokerSymbol = mapping.brokerSymbol;

  // Add confidence warning
  if (mapping.confidence < 0.8) {
    warnings.push(
      `Symbol mapping confidence is ${Math.round(mapping.confidence * 100)}%. Please verify in Operations > Broker Symbols.`
    );
  }

  // Step 2: Get specifications
  const spec = await getSymbolSpec(brokerSymbol, accountId);
  if (!spec) {
    errors.push(`Specifications not found for broker symbol "${brokerSymbol}"`);
    return { valid: false, errors, warnings, brokerSymbol };
  }

  // Step 3: Validate trade mode
  if (spec.tradeMode === 'DISABLED') {
    errors.push(`Trading is disabled for ${brokerSymbol}`);
  } else if (spec.tradeMode === 'CLOSE_ONLY') {
    errors.push(`Only closing trades allowed for ${brokerSymbol}`);
  }

  // Step 4: Validate lot size
  const normalizedLotSize = normalizeLotSize(lotSize, spec);
  if (normalizedLotSize !== lotSize) {
    warnings.push(
      `Lot size adjusted from ${lotSize} to ${normalizedLotSize} (min: ${spec.minLot}, max: ${spec.maxLot}, step: ${spec.lotStep})`
    );
  }

  // Step 5: Validate stop level (for LIMIT orders only)
  if (entryPrice) {
    const stopValidation = validateStopLevel(entryPrice, stopLoss, spec, direction);
    errors.push(...stopValidation.errors);
    warnings.push(...stopValidation.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    brokerSymbol,
    normalizedLotSize,
  };
}

/**
 * Find best matching symbol across all known variations
 */
export async function findBestSymbolMatch(
  standardSymbol: string,
  accountId: string
): Promise<SymbolMappingResult[]> {
  const normalized = standardSymbol.toUpperCase().trim();
  const results: SymbolMappingResult[] = [];

  // Get all broker symbols for this account
  const specs = await prisma.brokerSymbolSpec.findMany({
    where: { accountId: accountId },
    select: { symbol: true, description: true },
  });

  // Check known variations
  const variations = SYMBOL_VARIATIONS[normalized] || [];
  for (const variant of variations) {
    const found = specs.find((s) => s.symbol === variant);
    if (found) {
      results.push({
        found: true,
        brokerSymbol: found.symbol,
        standardSymbol: normalized,
        confidence: 0.9,
        source: 'fuzzy',
      });
    }
  }

  // Fuzzy match on remaining symbols
  for (const spec of specs) {
    const brokerSymbol = spec.symbol;
    const cleanBroker = brokerSymbol.replace(/[^A-Z0-9]/g, '');
    const cleanStandard = normalized.replace(/[^A-Z0-9]/g, '');

    // Calculate similarity
    let confidence = 0;
    if (cleanBroker === cleanStandard) {
      confidence = 1.0;
    } else if (cleanBroker.includes(cleanStandard)) {
      confidence = 0.7;
    } else if (cleanStandard.includes(cleanBroker)) {
      confidence = 0.6;
    } else {
      // Levenshtein-like simple comparison
      const maxLen = Math.max(cleanBroker.length, cleanStandard.length);
      let matches = 0;
      for (let i = 0; i < Math.min(cleanBroker.length, cleanStandard.length); i++) {
        if (cleanBroker[i] === cleanStandard[i]) matches++;
      }
      confidence = matches / maxLen;
    }

    if (confidence > 0.5 && !results.some((r) => r.brokerSymbol === brokerSymbol)) {
      results.push({
        found: true,
        brokerSymbol: brokerSymbol,
        standardSymbol: normalized,
        confidence,
        source: 'fuzzy',
      });
    }
  }

  // Sort by confidence
  results.sort((a, b) => b.confidence - a.confidence);

  return results;
}
