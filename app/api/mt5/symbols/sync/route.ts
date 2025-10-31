import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKey, getTradingAccountByLogin } from '@/lib/mt5-auth';

/**
 * POST /api/mt5/symbols/sync
 *
 * Receives symbol specifications from MT5 EA and stores them in the database.
 * Called once when EA first connects to sync all available symbols.
 *
 * Request body:
 * {
 *   accountLogin: "123456",
 *   symbols: [
 *     {
 *       symbol: "XAUUSD",
 *       description: "Gold vs US Dollar",
 *       digits: 2,
 *       point: 0.01,
 *       contractSize: 100,
 *       minLot: 0.01,
 *       maxLot: 100.0,
 *       lotStep: 0.01,
 *       stopLevel: 50,
 *       freezeLevel: 0,
 *       tradeMode: "FULL",
 *       spread: 3,
 *       leverage: 100,
 *       marginRequired: 1000.0
 *     },
 *     ...
 *   ]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate EA
    const userId = await verifyMT5ApiKey(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { accountLogin, symbols } = body;

    if (!accountLogin) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'accountLogin is required' },
        { status: 400 }
      );
    }

    // Get trading account
    const account = await getTradingAccountByLogin(accountLogin, userId);
    if (!account) {
      return NextResponse.json(
        { error: 'Account not found', message: 'Trading account not found or unauthorized' },
        { status: 404 }
      );
    }

    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'symbols array is required' },
        { status: 400 }
      );
    }

    console.log(`[MT5 Symbols Sync] Syncing ${symbols.length} symbols for account ${account.login}`);

    // Validate each symbol has required fields
    const validSymbols = symbols.filter((s) => {
      return (
        s.symbol &&
        typeof s.digits === 'number' &&
        typeof s.point === 'number' &&
        typeof s.contractSize === 'number' &&
        typeof s.minLot === 'number' &&
        typeof s.maxLot === 'number' &&
        typeof s.lotStep === 'number' &&
        typeof s.stopLevel === 'number' &&
        typeof s.freezeLevel === 'number' &&
        s.tradeMode
      );
    });

    if (validSymbols.length !== symbols.length) {
      console.warn(
        `[MT5 Symbols Sync] ${symbols.length - validSymbols.length} symbols skipped due to missing fields`
      );
    }

    // Upsert symbols (update if exists, create if not)
    const results = await Promise.all(
      validSymbols.map(async (symbolData) => {
        try {
          const spec = await prisma.brokerSymbolSpec.upsert({
            where: {
              accountId_symbol: {
                accountId: account.id,
                symbol: symbolData.symbol,
              },
            },
            create: {
              accountId: account.id,
              symbol: symbolData.symbol,
              description: symbolData.description || null,
              digits: symbolData.digits,
              point: symbolData.point,
              tickSize: symbolData.tickSize || null,
              tickValue: symbolData.tickValue || null,
              contractSize: symbolData.contractSize,
              minLot: symbolData.minLot,
              maxLot: symbolData.maxLot,
              lotStep: symbolData.lotStep,
              stopLevel: symbolData.stopLevel,
              freezeLevel: symbolData.freezeLevel,
              tradeMode: symbolData.tradeMode,
              spread: symbolData.spread || null,
              spreadFloat: symbolData.spreadFloat || null,
              leverage: symbolData.leverage || null,
              marginInitial: symbolData.marginInitial || null,
              marginMaintenance: symbolData.marginMaintenance || null,
              marginRequired: symbolData.marginRequired || null,
              category: symbolData.category || null,
              lastUpdated: new Date(),
            },
            update: {
              description: symbolData.description || null,
              digits: symbolData.digits,
              point: symbolData.point,
              tickSize: symbolData.tickSize || null,
              tickValue: symbolData.tickValue || null,
              contractSize: symbolData.contractSize,
              minLot: symbolData.minLot,
              maxLot: symbolData.maxLot,
              lotStep: symbolData.lotStep,
              stopLevel: symbolData.stopLevel,
              freezeLevel: symbolData.freezeLevel,
              tradeMode: symbolData.tradeMode,
              spread: symbolData.spread || null,
              spreadFloat: symbolData.spreadFloat || null,
              leverage: symbolData.leverage || null,
              marginInitial: symbolData.marginInitial || null,
              marginMaintenance: symbolData.marginMaintenance || null,
              marginRequired: symbolData.marginRequired || null,
              category: symbolData.category || null,
              lastUpdated: new Date(),
            },
          });

          return { success: true, symbol: spec.symbol };
        } catch (error: any) {
          console.error(`[MT5 Symbols Sync] Error syncing ${symbolData.symbol}:`, error);
          return { success: false, symbol: symbolData.symbol, error: error.message };
        }
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    console.log(
      `[MT5 Symbols Sync] Completed for account ${account.login}: ${successful} successful, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      message: `Synced ${successful} symbols successfully`,
      stats: {
        total: symbols.length,
        valid: validSymbols.length,
        synced: successful,
        failed: failed,
      },
      failedSymbols: results.filter((r) => !r.success).map((r) => r.symbol),
    });
  } catch (error: any) {
    console.error('[MT5 Symbols Sync] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to sync symbols',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
