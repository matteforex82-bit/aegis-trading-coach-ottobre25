/**
 * Trade Validator
 *
 * Orchestratore che combina risk calculator, correlation engine
 * e prop firm validator per una validazione completa pre-trade
 */

import { calculateLotSize, type RiskCalculationInput } from './risk-calculator';
import {
  analyzeExposure,
  parseCurrencyPair,
  type TradeExposure,
} from './correlation-engine';
import {
  validatePropFirmTrade,
  type PropFirmRules,
} from './prop-firm-validator';

export interface TradeValidationInput {
  // Trade Details
  symbol: string;
  direction: 'BUY' | 'SELL';
  entryPrice: number;
  stopLoss: number;
  takeProfit1?: number;
  riskPercent: number;

  // Account Info
  accountBalance: number;
  accountCurrency?: string;

  // Existing Positions
  existingTrades?: TradeExposure[];

  // Prop Firm Rules (optional)
  propFirmRules?: PropFirmRules;

  // Correlation Settings
  maxCurrencyExposure?: number;
}

export interface TradeValidationResult {
  isValid: boolean;
  canExecute: boolean;
  severity: 'OK' | 'WARNING' | 'ERROR' | 'BLOCKED';

  // Calculated Values
  lotSize: number;
  riskAmount: number;
  pipDistance: number;

  // Violations & Warnings
  violations: string[];
  warnings: string[];
  recommendations: string[];

  // Details
  riskAnalysis?: any;
  exposureAnalysis?: any;
  propFirmAnalysis?: any;
}

/**
 * Esegue validazione completa del trade
 */
export async function validateTrade(
  input: TradeValidationInput
): Promise<TradeValidationResult> {
  const violations: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  let canExecute = true;
  let severity: 'OK' | 'WARNING' | 'ERROR' | 'BLOCKED' = 'OK';

  // === 1. RISK CALCULATION ===
  const riskCalc = calculateLotSize({
    accountBalance: input.accountBalance,
    riskPercent: input.riskPercent,
    entryPrice: input.entryPrice,
    stopLoss: input.stopLoss,
    symbol: input.symbol,
    accountCurrency: input.accountCurrency,
  });

  if (!riskCalc.isValid) {
    violations.push(...riskCalc.errors);
    canExecute = false;
    severity = 'BLOCKED';
  }

  // === 2. BASIC VALIDATIONS ===

  // Validate R:R ratio
  if (input.takeProfit1) {
    const risk = Math.abs(input.entryPrice - input.stopLoss);
    const reward = Math.abs(input.takeProfit1 - input.entryPrice);
    const rrRatio = reward / risk;

    if (rrRatio < 1.0) {
      warnings.push(
        `Low R:R ratio (${rrRatio.toFixed(2)}:1). Consider 2:1 minimum`
      );
      severity = severity === 'OK' ? 'WARNING' : severity;
    }

    // Check se SL e TP sono dalla parte corretta
    if (input.direction === 'BUY') {
      if (input.stopLoss >= input.entryPrice) {
        violations.push('Stop Loss must be below Entry for BUY orders');
        canExecute = false;
        severity = 'BLOCKED';
      }
      if (input.takeProfit1 && input.takeProfit1 <= input.entryPrice) {
        violations.push('Take Profit must be above Entry for BUY orders');
        canExecute = false;
        severity = 'BLOCKED';
      }
    } else {
      if (input.stopLoss <= input.entryPrice) {
        violations.push('Stop Loss must be above Entry for SELL orders');
        canExecute = false;
        severity = 'BLOCKED';
      }
      if (input.takeProfit1 && input.takeProfit1 >= input.entryPrice) {
        violations.push('Take Profit must be below Entry for SELL orders');
        canExecute = false;
        severity = 'BLOCKED';
      }
    }
  }

  // Validate lot size range
  if (riskCalc.lotSize < 0.01) {
    violations.push('Lot size too small (minimum 0.01)');
    canExecute = false;
    severity = 'BLOCKED';
  }

  if (riskCalc.lotSize > 100) {
    violations.push('Lot size too large (maximum 100)');
    canExecute = false;
    severity = 'BLOCKED';
  }

  // === 3. CORRELATION & EXPOSURE ANALYSIS ===
  let exposureAnalysis = null;

  if (input.existingTrades && input.existingTrades.length > 0) {
    const { baseCurrency, quoteCurrency } = parseCurrencyPair(input.symbol);

    const newTradeExposure: TradeExposure = {
      symbol: input.symbol,
      direction: input.direction,
      riskPercent: input.riskPercent,
      baseCurrency,
      quoteCurrency,
    };

    exposureAnalysis = analyzeExposure(
      input.existingTrades,
      newTradeExposure,
      input.maxCurrencyExposure || 2.0
    );

    if (exposureAnalysis.violations.length > 0) {
      violations.push(...exposureAnalysis.violations);
      canExecute = false;
      severity = 'BLOCKED';

      recommendations.push(
        'Reduce position size or close correlated positions first'
      );
    }

    if (exposureAnalysis.warnings.length > 0) {
      warnings.push(...exposureAnalysis.warnings);
      if (severity === 'OK') severity = 'WARNING';
    }

    // Recommendation se total risk è alto
    if (exposureAnalysis.totalRisk > 3.0) {
      recommendations.push(
        `Total portfolio risk is ${exposureAnalysis.totalRisk.toFixed(1)}% - consider reducing`
      );
    }
  }

  // === 4. PROP FIRM RULES VALIDATION ===
  let propFirmAnalysis = null;

  if (input.propFirmRules) {
    propFirmAnalysis = validatePropFirmTrade(
      input.propFirmRules,
      input.riskPercent
    );

    if (!propFirmAnalysis.isValid) {
      violations.push(...propFirmAnalysis.violations);
      canExecute = false;
      severity = 'BLOCKED';
    }

    if (propFirmAnalysis.warnings.length > 0) {
      warnings.push(...propFirmAnalysis.warnings);
      if (severity === 'OK') severity = 'WARNING';
    }

    // Add recommendations based on remaining limits
    const { dailyLossRemaining, totalDrawdownRemaining } =
      propFirmAnalysis.limits;

    if (dailyLossRemaining < 2.0) {
      recommendations.push(
        `Only ${dailyLossRemaining.toFixed(1)}% daily loss remaining - consider stopping for today`
      );
    }

    if (totalDrawdownRemaining < 3.0) {
      recommendations.push(
        `Only ${totalDrawdownRemaining.toFixed(1)}% total drawdown remaining - trade carefully`
      );
    }
  }

  // === 5. ADDITIONAL RECOMMENDATIONS ===

  // Suggest based on risk percent
  if (input.riskPercent > 2.0) {
    recommendations.push('Consider reducing risk to 1-2% per trade');
  }

  // Suggest if pip distance is too wide
  if (riskCalc.pipDistance > 100) {
    recommendations.push(
      `Wide stop loss (${riskCalc.pipDistance.toFixed(0)} pips) - consider tighter SL`
    );
  }

  // === FINAL RESULT ===
  return {
    isValid: violations.length === 0,
    canExecute,
    severity,
    lotSize: riskCalc.lotSize,
    riskAmount: riskCalc.riskAmount,
    pipDistance: riskCalc.pipDistance,
    violations,
    warnings,
    recommendations,
    riskAnalysis: riskCalc,
    exposureAnalysis,
    propFirmAnalysis,
  };
}

