import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

/**
 * GET /api/mt5/pending-orders
 *
 * Returns pending TradeOrders for a specific MT5 account
 * Used by AegisExecutionController.mq5 to poll orders for execution
 *
 * Query params:
 * - accountLogin: MT5 account login number
 *
 * Authentication: X-API-Key header (MT5 API key)
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate via API Key
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API Key' },
        { status: 401 }
      );
    }

    // 2. Get accountLogin from query
    const { searchParams } = new URL(request.url);
    const accountLogin = searchParams.get('accountLogin');

    if (!accountLogin) {
      return NextResponse.json(
        { error: 'Missing accountLogin parameter' },
        { status: 400 }
      );
    }

    // 3. Verify API key and find account
    const account = await prisma.tradingAccount.findFirst({
      where: {
        login: accountLogin,
        mt5ApiKey: apiKey, // Verify API key matches
      },
      include: {
        challengeSetup: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key or account not found' },
        { status: 403 }
      );
    }

    // 4. Get pending orders for this account
    const pendingOrders = await prisma.tradeOrder.findMany({
      where: {
        accountId: account.id,
        status: {
          in: ['PENDING', 'APPROVED'],
        },
        mt5Status: null, // Not yet sent to MT5
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    // 5. Format orders for MT5 EA
    const formattedOrders = pendingOrders.map((order) => ({
      orderId: order.id,
      symbol: order.symbol,
      direction: order.direction, // BUY or SELL
      orderType: order.orderType, // BUY_LIMIT, SELL_LIMIT, etc
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit1 || 0, // Use TP1 as primary TP
      lotSize: order.lotSize,
      invalidationPrice: order.invalidationPrice || 0,
      invalidationRule: order.invalidationRule || '',
      isLocked: order.isLocked,
      yamlAssetId: order.yamlAssetId,
      createdAt: order.createdAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      ordersCount: formattedOrders.length,
      orders: formattedOrders,
      accountInfo: {
        id: account.id,
        login: account.login,
        broker: account.broker,
        challengeActive: !!account.challengeSetup,
      },
    });
  } catch (error: any) {
    console.error('Error fetching pending orders:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
