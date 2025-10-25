import { calculateLotSize } from './risk-calculator';

/**
 * YAML to TradeOrders Converter
 *
 * Converts Elliott Wave YAML analysis assets into executable TradeOrder records
 * with automatic position sizing based on Challenge Setup constraints.
 */

export interface YAMLAsset {
  symbol: string;
  asset_type?: string;
  scenario?: string;
  wave_structure?: string;
  confidence?: number;
  trading_setup: {
    primary_entry?: {
      type: string; // buy_limit, sell_limit
      price: number;
      rationale?: string;
    };
    secondary_entry?: {
      type: string;
      price: number;
      rationale?: string;
    };
    stop_loss: {
      price: number;
      rationale?: string;
    };
    take_profit_targets?: Array<{
      level: string;
      price: number;
      percentage?: number;
      rationale?: string;
    }>;
    invalidation?: {
      price: number;
      rule?: string;
      action?: string;
    };
  };
}

export interface ChallengeSetup {
  userRiskPerTradePercent: number;
  userRiskPerAssetPercent: number;
  maxOrdersPerAsset: number;
  accountSize: number;
  dailyBudgetDollars: number;
  overRollBudgetDollars: number;
  maxTradeRiskDollars: number;
  orderLockEnabled: boolean;
  autoCloseInvalidation: boolean;
}

export interface ConversionOptions {
  accountId: string;
  yamlAnalysisId: string;
  challengeSetup: ChallengeSetup;
  accountBalance: number;
  accountCurrency?: string;
  generateSecondaryEntry?: boolean; // Default: true
}

export interface TradeOrderData {
  accountId: string;
  symbol: string;
  type: string; // BUY or SELL
  lotSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  takeProfit2?: number;
  takeProfit3?: number;
  riskPercent: number;
  riskAmount: number;
  yamlAnalysisId: string;
  yamlAssetId: string;
  invalidationPrice?: number;
  invalidationRule?: string;
  isLocked: boolean;
  lockReason?: string;
  status: string;
  comment?: string;
}

export interface ConversionResult {
  success: boolean;
  orders: TradeOrderData[];
  errors: string[];
  warnings: string[];
  summary: {
    totalOrders: number;
    totalRiskAmount: number;
    totalRiskPercent: number;
    remainingDailyBudget: number;
  };
}

/**
 * Convert a single YAML asset to TradeOrder data objects
 */
export function convertYAMLAssetToTradeOrders(
  asset: YAMLAsset,
  options: ConversionOptions
): ConversionResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const orders: TradeOrderData[] = [];

  // Validate asset structure
  if (!asset.trading_setup) {
    errors.push(`${asset.symbol}: Missing trading_setup`);
    return { success: false, orders: [], errors, warnings, summary: getSummary([]) };
  }

  if (!asset.trading_setup.stop_loss) {
    errors.push(`${asset.symbol}: Missing stop_loss`);
    return { success: false, orders: [], errors, warnings, summary: getSummary([]) };
  }

  if (!asset.trading_setup.primary_entry && !asset.trading_setup.secondary_entry) {
    errors.push(`${asset.symbol}: Missing both primary_entry and secondary_entry`);
    return { success: false, orders: [], errors, warnings, summary: getSummary([]) };
  }

  // Check max orders per asset limit
  let ordersToGenerate = 0;
  if (asset.trading_setup.primary_entry) ordersToGenerate++;
  if (asset.trading_setup.secondary_entry && options.generateSecondaryEntry !== false) ordersToGenerate++;

  if (ordersToGenerate > options.challengeSetup.maxOrdersPerAsset) {
    errors.push(
      `${asset.symbol}: Would generate ${ordersToGenerate} orders but max allowed is ${options.challengeSetup.maxOrdersPerAsset}`
    );
    return { success: false, orders: [], errors, warnings, summary: getSummary([]) };
  }

  // Generate unique asset ID
  const yamlAssetId = `${asset.symbol}_${Date.now()}`;

  // Determine trade direction
  const tradeType = determineTradeType(asset.trading_setup.primary_entry?.type || asset.trading_setup.secondary_entry?.type);

  // Generate orders for primary entry
  if (asset.trading_setup.primary_entry) {
    const orderResult = generateOrderData(
      asset,
      asset.trading_setup.primary_entry.price,
      'PRIMARY',
      yamlAssetId,
      tradeType,
      options
    );

    if (orderResult.errors.length > 0) {
      errors.push(...orderResult.errors);
    } else {
      orders.push(orderResult.order!);
      warnings.push(...orderResult.warnings);
    }
  }

  // Generate orders for secondary entry (if enabled)
  if (asset.trading_setup.secondary_entry && options.generateSecondaryEntry !== false) {
    const orderResult = generateOrderData(
      asset,
      asset.trading_setup.secondary_entry.price,
      'SECONDARY',
      yamlAssetId,
      tradeType,
      options
    );

    if (orderResult.errors.length > 0) {
      errors.push(...orderResult.errors);
    } else {
      orders.push(orderResult.order!);
      warnings.push(...orderResult.warnings);
    }
  }

  // Calculate total risk
  const totalRiskAmount = orders.reduce((sum, order) => sum + order.riskAmount, 0);
  const totalRiskPercent = (totalRiskAmount / options.accountBalance) * 100;

  // Validate total risk doesn't exceed asset limit
  if (totalRiskPercent > options.challengeSetup.userRiskPerAssetPercent) {
    errors.push(
      `${asset.symbol}: Total risk ${totalRiskPercent.toFixed(2)}% exceeds max per asset ${options.challengeSetup.userRiskPerAssetPercent}%`
    );
    return { success: false, orders: [], errors, warnings, summary: getSummary([]) };
  }

  return {
    success: errors.length === 0,
    orders,
    errors,
    warnings,
    summary: getSummary(orders),
  };
}