/**
 * Validazione veloce solo per lot size
 */
export function quickValidateLotSize(
  lotSize: number,
  accountBalance: number,
  maxRiskPercent: number,
  pipDistance: number,
  pipValue: number
): { isValid: boolean; error?: string } {
  if (lotSize < 0.01) {
    return { isValid: false, error: 'Lot size too small (min 0.01)' };
  }

  if (lotSize > 100) {
    return { isValid: false, error: 'Lot size too large (max 100)' };
  }

  const riskAmount = lotSize * pipDistance * pipValue;
  const riskPercent = (riskAmount / accountBalance) * 100;

  if (riskPercent > maxRiskPercent) {
    return {
      isValid: false,
      error: `Risk ${riskPercent.toFixed(2)}% exceeds max ${maxRiskPercent}%`,
    };
  }

  return { isValid: true };
}

/**
 * Genera un report human-readable della validazione
 */
export function formatValidationReport(
  result: TradeValidationResult
): string {
  const lines: string[] = [];

  lines.push('=== TRADE VALIDATION REPORT ===\n');

  // Status
  const statusEmoji =
    result.severity === 'OK'
      ? '✅'
      : result.severity === 'WARNING'
      ? '⚠️'
      : '❌';
  lines.push(`Status: ${statusEmoji} ${result.severity}`);
  lines.push(`Can Execute: ${result.canExecute ? 'YES' : 'NO'}\n`);

  // Calculated Values
  lines.push('--- Calculated Values ---');
  lines.push(`Lot Size: ${result.lotSize}`);
  lines.push(`Risk Amount: $${result.riskAmount.toFixed(2)}`);
  lines.push(`Pip Distance: ${result.pipDistance.toFixed(1)} pips\n`);

  // Violations
  if (result.violations.length > 0) {
    lines.push('--- VIOLATIONS (Blocking) ---');
    result.violations.forEach(v => lines.push(`❌ ${v}`));
    lines.push('');
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push('--- WARNINGS ---');
    result.warnings.forEach(w => lines.push(`⚠️ ${w}`));
    lines.push('');
  }

  // Recommendations
  if (result.recommendations.length > 0) {
    lines.push('--- RECOMMENDATIONS ---');
    result.recommendations.forEach(r => lines.push(`💡 ${r}`));
    lines.push('');
  }

  // Exposure Details
  if (result.exposureAnalysis) {
    lines.push('--- CURRENCY EXPOSURE ---');
    const exp = result.exposureAnalysis;
    lines.push(`Total Risk: ${exp.totalRisk.toFixed(2)}%`);
    if (exp.maxExposureCurrency) {
      lines.push(
        `Max Exposure: ${exp.maxExposureCurrency} (${exp.maxExposureValue.toFixed(2)}%)`
      );
    }
    lines.push('');
  }

  // Prop Firm Details
  if (result.propFirmAnalysis) {
    lines.push('--- PROP FIRM CHALLENGE ---');
    const pf = result.propFirmAnalysis.limits;
    lines.push(
      `Daily Loss: ${pf.dailyLossUsed.toFixed(2)}% / ${pf.dailyLossRemaining.toFixed(2)}% remaining`
    );
    lines.push(
      `Total DD: ${pf.totalDrawdownUsed.toFixed(2)}% / ${pf.totalDrawdownRemaining.toFixed(2)}% remaining`
    );
    lines.push(`Profit: ${pf.profitProgress.toFixed(2)}%`);
    lines.push('');
  }

  return lines.join('\n');
}
