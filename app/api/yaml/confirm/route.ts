import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, orders } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'No account ID provided' }, { status: 400 });
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    // Verify account ownership
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    // Create trade orders in database
    const createdOrders = await Promise.all(
      orders.map((order: any) =>
        prisma.tradeOrder.create({
          data: {
            accountId: accountId,
            symbol: order.symbol,
            direction: order.direction,
            orderType: order.orderType,
            type: order.direction, // Legacy field
            entryPrice: order.entryPrice,
            stopLoss: order.stopLoss,
            takeProfit1: order.takeProfit1,
            takeProfit2: order.takeProfit2,
            takeProfit3: order.takeProfit3,
            riskAmount: order.riskAmount,
            riskPercent: 1.0, // Default 1%
            lotSize: order.lotSize,
            status: 'PENDING',
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      createdCount: createdOrders.length,
      orders: createdOrders,
    });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create orders',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
