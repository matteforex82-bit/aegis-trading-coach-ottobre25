/**
 * Discipline Score Calculator
 *
 * Calculates daily discipline score (0-100) based on:
 * - Violation attempts (FOMO, manual modifications)
 * - Risk management compliance
 * - Trading plan adherence
 * - Drawdown control
 */

export interface DisciplineScoreInput {
  // Violations
  totalViolations: number;
  criticalViolations: number;
  warningViolations: number;

  // Trading Stats
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;

  // Risk Management
  tradesWithinRisk: number; // Trades that respected risk limits
  tradesOverRisk: number; // Trades that exceeded risk limits

  // Drawdown
  dailyDrawdown: number;
  maxDailyDrawdown: number;

  // Challenge Compliance (if applicable)
  challengeLimitBreached: boolean;
}

export interface DisciplineScoreResult {
  totalScore: number; // 0-100
  breakdown: {
    violationsScore: number; // 0-30 points
    riskManagementScore: number; // 0-30 points
    drawdownControlScore: number; // 0-20 points
    tradingQualityScore: number; // 0-20 points
  };
  grade: string; // S, A, B, C, D, F
  feedback: string[];
  recommendations: string[];
}

export function calculateDisciplineScore(
  input: DisciplineScoreInput
): DisciplineScoreResult {
  const feedback: string[] = [];
  const recommendations: string[] = [];

  // 1. Violations Score (0-30 points) - LOWER violations = HIGHER score
  let violationsScore = 30;

  if (input.totalViolations > 0) {
    // Deduct points for violations
    const violationPenalty =
      input.criticalViolations * 10 + input.warningViolations * 5;
    violationsScore = Math.max(0, 30 - violationPenalty);

    if (input.criticalViolations > 0) {
      feedback.push(
        `⚠️  ${input.criticalViolations} critical violation(s) detected`
      );
      recommendations.push('Avoid FOMO and respect order locks');
    }

    if (input.warningViolations > 0) {
      feedback.push(
        `⚠️  ${input.warningViolations} warning violation(s) detected`
      );
    }
  } else {
    feedback.push('✅ Perfect discipline - no violations!');
  }

  // 2. Risk Management Score (0-30 points)
  let riskManagementScore = 0;

  if (input.totalTrades > 0) {
    const riskCompliance =
      input.tradesWithinRisk / (input.tradesWithinRisk + input.tradesOverRisk);
    riskManagementScore = Math.round(riskCompliance * 30);

    if (riskCompliance >= 1.0) {
      feedback.push('✅ All trades within risk limits');
    } else if (riskCompliance >= 0.8) {
      feedback.push(`⚠️  ${input.tradesOverRisk} trade(s) exceeded risk limits`);
      recommendations.push('Review position sizing before entry');
    } else {
      feedback.push(`🔴 ${input.tradesOverRisk} trades exceeded risk - CRITICAL`);
      recommendations.push('URGENT: Reduce position sizes immediately');
    }
  } else {
    riskManagementScore = 30; // No trades = perfect compliance
    feedback.push('📊 No trades today');
  }

  // 3. Drawdown Control Score (0-20 points)
  let drawdownControlScore = 20;

  if (input.maxDailyDrawdown > 0) {
    const drawdownPercent = Math.abs(
      input.dailyDrawdown / input.maxDailyDrawdown
    );

    if (input.challengeLimitBreached) {
      drawdownControlScore = 0;
      feedback.push('🔴 CRITICAL: Challenge limit breached!');
      recommendations.push('STOP TRADING - Limit exceeded');
    } else if (drawdownPercent >= 0.9) {
      drawdownControlScore = 5;
      feedback.push('🔴 DANGER: 90%+ of daily limit used');
      recommendations.push('STOP TRADING - Too close to limit');
    } else if (drawdownPercent >= 0.7) {
      drawdownControlScore = 10;
      feedback.push('⚠️  70%+ of daily limit used');
      recommendations.push('Be cautious - approaching limit');
    } else if (drawdownPercent >= 0.5) {
      drawdownControlScore = 15;
      feedback.push('⚠️  50%+ of daily limit used');
    } else {
      drawdownControlScore = 20;
      feedback.push('✅ Drawdown well controlled');
    }
  }

  // 4. Trading Quality Score (0-20 points)
  let tradingQualityScore = 0;

  if (input.totalTrades > 0) {
    const winRate = input.winningTrades / input.totalTrades;

    if (winRate >= 0.6) {
      tradingQualityScore = 20;
      feedback.push(`✅ Excellent win rate: ${(winRate * 100).toFixed(0)}%`);
    } else if (winRate >= 0.5) {
      tradingQualityScore = 15;
      feedback.push(`✅ Good win rate: ${(winRate * 100).toFixed(0)}%`);
    } else if (winRate >= 0.4) {
      tradingQualityScore = 10;
      feedback.push(`⚠️  Win rate: ${(winRate * 100).toFixed(0)}% - Room for improvement`);
      recommendations.push('Review entry criteria and setups');
    } else {
      tradingQualityScore = 5;
      feedback.push(`🔴 Low win rate: ${(winRate * 100).toFixed(0)}% - REVIEW NEEDED`);
      recommendations.push('URGENT: Review trading strategy');
    }

    // Bonus for consistency
    if (input.totalTrades >= 3 && input.totalTrades <= 5) {
      feedback.push('✅ Good trading frequency (3-5 trades)');
    } else if (input.totalTrades > 10) {
      feedback.push('⚠️  High trading frequency - watch for overtrading');
      recommendations.push('Consider reducing trade count');
    }
  } else {
    tradingQualityScore = 10; // Neutral for no trades
  }

  // Calculate total score
  const totalScore =
    violationsScore +
    riskManagementScore +
    drawdownControlScore +
    tradingQualityScore;

  // Determine grade
  let grade: string;
  if (totalScore >= 95) grade = 'S'; // Perfect
  else if (totalScore >= 85) grade = 'A'; // Excellent
  else if (totalScore >= 75) grade = 'B'; // Good
  else if (totalScore >= 60) grade = 'C'; // Acceptable
  else if (totalScore >= 40) grade = 'D'; // Poor
  else grade = 'F'; // Failing

  // Add grade-specific feedback
  if (grade === 'S' || grade === 'A') {
    feedback.push('🌟 Outstanding discipline! Keep it up!');
  } else if (grade === 'B') {
    feedback.push('👍 Good discipline with room for improvement');
  } else if (grade === 'C') {
    feedback.push('⚠️  Discipline needs attention');
    recommendations.push('Focus on reducing violations and controlling risk');
  } else {
    feedback.push('🔴 Discipline CRITICAL - immediate action required');
    recommendations.push('STOP TRADING until discipline improves');
  }

  return {
    totalScore,
    breakdown: {
      violationsScore,
      riskManagementScore,
      drawdownControlScore,
      tradingQualityScore,
    },
    grade,
    feedback,
    recommendations,
  };
}

