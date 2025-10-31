import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKeyDirect } from '@/lib/mt5-auth';

/**
 * POST /api/mt5/data-sync
 *
 * Receives trading data from MT5 EA and stores it in the database.
 * Supports two sync types:
 * - FULL_HISTORY: Initial sync with all historical trades
 * - REALTIME: Regular sync with current positions and recent trades
 *
 * Request body structure:
 * {
 *   accountLogin: "123456",
 *   syncType: "FULL_HISTORY" | "REALTIME",
 *   totalDeals?: number,
 *   account: {
 *     login: "123456",
 *     broker: "Broker Name",
 *     server: "Server Name",
 *     balance: 10000.00,
 *     equity: 10500.00,
 *     currency: "USD"
 *   },
 *   openPositions?: [...],
 *   trades?: [...],
 *   metrics?: {...}
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate EA using direct API key
    const account = await verifyMT5ApiKeyDirect(request);
    if (!account) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      accountLogin,
      syncType,
      totalDeals,
      account: accountInfo,
      openPositions,
      trades,
      metrics,
    } = body;

    // Validate required fields
    if (!accountLogin || !syncType) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'accountLogin and syncType are required' },
        { status: 400 }
      );
    }

    // Verify the account login matches the authenticated account
    if (account.login !== accountLogin) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Account login does not match API key' },
        { status: 403 }
      );
    }

    console.log(
      `[MT5 Data Sync] ${syncType} sync for account ${accountLogin} (${
        totalDeals ? `${totalDeals} total deals, ` : ''
      }${trades?.length || 0} trades, ${openPositions?.length || 0} positions)`
    );

    // Update account balance and equity
    if (accountInfo) {
      await prisma.tradingAccount.update({
        where: { id: account.id },
        data: {
          currentBalance: accountInfo.balance,
          profit: accountInfo.equity - accountInfo.balance,
          lastSyncAt: new Date(),
        },
      });
    }

    let syncedTrades = 0;
    let syncedPositions = 0;
    let updatedMetrics = false;

    // Process closed trades
    if (trades && Array.isArray(trades)) {
      for (const trade of trades) {
        try {
          await prisma.trade.upsert({
            where: {
              accountId_ticket: {
                accountId: account.id,
                ticket: trade.ticket,
              },
            },
            create: {
              accountId: account.id,
              ticket: trade.ticket,
              symbol: trade.symbol,
              type: trade.type,
              volume: parseFloat(trade.volume),
              openPrice: parseFloat(trade.openPrice),
              closePrice: trade.closePrice ? parseFloat(trade.closePrice) : null,
              openTime: new Date(trade.openTime),
              closeTime: trade.closeTime ? new Date(trade.closeTime) : null,
              profit: trade.profit ? parseFloat(trade.profit) : null,
              commission: trade.commission ? parseFloat(trade.commission) : null,
              swap: trade.swap ? parseFloat(trade.swap) : null,
              comment: trade.comment || null,
              magicNumber: trade.magicNumber || null,
              stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : null,
              takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : null,
            },
            update: {
              closePrice: trade.closePrice ? parseFloat(trade.closePrice) : undefined,
              closeTime: trade.closeTime ? new Date(trade.closeTime) : undefined,
              profit: trade.profit ? parseFloat(trade.profit) : undefined,
              commission: trade.commission ? parseFloat(trade.commission) : undefined,
              swap: trade.swap ? parseFloat(trade.swap) : undefined,
            },
          });
          syncedTrades++;
        } catch (error: any) {
          console.error(`[MT5 Data Sync] Error syncing trade ${trade.ticket}:`, error.message);
        }
      }
    }

    // Process open positions
    // Note: For open positions, we would need a separate table or use the Trade model with null closeTime
    // For now, we'll just track them in the Trade table
    if (openPositions && Array.isArray(openPositions)) {
      for (const position of openPositions) {
        try {
          await prisma.trade.upsert({
            where: {
              accountId_ticket: {
                accountId: account.id,
                ticket: position.ticket,
              },
            },
            create: {
              accountId: account.id,
              ticket: position.ticket,
              symbol: position.symbol,
              type: position.type,
              volume: parseFloat(position.volume),
              openPrice: parseFloat(position.openPrice),
              openTime: new Date(position.openTime),
              stopLoss: position.stopLoss ? parseFloat(position.stopLoss) : null,
              takeProfit: position.takeProfit ? parseFloat(position.takeProfit) : null,
              profit: position.profit ? parseFloat(position.profit) : null,
              commission: position.commission ? parseFloat(position.commission) : null,
              swap: position.swap ? parseFloat(position.swap) : null,
              comment: position.comment || null,
              magicNumber: position.magicNumber || null,
            },
            update: {
              profit: position.profit ? parseFloat(position.profit) : undefined,
              commission: position.commission ? parseFloat(position.commission) : undefined,
              swap: position.swap ? parseFloat(position.swap) : undefined,
              stopLoss: position.stopLoss ? parseFloat(position.stopLoss) : undefined,
              takeProfit: position.takeProfit ? parseFloat(position.takeProfit) : undefined,
            },
          });
          syncedPositions++;
        } catch (error: any) {
          console.error(
            `[MT5 Data Sync] Error syncing position ${position.ticket}:`,
            error.message
          );
        }
      }
    }

    // Process metrics - create a new metrics record (historical snapshot)
    if (metrics) {
      try {
        await prisma.accountMetrics.create({
          data: {
            accountId: account.id,
            balance: accountInfo?.balance || 0,
            equity: accountInfo?.equity || 0,
            margin: 0,
            freeMargin: 0,
            marginLevel: 0,
            profit: accountInfo ? accountInfo.equity - accountInfo.balance : 0,
            drawdown: metrics.maxDrawdown ? parseFloat(metrics.maxDrawdown) : 0,
            totalTrades: metrics.totalTrades || 0,
            winningTrades: 0,
            losingTrades: 0,
            winRate: metrics.winRate ? parseFloat(metrics.winRate) : null,
            profitFactor: metrics.profitFactor ? parseFloat(metrics.profitFactor) : null,
            averageWin: metrics.averageWin ? parseFloat(metrics.averageWin) : null,
            averageLoss: metrics.averageLoss ? parseFloat(metrics.averageLoss) : null,
            largestWin: metrics.largestWin ? parseFloat(metrics.largestWin) : null,
            largestLoss: metrics.largestLoss ? parseFloat(metrics.largestLoss) : null,
            consecutiveWins: metrics.consecutiveWins || 0,
            consecutiveLosses: metrics.consecutiveLosses || 0,
          },
        });
        updatedMetrics = true;
      } catch (error: any) {
        console.error('[MT5 Data Sync] Error syncing metrics:', error.message);
      }
    }

    console.log(
      `[MT5 Data Sync] Completed for account ${accountLogin}: ${syncedTrades} trades, ${syncedPositions} positions${
        updatedMetrics ? ', metrics updated' : ''
      }`
    );

    return NextResponse.json({
      success: true,
      message: `${syncType} sync completed successfully`,
      stats: {
        syncType,
        trades: syncedTrades,
        positions: syncedPositions,
        metrics: updatedMetrics,
      },
    });
  } catch (error: any) {
    console.error('[MT5 Data Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync data',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
