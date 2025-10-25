import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/mt5/order-executed
 *
 * Called by MT5 EA when an order is successfully executed
 * Updates TradeOrder with MT5 ticket number and execution details
 *
 * Body:
 * - orderId: AEGIS TradeOrder ID
 * - mt5Ticket: MT5 order ticket number
 * - executionPrice: Actual fill price
 * - executionTime: ISO timestamp
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
    const { orderId, mt5Ticket, executionPrice, executionTime } = body;

    if (!orderId || !mt5Ticket) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, mt5Ticket' },
        { status: 400 }
      );
    }

    // 3. Find the order
    const order = await prisma.tradeOrder.findUnique({
      where: { id: orderId },
      include: {
        account: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // 4. Verify API key belongs to this account
    if (order.account.mt5ApiKey !== apiKey) {
      return NextResponse.json(
        { error: 'Unauthorized: API key mismatch' },
        { status: 403 }
      );
    }

    // 5. Update order with MT5 execution details
    const updatedOrder = await prisma.tradeOrder.update({
      where: { id: orderId },
      data: {
        mt5Ticket: mt5Ticket.toString(),
        mt5Status: 'FILLED',
        status: 'ACTIVE',
        mt5LastSync: new Date(),
        // Store actual execution price if different from order price
        executionPrice: executionPrice || order.entryPrice,
        executionTime: executionTime ? new Date(executionTime) : new Date(),
      },
    });

    console.log(`✅ Order ${orderId} executed on MT5 with ticket #${mt5Ticket}`);

    return NextResponse.json({
      success: true,
      message: 'Order execution recorded',
      order: {
        id: updatedOrder.id,
        mt5Ticket: updatedOrder.mt5Ticket,
        status: updatedOrder.status,
        mt5Status: updatedOrder.mt5Status,
      },
    });
  } catch (error: any) {
    console.error('Error recording order execution:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
