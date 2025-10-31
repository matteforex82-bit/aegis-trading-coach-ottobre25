import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { validateOrderForExecution } from '@/lib/symbol-mapper';

/**
 * POST /api/admin/trading-setups/execute
 * Crea TradeOrder da TradingSetup per esecuzione su MT5
 * Con validazione simboli broker e normalizzazione lot size
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { setupId, accountId, lotSize, riskAmount } = body;

    if (!setupId) {
      return NextResponse.json({ error: 'Setup ID required' }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Fetch setup
    const setup = await prisma.tradingSetup.findUnique({
      where: { id: setupId }
    });

    if (!setup) {
      return NextResponse.json({ error: 'Setup not found' }, { status: 404 });
    }

    // Verify setup has at least stopLoss (entryPrice optional for MARKET orders)
    if (!setup.stopLoss) {
      return NextResponse.json({
        error: 'Setup must have stopLoss for execution',
        message: 'This is an analysis-only setup. Please add stop loss price first.'
      }, { status: 400 });
    }

    // Verify account belongs to user
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id
      }
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    console.log('[Admin] Creating TradeOrder from setup:', setupId);
    console.log(`[Admin] Standard symbol: ${setup.symbol}, Account: ${account.login}`);

    // ============================================================================
    // SYMBOL VALIDATION & MAPPING
    // ============================================================================

    const validation = await validateOrderForExecution(
      setup.symbol,
      accountId,
      lotSize || 0.01,
      setup.entryPrice,
      setup.stopLoss,
      setup.direction as 'BUY' | 'SELL'
    );

    // Check validation result
    if (!validation.valid) {
      console.error('[Admin] Validation failed:', validation.errors);
      return NextResponse.json({
        error: 'Order validation failed',
        message: validation.errors.join('. '),
        details: {
          errors: validation.errors,
          warnings: validation.warnings,
        },
        hint: validation.errors.some(e => e.includes('not found'))
          ? 'Symbol not found on broker. Please check Operations > Broker Symbols to manage symbol mappings.'
          : undefined,
      }, { status: 400 });
    }

    const brokerSymbol = validation.brokerSymbol!;
    const normalizedLotSize = validation.normalizedLotSize || lotSize || 0.01;

    // Log warnings if any
    if (validation.warnings.length > 0) {
      console.warn('[Admin] Validation warnings:', validation.warnings);
    }

    console.log(`[Admin] Mapped symbol: ${setup.symbol} → ${brokerSymbol}`);
    console.log(`[Admin] Lot size: ${lotSize || 0.01} → ${normalizedLotSize}`);

    // ============================================================================
    // ORDER TYPE DETERMINATION
    // ============================================================================

    // Determine order type based on entryPrice presence
    // If no entryPrice -> MARKET order (immediate execution)
    // If entryPrice specified -> LIMIT order (pending at specified price)
    const isMarketOrder = !setup.entryPrice;
    const orderType = isMarketOrder
      ? (setup.direction === 'BUY' ? 'BUY' : 'SELL')
      : (setup.direction === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT');

    console.log(`[Admin] Order type: ${orderType} (${isMarketOrder ? 'MARKET' : 'LIMIT'})`);

    // ============================================================================
    // CREATE TRADE ORDER
    // ============================================================================

    // Create TradeOrder with broker symbol (not standard symbol)
    const order = await prisma.tradeOrder.create({
      data: {
        accountId: accountId,
        symbol: brokerSymbol, // ✅ Use broker-specific symbol
        direction: setup.direction,
        orderType: orderType,
        type: setup.direction, // Legacy field
        lotSize: normalizedLotSize, // ✅ Use normalized lot size
        entryPrice: setup.entryPrice || null, // Null for MARKET orders
        stopLoss: setup.stopLoss,
        takeProfit1: setup.takeProfit1,
        takeProfit2: setup.takeProfit2,
        takeProfit3: setup.takeProfit3,
        riskPercent: 1.0,
        riskAmount: riskAmount || 100,
        invalidationPrice: setup.invalidation,
        comment: `Elliott Wave: ${setup.wavePattern || 'Setup'} (${orderType}) [${setup.symbol}→${brokerSymbol}]`,
        magicNumber: 999001,
        status: 'APPROVED' // Ready for MT5 EA execution
      }
    });

    console.log('[Admin] Created TradeOrder:', order.id);

    // Build response message
    let message = `Order created for ${brokerSymbol} - Ready for MT5 execution`;
    if (validation.warnings.length > 0) {
      message += `\n\nWarnings:\n${validation.warnings.map(w => `- ${w}`).join('\n')}`;
    }

    return NextResponse.json({
      success: true,
      order,
      message: message,
      details: {
        standardSymbol: setup.symbol,
        brokerSymbol: brokerSymbol,
        originalLotSize: lotSize || 0.01,
        normalizedLotSize: normalizedLotSize,
        orderType: orderType,
        warnings: validation.warnings,
      },
    });

  } catch (error: any) {
    console.error('[Admin] Execute error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create trade order',
        message: error.message
      },
      { status: 500 }
    );
  }
}
