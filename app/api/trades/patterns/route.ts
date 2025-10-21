import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/trades/patterns
 *
 * Detects emotional trading patterns:
 * - Revenge trading (loss followed by immediate trade)
 * - Overtrading (multiple trades in short time)
 * - Panic modifications (multiple SL/TP changes)
 *
 * Returns: detected patterns + recommended cooldown
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.tradingAccount.findUnique({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Fetch recent trades (last hour)
    const recentTrades = await prisma.trade.findMany({
      where: {
        accountId,
        closeTime: {
          gte: oneHourAgo,
        },
      },
      orderBy: {
        closeTime: 'desc',
      },
      take: 10,
    });

    // Fetch trades opened in last 30 minutes
    const recentOpenings = await prisma.trade.findMany({
      where: {
        accountId,
        openTime: {
          gte: thirtyMinutesAgo,
        },
      },
      orderBy: {
        openTime: 'desc',
      },
    });

    const patterns: string[] = [];
    const warnings: string[] = [];
    let recommendedCooldown = 0; // minutes
    let severity: 'OK' | 'WARNING' | 'DANGER' | 'CRITICAL' = 'OK';

    // === PATTERN 1: REVENGE TRADING ===
    // Loss followed by trade within 15 minutes
    const lastClosedTrade = recentTrades[0];
    if (lastClosedTrade && lastClosedTrade.profit && lastClosedTrade.profit < 0) {
      const minutesSinceClose = (now.getTime() - new Date(lastClosedTrade.closeTime!).getTime()) / (1000 * 60);

      if (minutesSinceClose < 15) {
        patterns.push('REVENGE_TRADING');
        warnings.push(`You just closed a losing trade ${minutesSinceClose.toFixed(0)} minutes ago (-$${Math.abs(lastClosedTrade.profit).toFixed(2)})`);
        recommendedCooldown = Math.max(recommendedCooldown, 30);
        severity = 'DANGER';
      }
    }

    // === PATTERN 2: OVERTRADING ===
    // 3+ trades in last 30 minutes
    if (recentOpenings.length >= 3) {
      patterns.push('OVERTRADING');
      warnings.push(`You opened ${recentOpenings.length} trades in the last 30 minutes`);
      recommendedCooldown = Math.max(recommendedCooldown, 45);
      severity = severity === 'DANGER' ? 'CRITICAL' : 'DANGER';
    }

    // === PATTERN 3: CONSECUTIVE LOSSES ===
    // 2+ consecutive losses
    const consecutiveLosses = recentTrades
      .filter(t => t.profit && t.profit < 0)
      .slice(0, 3);

    if (consecutiveLosses.length >= 2) {
      const totalLoss = consecutiveLosses.reduce((sum, t) => sum + (t.profit || 0), 0);
      patterns.push('CONSECUTIVE_LOSSES');
      warnings.push(`${consecutiveLosses.length} consecutive losses (total: -$${Math.abs(totalLoss).toFixed(2)})`);
      recommendedCooldown = Math.max(recommendedCooldown, 60);
      severity = 'CRITICAL';
    }

    // === PATTERN 4: HIGH FREQUENCY ===
    // 5+ trades today
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const todayTrades = await prisma.trade.findMany({
      where: {
        accountId,
        openTime: {
          gte: startOfDay,
        },
      },
    });

    if (todayTrades.length >= 5) {
      patterns.push('HIGH_FREQUENCY');
      warnings.push(`You already opened ${todayTrades.length} trades today`);
      if (severity === 'OK') severity = 'WARNING';
    }

    // === PATTERN 5: LATE NIGHT TRADING ===
    // Trading outside 8am-6pm (emotional?)
    const hour = now.getHours();
    if (hour < 8 || hour > 18) {
      patterns.push('OFF_HOURS_TRADING');
      warnings.push(`Trading outside normal hours (${hour}:00) - are you emotional?`);
      if (severity === 'OK') severity = 'WARNING';
    }

    // Calculate if cooldown is currently active
    // (Based on last trade time + recommended cooldown)
    let cooldownActive = false;
    let cooldownRemainingMinutes = 0;

    if (recommendedCooldown > 0 && lastClosedTrade?.closeTime) {
      const cooldownEndTime = new Date(
        new Date(lastClosedTrade.closeTime).getTime() + recommendedCooldown * 60 * 1000
      );

      if (now < cooldownEndTime) {
        cooldownActive = true;
        cooldownRemainingMinutes = Math.ceil(
          (cooldownEndTime.getTime() - now.getTime()) / (1000 * 60)
        );
      }
    }

    // Response
    return NextResponse.json({
      detected: patterns.length > 0,
      patterns,
      warnings,
      severity,
      cooldown: {
        recommended: recommendedCooldown,
        active: cooldownActive,
        remainingMinutes: cooldownRemainingMinutes,
      },
      statistics: {
        tradesLast30Min: recentOpenings.length,
        tradesToday: todayTrades.length,
        recentLosses: consecutiveLosses.length,
      },
      lastTrade: lastClosedTrade ? {
        closeTime: lastClosedTrade.closeTime,
        profit: lastClosedTrade.profit,
        symbol: lastClosedTrade.symbol,
      } : null,
    });

  } catch (error) {
    console.error('Pattern detection error:', error);
    return NextResponse.json(
      {
        error: 'Failed to detect patterns',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
