import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/admin/trading-setups/execute
 * Crea TradeOrder da TradingSetup per esecuzione su MT5
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

    // Verify setup has execution prices
    if (!setup.entryPrice || !setup.stopLoss) {
      return NextResponse.json({
        error: 'Setup must have entryPrice and stopLoss for execution',
        message: 'This is an analysis-only setup. Please add entry and stop loss prices first.'
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

    // Create TradeOrder
    const order = await prisma.tradeOrder.create({
      data: {
        accountId: accountId,
        symbol: setup.symbol,
        direction: setup.direction,
        orderType: setup.direction === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT',
        type: setup.direction, // Legacy field
        lotSize: lotSize || 0.01,
        entryPrice: setup.entryPrice,
        stopLoss: setup.stopLoss,
        takeProfit1: setup.takeProfit1,
        takeProfit2: setup.takeProfit2,
        takeProfit3: setup.takeProfit3,
        riskPercent: 1.0,
        riskAmount: riskAmount || 100,
        invalidationPrice: setup.invalidation,
        comment: `Elliott Wave: ${setup.wavePattern || 'Setup'}`,
        magicNumber: 999001,
        status: 'APPROVED' // Ready for MT5 EA execution
      }
    });

    console.log('[Admin] Created TradeOrder:', order.id);

    return NextResponse.json({
      success: true,
      order,
      message: `Order created for ${setup.symbol} - Ready for MT5 execution`
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
