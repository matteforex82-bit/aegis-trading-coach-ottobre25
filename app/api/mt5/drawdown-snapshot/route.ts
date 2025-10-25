import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKey, getTradingAccountByLogin } from '@/lib/mt5-auth';

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
    // 1. Authenticate via API Key
    const userId = await verifyMT5ApiKey(request);

    if (!userId) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      accountLogin,
      dailyDrawdown,
      floatingPnL,
      closedPnL,
      overRollDrawdown,
    } = body;

    if (!accountLogin) {
      return NextResponse.json(
        { error: 'Missing required field: accountLogin' },
        { status: 400 }
      );
    }

    // 3. Get trading account for authenticated user
    const account = await getTradingAccountByLogin(userId, accountLogin);

    if (!account) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key or account not found' },
        { status: 403 }
      );
    }

    // 4. Create drawdown snapshot
    const snapshot = await prisma.drawdownSnapshot.create({
      data: {
        accountId: account.id,
        dailyDrawdownTotal: dailyDrawdown || 0,
        overRollDrawdownTotal: overRollDrawdown || dailyDrawdown || 0,
        closedPnL: closedPnL || 0,
        floatingPnL: floatingPnL || 0,
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

      // Check daily limit
      const dailyLimitPercent = Math.abs(dailyDrawdown / setup.dailyBudgetDollars) * 100;
      if (dailyLimitPercent >= 90) {
        warnings.push(`CRITICAL: Daily drawdown at ${dailyLimitPercent.toFixed(1)}% of limit`);
        shouldBlockOrders = true;
      } else if (dailyLimitPercent >= 70) {
        warnings.push(`WARNING: Daily drawdown at ${dailyLimitPercent.toFixed(1)}% of limit`);
      }

      // Check over-roll limit
      const overRollDD = overRollDrawdown || dailyDrawdown;
      const overRollBudget = (setup.accountSize * setup.overRollMaxPercent) / 100;
      const overRollLimitPercent = Math.abs(overRollDD / overRollBudget) * 100;

      if (overRollLimitPercent >= 85) {
        warnings.push(`CRITICAL: Total drawdown at ${overRollLimitPercent.toFixed(1)}% of limit`);
        shouldBlockOrders = true;
      } else if (overRollLimitPercent >= 60) {
        warnings.push(`WARNING: Total drawdown at ${overRollLimitPercent.toFixed(1)}% of limit`);
      }

      // Log critical warnings
      if (shouldBlockOrders) {
        await prisma.violationLog.create({
          data: {
            accountId: account.id,
            violationType: 'DRAWDOWN_LIMIT_CRITICAL',
            description: warnings.join('. '),
            actionTaken: 'BLOCK_NEW_ORDERS',
            severity: 'CRITICAL',
            metadata: {
              dailyDrawdown,
              overRollDrawdown: overRollDD,
              dailyLimit: setup.dailyBudgetDollars,
              overRollLimit: overRollBudget,
            },
          },
        });

        console.log(`🚨 CRITICAL: Drawdown limits near for account ${accountLogin}`);
      }
    }

    console.log(`📊 Drawdown snapshot recorded for ${accountLogin}: Daily $${dailyDrawdown}, Floating $${floatingPnL}`);

    return NextResponse.json({
      success: true,
      message: 'Drawdown snapshot recorded',
      snapshot: {
        id: snapshot.id,
        timestamp: snapshot.timestamp,
      },
      warnings,
      blockOrders: shouldBlockOrders,
      limits: challengeSetup
        ? {
            dailyBudget: challengeSetup.dailyBudgetDollars,
            dailyUsed: Math.abs(dailyDrawdown),
            dailyRemaining: challengeSetup.dailyBudgetDollars - Math.abs(dailyDrawdown),
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
