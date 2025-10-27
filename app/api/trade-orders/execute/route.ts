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
    const { orderIds } = body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: 'Order IDs required' },
        { status: 400 }
      );
    }

    // Verify ownership and get orders
    const orders = await prisma.tradeOrder.findMany({
      where: {
        id: { in: orderIds },
        account: {
          userId: session.user.id,
        },
        status: 'PENDING',
      },
      include: {
        account: true,
      },
    });

    if (orders.length === 0) {
      return NextResponse.json(
        { error: 'No valid orders found' },
        { status: 404 }
      );
    }

    // Update orders to EXECUTED status
    // In a real implementation, this would:
    // 1. Send orders to MT5 via Expert Advisor
    // 2. Wait for confirmation
    // 3. Update status based on MT5 response
    //
    // For now, we'll just mark them as EXECUTED
    const updatedOrders = await Promise.all(
      orders.map((order) =>
        prisma.tradeOrder.update({
          where: { id: order.id },
          data: {
            status: 'EXECUTED',
            executedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${updatedOrders.length} orders`,
      executedCount: updatedOrders.length,
      orders: updatedOrders,
    });
  } catch (error: any) {
    console.error('Execute trade orders error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
