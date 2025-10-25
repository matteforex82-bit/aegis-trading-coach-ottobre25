import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/mt5/order-closed
 *
 * Called by MT5 EA when a position is closed
 * Updates TradeOrder with close details and final P&L
 *
 * Body:
 * - mt5Ticket: MT5 ticket number
 * - closeReason: INVALIDATION_TRIGGERED, TAKE_PROFIT, STOP_LOSS, MANUAL, etc
 * - closePrice: Actual close price
 * - finalPnL: Final profit/loss in account currency
 * - closeTime: ISO timestamp (optional)
 *
 * Authentication: X-API-Key header
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API Key' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const { mt5Ticket, closeReason, closePrice, finalPnL, closeTime } = body;

    if (!mt5Ticket || !closeReason) {
      return NextResponse.json(
        { error: 'Missing required fields: mt5Ticket, closeReason' },
        { status: 400 }
      );
    }

    // 3. Find the order by MT5 ticket
    const order = await prisma.tradeOrder.findFirst({
      where: {
        mt5Ticket: mt5Ticket.toString(),
      },
      include: {
        account: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found with this MT5 ticket' },
        { status: 404 }
      );
    }

    // 4. Verify API key
    if (order.account.mt5ApiKey !== apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized: API key mismatch' },
        { status: 403 }
      );
    }

    // 5. Update order with close details
    const updatedOrder = await prisma.tradeOrder.update({
      where: { id: order.id },
      data: {
        status: 'CLOSED',
        mt5Status: 'CLOSED',
        closeReason,
        closePrice: closePrice || 0,
        finalPnL: finalPnL || 0,
        closedAt: closeTime ? new Date(closeTime) : new Date(),
        mt5LastSync: new Date(),
      },
    });

    // 6. Log invalidation event if applicable
    if (closeReason === 'INVALIDATION_TRIGGERED') {
      await prisma.violationLog.create({
        data: {
          accountId: order.accountId,
          violationType: 'INVALIDATION_TRIGGERED',
          description: `Position ${order.symbol} closed due to Elliott Wave invalidation at price ${closePrice}. Original invalidation: ${order.invalidationPrice}`,
          actionTaken: 'POSITION_CLOSED',
          severity: 'INFO',
          metadata: {
            orderId: order.id,
            mt5Ticket,
            invalidationPrice: order.invalidationPrice,
            closePrice,
            finalPnL,
          },
        },
      });

      console.log(`⚠️  Invalidation triggered: ${order.symbol} closed at ${closePrice} (P&L: $${finalPnL})`);
    }

    console.log(`✅ Order ${order.id} closed on MT5 (Reason: ${closeReason}, P&L: $${finalPnL})`);

    return NextResponse.json({
      success: true,
      message: 'Order close recorded',
      order: {
        id: updatedOrder.id,
        symbol: updatedOrder.symbol,
        status: updatedOrder.status,
        closeReason: updatedOrder.closeReason,
        finalPnL: updatedOrder.finalPnL,
      },
    });
  } catch (error: any) {
    console.error('Error recording order close:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
