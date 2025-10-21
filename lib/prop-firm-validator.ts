/**
 * Prop Firm Validator
 *
 * Valida i trade rispetto alle regole delle prop firm challenge
 * (FTMO, MyForexFunds, etc.)
 */

export interface PropFirmRules {
  provider: string;
  phase: string;
  maxDailyLossPercent: number;
  maxTotalLossPercent: number;
  profitTargetPercent: number;
  minTradingDays?: number;
  maxLotSize?: number;
  maxOpenTrades?: number;
  currentDailyLoss: number;
  currentTotalDrawdown: number;
  currentProfit: number;
  tradingDaysCompleted: number;
  startBalance: number;
  currentBalance: number;
}

export interface PropFirmValidationResult {
  isValid: boolean;
  violations: string[];
  warnings: string[];
  limits: {
    dailyLossUsed: number; // %
    dailyLossRemaining: number; // %
    totalDrawdownUsed: number; // %
    totalDrawdownRemaining: number; // %
    profitProgress: number; // %
    daysProgress: number; // %
  };
}

/**
 * Preset comuni per le prop firm più popolari
 */
export const PROP_FIRM_PRESETS: Record<
  string,
  Record<string, Partial<PropFirmRules>>
> = {
  FTMO: {
    'Phase 1': {
      provider: 'FTMO',
      phase: 'Phase 1',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 10.0,
      minTradingDays: 4,
      maxOpenTrades: undefined, // No limit
    },
    'Phase 2': {
      provider: 'FTMO',
      phase: 'Phase 2',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 5.0,
      minTradingDays: 4,
      maxOpenTrades: undefined,
    },
    Funded: {
      provider: 'FTMO',
      phase: 'Funded',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 0, // No target, just don't violate
      minTradingDays: undefined,
      maxOpenTrades: undefined,
    },
  },
  MYFXFUNDS: {
    'Phase 1': {
      provider: 'MyForexFunds',
      phase: 'Phase 1',
      maxDailyLossPercent: 4.0,
      maxTotalLossPercent: 8.0,
      profitTargetPercent: 8.0,
      minTradingDays: 5,
    },
    'Phase 2': {
      provider: 'MyForexFunds',
      phase: 'Phase 2',
      maxDailyLossPercent: 4.0,
      maxTotalLossPercent: 8.0,
      profitTargetPercent: 5.0,
      minTradingDays: 5,
    },
    Funded: {
      provider: 'MyForexFunds',
      phase: 'Funded',
      maxDailyLossPercent: 4.0,
      maxTotalLossPercent: 8.0,
      profitTargetPercent: 0,
      minTradingDays: undefined,
    },
  },
  FIVEPERCENTERS: {
    'Phase 1': {
      provider: 'The 5%ers',
      phase: 'Phase 1',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 6.0,
      profitTargetPercent: 6.0,
      minTradingDays: 5,
    },
    Funded: {
      provider: 'The 5%ers',
      phase: 'Funded',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 6.0,
      profitTargetPercent: 0,
      minTradingDays: undefined,
    },
  },
  FUNDEDNEXT: {
    'Phase 1': {
      provider: 'FundedNext',
      phase: 'Phase 1',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 10.0,
      minTradingDays: 5,
    },
    'Phase 2': {
      provider: 'FundedNext',
      phase: 'Phase 2',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 5.0,
      minTradingDays: 5,
    },
    Funded: {
      provider: 'FundedNext',
      phase: 'Funded',
      maxDailyLossPercent: 5.0,
      maxTotalLossPercent: 10.0,
      profitTargetPercent: 0,
      minTradingDays: undefined,
    },
  },
};

/**
 * Valida se un nuovo trade violerebbe le regole della prop firm
 */
export function validatePropFirmTrade(
  rules: PropFirmRules,
  newTradeRisk: number // Risk % del nuovo trade
): PropFirmValidationResult {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Calcola i limiti correnti
  const dailyLossUsed =
    (Math.abs(rules.currentDailyLoss) / rules.startBalance) * 100;
  const dailyLossRemaining = rules.maxDailyLossPercent - dailyLossUsed;

  const totalDrawdownUsed =
    (Math.abs(rules.currentTotalDrawdown) / rules.startBalance) * 100;
  const totalDrawdownRemaining = rules.maxTotalLossPercent - totalDrawdownUsed;

  const profitProgress = (rules.currentProfit / rules.startBalance) * 100;
  const profitRemaining = rules.profitTargetPercent - profitProgress;

  const daysProgress = rules.minTradingDays
    ? (rules.tradingDaysCompleted / rules.minTradingDays) * 100
    : 100;

  // 1. Verifica Daily Loss Limit
  const potentialDailyLoss = dailyLossUsed + newTradeRisk;
  if (potentialDailyLoss > rules.maxDailyLossPercent) {
    violations.push(
      `Daily loss would exceed limit: ${potentialDailyLoss.toFixed(2)}% > ${rules.maxDailyLossPercent}%`
    );
  } else if (potentialDailyLoss > rules.maxDailyLossPercent * 0.8) {
    warnings.push(
      `Daily loss approaching limit: ${potentialDailyLoss.toFixed(2)}% of ${rules.maxDailyLossPercent}%`
    );
  }

  // 2. Verifica Total Drawdown Limit
  const potentialTotalDD = totalDrawdownUsed + newTradeRisk;
  if (potentialTotalDD > rules.maxTotalLossPercent) {
    violations.push(
      `Total drawdown would exceed limit: ${potentialTotalDD.toFixed(2)}% > ${rules.maxTotalLossPercent}%`
    );
  } else if (potentialTotalDD > rules.maxTotalLossPercent * 0.8) {
    warnings.push(
      `Total drawdown approaching limit: ${potentialTotalDD.toFixed(2)}% of ${rules.maxTotalLossPercent}%`
    );
  }

  // 3. Verifica Profit Target (solo warning)
  if (profitProgress >= rules.profitTargetPercent && rules.profitTargetPercent > 0) {
    warnings.push(
      `✅ Profit target reached! (${profitProgress.toFixed(2)}% of ${rules.profitTargetPercent}%) - Consider slowing down`
    );
  } else if (profitRemaining > 0 && profitRemaining < 2) {
    warnings.push(
      `Close to profit target! Only ${profitRemaining.toFixed(2)}% remaining`
    );
  }

  // 4. Verifica Min Trading Days
  if (
    rules.minTradingDays &&
    rules.tradingDaysCompleted < rules.minTradingDays
  ) {
    const daysRemaining = rules.minTradingDays - rules.tradingDaysCompleted;
    warnings.push(
      `${daysRemaining} more trading day(s) required to complete challenge`
    );
  }

  // 5. Verifica Max Lot Size (se applicabile)
  // Questo richiederebbe il lot size effettivo del trade, per ora skip

  // 6. Verifica Max Open Trades (richiederebbe conteggio trade aperti)
  // Skip per ora, viene verificato nell'API

  return {
    isValid: violations.length === 0,
    violations,
    warnings,
    limits: {
      dailyLossUsed,
      dailyLossRemaining,
      totalDrawdownUsed,
      totalDrawdownRemaining,
      profitProgress,
      daysProgress,
    },
  };
}

