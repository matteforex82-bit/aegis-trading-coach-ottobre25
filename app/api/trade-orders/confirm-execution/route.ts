import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

/**
 * POST /api/trade-orders/confirm-execution
 *
 * MT5 EA calls this after successfully executing an order
 *
 * Body: {
 *   orderId: string,
 *   mt5Ticket: string,
 *   executionPrice: number,
 *   executionTime: string (ISO datetime),
 *   status: "ACTIVE" | "FAILED",
 *   failureReason?: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
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

    let apiKeyRecord = null;
    for (const keyRecord of activeKeys) {
      const isMatch = await bcrypt.compare(apiKey, keyRecord.key);
      if (isMatch) {
        apiKeyRecord = keyRecord;
        break;
      }
    }

    if (!apiKeyRecord) {
      return NextResponse.json(
        { error: 'Invalid or inactive API Key' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      orderId,
      mt5Ticket,
      executionPrice,
      executionTime,
      status,
      failureReason,
    } = body;

    // Validate required fields
    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, status' },
        { status: 400 }
      );
    }

    // Find the order
    const order = await db.tradeOrder.findUnique({
      where: { id: orderId },
      include: { account: true },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (order.account.userId !== apiKeyRecord.userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Update order with execution details
    const updatedOrder = await db.tradeOrder.update({
      where: { id: orderId },
      data: {
        status: status, // ACTIVE or FAILED
        mt5Ticket: mt5Ticket || null,
        executionPrice: executionPrice || null,
        executionTime: executionTime ? new Date(executionTime) : null,
        mt5LastSync: new Date(),
        failureReason: failureReason || null,
        executedAt: status === 'ACTIVE' ? new Date() : null,
      },
    });

    // Create alert for user
    if (status === 'ACTIVE') {
      await db.alert.create({
        data: {
          accountId: order.accountId,
          type: 'TRADE_EXECUTED',
          severity: 'INFO',
          title: `Trade Executed: ${order.symbol}`,
          message: `${order.direction} ${order.lotSize} lots of ${order.symbol} executed at ${executionPrice}`,
          metadata: {
            orderId: order.id,
            mt5Ticket: mt5Ticket,
            executionPrice: executionPrice,
          },
        },
      });
    } else if (status === 'FAILED') {
      await db.alert.create({
        data: {
          accountId: order.accountId,
          type: 'EXECUTION_FAILED',
          severity: 'WARNING',
          title: `Trade Execution Failed: ${order.symbol}`,
          message: failureReason || 'Unknown error',
          metadata: {
            orderId: order.id,
            failureReason: failureReason,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      order: {
        id: updatedOrder.id,
        status: updatedOrder.status,
        mt5Ticket: updatedOrder.mt5Ticket,
      },
    });

  } catch (error: any) {
    console.error('[Confirm Execution API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