/**
 * Generate end-of-day report data
 */
export async function generateDailyReport(
  accountId: string,
  reportDate: Date,
  prisma: any
): Promise<DisciplineScoreResult & { rawData: any }> {
  // Get today's violations
  const dayStart = new Date(reportDate.setHours(0, 0, 0, 0));
  const dayEnd = new Date(reportDate.setHours(23, 59, 59, 999));

  const violations = await prisma.violationLog.findMany({
    where: {
      accountId,
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  const criticalViolations = violations.filter(
    (v: any) => v.severity === 'CRITICAL'
  ).length;
  const warningViolations = violations.filter(
    (v: any) => v.severity === 'WARNING'
  ).length;

  // Get today's trades
  const trades = await prisma.tradeOrder.findMany({
    where: {
      accountId,
      createdAt: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
  });

  const totalTrades = trades.length;
  const winningTrades = trades.filter((t: any) => t.finalPnL > 0).length;
  const losingTrades = trades.filter((t: any) => t.finalPnL < 0).length;

  // Get challenge setup for risk limits
  const account = await prisma.tradingAccount.findUnique({
    where: { id: accountId },
    include: { challengeSetup: true },
  });

  const tradesWithinRisk = trades.filter(
    (t: any) =>
      t.riskAmount <= (account?.challengeSetup?.maxTradeRiskDollars || Infinity)
  ).length;
  const tradesOverRisk = totalTrades - tradesWithinRisk;

  // Get latest drawdown snapshot
  const latestSnapshot = await prisma.drawdownSnapshot.findFirst({
    where: {
      accountId,
      timestamp: {
        gte: dayStart,
        lte: dayEnd,
      },
    },
    orderBy: {
      timestamp: 'desc',
    },
  });

  const dailyDrawdown = latestSnapshot?.dailyDrawdownTotal || 0;
  const maxDailyDrawdown =
    account?.challengeSetup?.dailyBudgetDollars || 1000;

  const challengeLimitBreached =
    Math.abs(dailyDrawdown) >= maxDailyDrawdown * 0.95;

  // Calculate score
  const scoreResult = calculateDisciplineScore({
    totalViolations: violations.length,
    criticalViolations,
    warningViolations,
    totalTrades,
    winningTrades,
    losingTrades,
    tradesWithinRisk,
    tradesOverRisk,
    dailyDrawdown,
    maxDailyDrawdown,
    challengeLimitBreached,
  });

  return {
    ...scoreResult,
    rawData: {
      violations,
      trades,
      latestSnapshot,
    },
  };
}
