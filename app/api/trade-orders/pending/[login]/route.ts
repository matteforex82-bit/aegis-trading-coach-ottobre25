import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * GET /api/trade-orders/pending/{login}
 *
 * MT5 EA polls this endpoint to get pending orders for execution
 *
 * Authentication: X-API-Key header
 * Returns: Array of APPROVED orders ready for MT5 execution
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ login: string }> }
) {
  try {
    const params = await context.params;
    const accountLogin = params.login;

    // Authenticate via API Key
    const apiKey = request.headers.get('X-API-Key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API Key required' },
        { status: 401 }
      );
    }

    // Verify API key exists and is active
    // Get all active API keys and compare with bcrypt
    const activeKeys = await db.apiKey.findMany({
      where: { isActive: true },
    });

    console.log(`[MT5 Auth] Checking ${activeKeys.length} active API keys`);
    console.log(`[MT5 Auth] Incoming key: ${apiKey.substring(0, 20)}...`);

    let apiKeyRecord = null;
    for (const keyRecord of activeKeys) {
      console.log(`[MT5 Auth] Comparing with key: ${keyRecord.name}`);
      const isMatch = await bcrypt.compare(apiKey, keyRecord.key);
      console.log(`[MT5 Auth] Match result: ${isMatch}`);
      if (isMatch) {
        apiKeyRecord = keyRecord;
        break;
      }
    }

    if (!apiKeyRecord) {
      console.log('[MT5 Auth] No matching API key found');
      return NextResponse.json(
        { error: 'Invalid or inactive API Key' },
        { status: 401 }
      );
    }

    console.log(`[MT5 Auth] Authenticated successfully with key: ${apiKeyRecord.name}`);

    // Update last used timestamp
    await db.apiKey.update({
      where: { id: apiKeyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    // Find trading account
    const tradingAccount = await db.tradingAccount.findFirst({
      where: {
        login: accountLogin,
        userId: apiKeyRecord.userId,
        deletedAt: null,
      },
    });

    if (!tradingAccount) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    // Get all APPROVED orders (ready for execution)
    const pendingOrders = await db.tradeOrder.findMany({
      where: {
        accountId: tradingAccount.id,
        status: 'APPROVED', // Only APPROVED orders
      },
      orderBy: {
        createdAt: 'asc', // Oldest first
      },
    });

    // Format orders for MT5 EA
    const formattedOrders = pendingOrders.map(order => ({
      orderId: order.id,
      symbol: order.symbol,
      direction: order.direction, // BUY or SELL
      orderType: order.orderType, // MARKET, BUY_LIMIT, SELL_LIMIT, etc.
      lotSize: order.lotSize,
      entryPrice: order.entryPrice,
      stopLoss: order.stopLoss,
      takeProfit1: order.takeProfit1,
      takeProfit2: order.takeProfit2,
      takeProfit3: order.takeProfit3,
      comment: order.comment || 'AEGIS Trade',
      magicNumber: order.magicNumber || 999001,
      invalidationPrice: order.invalidationPrice,
    }));

    return NextResponse.json({
      success: true,
      accountLogin,
      orderCount: formattedOrders.length,
      orders: formattedOrders,
    });

  } catch (error: any) {
    console.error('[MT5 Pending Orders API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
