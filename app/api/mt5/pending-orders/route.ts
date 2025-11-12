import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKeyDirect } from '@/lib/mt5-auth';

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
    // 1. Authenticate via API Key using direct authentication
    const account = await verifyMT5ApiKeyDirect(request);

    if (!account) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 403 }
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

    // 3. Verify the account login matches the authenticated account
    if (account.login !== accountLogin) {
      return NextResponse.json(
        { error: 'Account login does not match API key' },
        { status: 403 }
      );
    }

    // Get challenge setup if exists
    const challengeSetup = await prisma.challengeSetup.findUnique({
      where: { accountId: account.id },
    });

    // 4. Get pending orders for this account
    console.log(`[MT5 Pending Orders] Fetching orders for account ${accountLogin}`);
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

    console.log(`[MT5 Pending Orders] Found ${pendingOrders.length} pending orders`);
    pendingOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.symbol} ${order.direction} ${order.orderType} - Status: ${order.status}, Lots: ${order.lotSize}`);
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

    const response = {
      success: true,
      ordersCount: formattedOrders.length,
      orders: formattedOrders,
      accountInfo: {
        id: account.id,
        login: account.login,
        broker: account.broker,
        challengeActive: !!challengeSetup,
      },
    };

    console.log(`[MT5 Pending Orders] Returning ${formattedOrders.length} orders to EA`);

    // CRITICAL FIX: MQL5 parser bug at line 785 uses offset +15 instead of +14
    // The string "ordersCount": is 14 chars, but code reads position 15
    // Solution: Add space before the number to match the incorrect offset
    // Example: "ordersCount": 8 (with space) so position 15 reads "8"
    const jsonStr = JSON.stringify(response);
    const fixedJson = jsonStr.replace(/"ordersCount":(\d+)/, '"ordersCount": $1');

    console.log(`[MT5 Pending Orders] Response JSON length: ${fixedJson.length} bytes`);
    console.log(`[MT5 Pending Orders] ordersCount field: ${fixedJson.match(/"ordersCount":\s*\d+/)?.[0]}`);

    return new NextResponse(fixedJson, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
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
