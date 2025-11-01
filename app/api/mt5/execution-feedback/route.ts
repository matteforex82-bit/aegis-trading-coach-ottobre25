import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { verifyMT5ApiKeyDirect } from '@/lib/mt5-auth';

/**
 * POST /api/mt5/execution-feedback
 *
 * Receives execution feedback from MT5 EA after order execution
 * Updates TradeOrder with actual execution details
 *
 * Request body:
 * {
 *   orderId: "abc123",
 *   status: "EXECUTED" | "FAILED",
 *   mt5Ticket: "12345678",
 *   calculatedVolume: 0.15,
 *   actualRisk: 980.50,
 *   actualRiskPercent: 0.98,
 *   swapCost5Day: -2.50,
 *   swapCost10Day: -5.00,
 *   executionPrice: 1.09001,
 *   executedAt: "2025-11-01T12:00:00Z",
 *   failureReason: "" | "error message"
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
      orderId,
      status,
      mt5Ticket,
      calculatedVolume,
      actualRisk,
      actualRiskPercent,
      swapCost5Day,
      swapCost10Day,
      executionPrice,
      executedAt,
      failureReason,
    } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Invalid request', message: 'orderId is required' },
        { status: 400 }
      );
    }

    console.log(`[MT5 Execution Feedback] Order ${orderId} - Status: ${status}`);

    // Find the order
    const order = await prisma.tradeOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found', message: `Order ${orderId} not found` },
        { status: 404 }
      );
    }

    // Verify order belongs to this account
    if (order.accountId !== account.id) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Order does not belong to this account' },
        { status: 403 }
      );
    }

    // Update order with execution details
    if (status === 'EXECUTED') {
      await prisma.tradeOrder.update({
        where: { id: orderId },
        data: {
          status: 'EXECUTED',
          mt5Status: 'FILLED',
          mt5Ticket: mt5Ticket,
          calculatedVolume: calculatedVolume,
          actualRisk: actualRisk,
          actualRiskPercent: actualRiskPercent,
          swapCost5Day: swapCost5Day,
          swapCost10Day: swapCost10Day,
          executionPrice: executionPrice,
          executedAt: executedAt ? new Date(executedAt) : new Date(),
          executionTime: new Date(),
          mt5LastSync: new Date(),
        },
      });

      console.log(
        `[MT5 Execution Feedback] ✅ Order ${orderId} executed - Ticket: ${mt5Ticket}, Volume: ${calculatedVolume}`
      );
    } else if (status === 'FAILED') {
      await prisma.tradeOrder.update({
        where: { id: orderId },
        data: {
          status: 'FAILED',
          mt5Status: 'REJECTED',
          failureReason: failureReason || 'Unknown error',
          mt5LastSync: new Date(),
        },
      });

      console.log(
        `[MT5 Execution Feedback] ❌ Order ${orderId} failed - Reason: ${failureReason}`
      );
    }

    return NextResponse.json({
      success: true,
      message: `Execution feedback received for order ${orderId}`,
    });
  } catch (error: any) {
    console.error('[MT5 Execution Feedback] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process execution feedback',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