function generateOrderData(
  asset: YAMLAsset,
  entryPrice: number,
  entryType: 'PRIMARY' | 'SECONDARY',
  yamlAssetId: string,
  tradeType: string,
  options: ConversionOptions
): { order: TradeOrderData | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  const stopLoss = asset.trading_setup.stop_loss.price;

  // Calculate position size
  const riskCalc = calculateLotSize({
    accountBalance: options.accountBalance,
    riskPercent: options.challengeSetup.userRiskPerTradePercent,
    entryPrice,
    stopLoss,
    symbol: asset.symbol,
    accountCurrency: options.accountCurrency || 'USD',
  });

  if (!riskCalc.isValid) {
    errors.push(`${asset.symbol} (${entryType}): ${riskCalc.errors.join(', ')}`);
    return { order: null, errors, warnings };
  }

  // Check risk doesn't exceed max trade risk
  if (riskCalc.riskAmount > options.challengeSetup.maxTradeRiskDollars) {
    errors.push(
      `${asset.symbol} (${entryType}): Risk amount $${riskCalc.riskAmount.toFixed(2)} exceeds max $${options.challengeSetup.maxTradeRiskDollars.toFixed(2)}`
    );
    return { order: null, errors, warnings };
  }

  // Warn if risk is >70% of max allowed
  if (riskCalc.riskAmount > options.challengeSetup.maxTradeRiskDollars * 0.7) {
    warnings.push(
      `${asset.symbol} (${entryType}): High risk - using ${((riskCalc.riskAmount / options.challengeSetup.maxTradeRiskDollars) * 100).toFixed(0)}% of max allowed`
    );
  }

  // Extract take profit levels
  const takeProfits = asset.trading_setup.take_profit_targets || [];
  const tp1 = takeProfits[0]?.price;
  const tp2 = takeProfits[1]?.price;
  const tp3 = takeProfits[2]?.price;

  // Build comment
  const comment = buildOrderComment(asset, entryType);

  const order: TradeOrderData = {
    accountId: options.accountId,
    symbol: asset.symbol,
    type: tradeType,
    lotSize: riskCalc.lotSize,
    entryPrice,
    stopLoss,
    takeProfit1: tp1,
    takeProfit2: tp2,
    takeProfit3: tp3,
    riskPercent: options.challengeSetup.userRiskPerTradePercent,
    riskAmount: riskCalc.riskAmount,
    yamlAnalysisId: options.yamlAnalysisId,
    yamlAssetId,
    invalidationPrice: asset.trading_setup.invalidation?.price,
    invalidationRule: asset.trading_setup.invalidation?.rule,
    isLocked: options.challengeSetup.orderLockEnabled,
    lockReason: options.challengeSetup.orderLockEnabled ? 'IMMUTABLE_AFTER_PLACEMENT' : undefined,
    status: 'PENDING',
    comment,
  };

  return { order, errors, warnings };
}

function determineTradeType(entryType?: string): string {
  if (!entryType) return 'BUY';
  const normalized = entryType.toLowerCase();
  if (normalized.includes('buy')) return 'BUY';
  if (normalized.includes('sell')) return 'SELL';
  return 'BUY';
}

function buildOrderComment(asset: YAMLAsset, entryType: 'PRIMARY' | 'SECONDARY'): string {
  const parts: string[] = [];

  if (asset.wave_structure) {
    parts.push(asset.wave_structure);
  }

  if (asset.scenario) {
    parts.push(asset.scenario);
  }

  parts.push(`${entryType} ENTRY`);

  return parts.join(' | ');
}

function getSummary(orders: TradeOrderData[]) {
  const totalRiskAmount = orders.reduce((sum, order) => sum + order.riskAmount, 0);
  const totalRiskPercent = orders.reduce((sum, order) => sum + order.riskPercent, 0);

  return {
    totalOrders: orders.length,
    totalRiskAmount,
    totalRiskPercent,
    remainingDailyBudget: 0, // Will be calculated by API
  };
}

/**
 * Batch convert multiple YAML assets to TradeOrders
 */
export function convertMultipleAssetsToTradeOrders(
  assets: YAMLAsset[],
  options: ConversionOptions
): ConversionResult {
  const allOrders: TradeOrderData[] = [];
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const asset of assets) {
    const result = convertYAMLAssetToTradeOrders(asset, options);
    allOrders.push(...result.orders);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  }

  const totalRiskAmount = allOrders.reduce((sum, order) => sum + order.riskAmount, 0);
  const totalRiskPercent = (totalRiskAmount / options.accountBalance) * 100;

  return {
    success: allErrors.length === 0,
    orders: allOrders,
    errors: allErrors,
    warnings: allWarnings,
    summary: {
      totalOrders: allOrders.length,
      totalRiskAmount,
      totalRiskPercent,
      remainingDailyBudget: options.challengeSetup.dailyBudgetDollars - totalRiskAmount,
    },
  };
}
