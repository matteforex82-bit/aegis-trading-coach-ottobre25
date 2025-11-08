import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKeyDirect } from '@/lib/mt5-auth';

/**
 * POST /api/mt5/drawdown-snapshot
 *
 * Called by MT5 EA every 60 seconds to record drawdown snapshots
 * Used for real-time monitoring and challenge limit enforcement
 *
 * Body:
 * - accountLogin: MT5 account login
 * - dailyDrawdown: Daily drawdown amount (closed + floating)
 * - floatingPnL: Current floating P&L
 * - closedPnL: Today's closed P&L
 * - overRollDrawdown: (optional) Total drawdown from start
 *
 * Authentication: X-API-Key header
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate via API Key using direct authentication
    const account = await verifyMT5ApiKeyDirect(request);

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      accountLogin,
      balance,
      equity,
      dailyDrawdown,
      floatingPnL,
      closedPnL,
      totalDrawdown,
    } = body;

    if (!accountLogin) {
      return NextResponse.json(
        { error: 'Missing required field: accountLogin' },
        { status: 400 }
      );
    }

    // 3. Verify the account login matches the authenticated account
    if (account.login !== accountLogin) {
      return NextResponse.json(
        { error: 'Account login does not match API key' },
        { status: 403 }
      );
    }

    // 4. Create metrics snapshot
    const snapshot = await prisma.accountMetrics.create({
      data: {
        accountId: account.id,
        balance: balance || 0,
        equity: equity || 0,
        profit: floatingPnL || 0,
        drawdown: Math.abs(totalDrawdown || 0),
        dailyDrawdown: dailyDrawdown || 0,
        margin: 0,
        freeMargin: 0,
        marginLevel: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        consecutiveWins: 0,
        consecutiveLosses: 0,
      },
    });

    // 5. Check if approaching limits (if challenge setup exists)
    let warnings: string[] = [];
    let shouldBlockOrders = false;

    const challengeSetup = await prisma.challengeSetup.findUnique({
      where: { accountId: account.id },
    });

    if (challengeSetup) {
      const setup = challengeSetup;
      const maxDailyLossPercent = setup.dailyMaxPercent || 5.0;
      const maxTotalLossPercent = setup.overRollMaxPercent || 10.0;

      // Calculate drawdown percentages
      const totalDrawdownPercent = totalDrawdown ? (Math.abs(totalDrawdown) / balance) * 100 : 0;
      const dailyDrawdownPercent = dailyDrawdown ? (Math.abs(dailyDrawdown) / balance) * 100 : 0;

      // Check daily limit (negative drawdown means loss)
      if (dailyDrawdownPercent > maxDailyLossPercent * 0.9) {
        warnings.push(`CRITICAL: Daily loss at ${dailyDrawdownPercent.toFixed(1)}% (limit: ${maxDailyLossPercent}%)`);
        shouldBlockOrders = true;
      } else if (dailyDrawdownPercent > maxDailyLossPercent * 0.8) {
        warnings.push(`WARNING: Daily loss at ${dailyDrawdownPercent.toFixed(1)}% (limit: ${maxDailyLossPercent}%)`);
      }

      // Check total drawdown limit
      if (totalDrawdownPercent >= maxTotalLossPercent) {
        warnings.push(`CRITICAL: Total drawdown at ${totalDrawdownPercent.toFixed(1)}% (limit: ${maxTotalLossPercent}%)`);
        shouldBlockOrders = true;
      } else if (totalDrawdownPercent >= maxTotalLossPercent * 0.8) {
        warnings.push(`WARNING: Total drawdown at ${totalDrawdownPercent.toFixed(1)}% (limit: ${maxTotalLossPercent}%)`);
      }

      // Log critical warnings
      if (shouldBlockOrders) {
        console.log(`🚨 CRITICAL: Drawdown limits near for account ${accountLogin}`);
        console.log(`   Daily: ${dailyDrawdownPercent.toFixed(2)}% / ${maxDailyLossPercent}%`);
        console.log(`   Total: ${totalDrawdownPercent.toFixed(2)}% / ${maxTotalLossPercent}%`);
      }
    }

    console.log(`📊 Drawdown snapshot recorded for ${accountLogin}: Daily $${dailyDrawdown}, Floating $${floatingPnL}`);

    return NextResponse.json({
      success: true,
      message: 'Drawdown snapshot recorded',
      snapshot: {
        id: snapshot.id,
        timestamp: snapshot.recordedAt,
      },
      warnings,
      blockOrders: shouldBlockOrders,
      limits: challengeSetup
        ? {
            maxDailyLossPercent: challengeSetup.dailyMaxPercent || 5.0,
            maxTotalLossPercent: challengeSetup.overRollMaxPercent || 10.0,
            dailyLoss: Math.abs(dailyDrawdown || 0),
            totalDrawdown: Math.abs(totalDrawdown || 0),
          }
        : null,
    });
  } catch (error: any) {
    console.error('Error recording drawdown snapshot:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
