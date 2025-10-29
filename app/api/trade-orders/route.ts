import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's trading accounts
    const accounts = await prisma.tradingAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const accountIds = accounts.map(a => a.id);

    // Get all trade orders for user's accounts
    const orders = await prisma.tradeOrder.findMany({
      where: {
        accountId: { in: accountIds },
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        account: {
          select: {
            login: true,
            broker: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        id: order.id,
        symbol: order.symbol,
        direction: order.direction, // Use direction field, not orderType
        orderType: order.orderType, // Also include orderType
        entryPrice: order.entryPrice,
        stopLoss: order.stopLoss,
        takeProfit1: order.takeProfit1,
        takeProfit2: order.takeProfit2,
        takeProfit3: order.takeProfit3,
        riskAmount: order.riskAmount,
        lotSize: order.lotSize,
        status: order.status,
        createdAt: order.createdAt,
        account: order.account,
      })),
    });
  } catch (error: any) {
    console.error('Get trade orders error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