/**
 * Calcola quanti trade puoi ancora fare oggi senza violare daily loss
 */
export function calculateRemainingTrades(
  rules: PropFirmRules,
  averageTradeRisk: number = 1.0
): number {
  const dailyLossUsed =
    (Math.abs(rules.currentDailyLoss) / rules.startBalance) * 100;
  const dailyLossRemaining = rules.maxDailyLossPercent - dailyLossUsed;

  if (dailyLossRemaining <= 0) return 0;

  return Math.floor(dailyLossRemaining / averageTradeRisk);
}

/**
 * Suggerisce il max risk per il prossimo trade
 */
export function suggestMaxRisk(rules: PropFirmRules): number {
  const dailyLossUsed =
    (Math.abs(rules.currentDailyLoss) / rules.startBalance) * 100;
  const dailyLossRemaining = rules.maxDailyLossPercent - dailyLossUsed;

  const totalDrawdownUsed =
    (Math.abs(rules.currentTotalDrawdown) / rules.startBalance) * 100;
  const totalDrawdownRemaining = rules.maxTotalLossPercent - totalDrawdownUsed;

  // Prendi il minore tra i due limiti
  const maxRisk = Math.min(dailyLossRemaining, totalDrawdownRemaining);

  // Applica safety buffer del 20%
  const safeMaxRisk = maxRisk * 0.8;

  // Arrotonda a 0.5%
  return Math.floor(safeMaxRisk * 2) / 2;
}

/**
 * Determina se sei "at risk" di fallire la challenge
 */
export function assessChallengeHealth(
  rules: PropFirmRules
): {
  status: 'HEALTHY' | 'WARNING' | 'DANGER' | 'CRITICAL';
  message: string;
  recommendations: string[];
} {
  const recommendations: string[] = [];

  const dailyLossUsed =
    (Math.abs(rules.currentDailyLoss) / rules.startBalance) * 100;
  const totalDrawdownUsed =
    (Math.abs(rules.currentTotalDrawdown) / rules.startBalance) * 100;
  const profitProgress = (rules.currentProfit / rules.startBalance) * 100;

  // CRITICAL: > 90% di un limite
  if (
    dailyLossUsed > rules.maxDailyLossPercent * 0.9 ||
    totalDrawdownUsed > rules.maxTotalLossPercent * 0.9
  ) {
    return {
      status: 'CRITICAL',
      message: 'STOP TRADING! You are close to failing the challenge',
      recommendations: [
        'Do not take any more trades today',
        'Review what went wrong',
        'Consider resetting if funded account',
      ],
    };
  }

  // DANGER: > 70% di un limite
  if (
    dailyLossUsed > rules.maxDailyLossPercent * 0.7 ||
    totalDrawdownUsed > rules.maxTotalLossPercent * 0.7
  ) {
    recommendations.push('Reduce risk to 0.5% per trade maximum');
    recommendations.push('Avoid trading during high volatility');
    recommendations.push('Take a break and review your strategy');

    return {
      status: 'DANGER',
      message: 'High risk of failing challenge - trade carefully',
      recommendations,
    };
  }

  // WARNING: > 50% di un limite o profit target raggiunto
  if (
    dailyLossUsed > rules.maxDailyLossPercent * 0.5 ||
    totalDrawdownUsed > rules.maxTotalLossPercent * 0.5 ||
    (profitProgress >= rules.profitTargetPercent && rules.profitTargetPercent > 0)
  ) {
    if (profitProgress >= rules.profitTargetPercent) {
      recommendations.push('Profit target reached! Slow down and protect gains');
      recommendations.push('Risk max 0.5% per trade');
      recommendations.push('Consider completing min trading days only');
    } else {
      recommendations.push('Risk max 1% per trade');
      recommendations.push('Focus on high-probability setups only');
    }

    return {
      status: 'WARNING',
      message:
        profitProgress >= rules.profitTargetPercent
          ? 'Target reached - protect your progress'
          : 'Moderate risk level - trade cautiously',
      recommendations,
    };
  }

  // HEALTHY
  recommendations.push('Stick to your trading plan');
  recommendations.push('Risk 1-2% per trade maximum');
  recommendations.push('Focus on consistency');

  return {
    status: 'HEALTHY',
    message: 'Challenge progressing well',
    recommendations,
  };
}
