import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * DELETE /api/trade-orders/delete-all-pending
 *
 * Emergency endpoint to delete all PENDING orders for current user
 * Useful when orders were created with bugs and need to be regenerated
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all user's trading accounts
    const accounts = await prisma.tradingAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true },
    });

    const accountIds = accounts.map(acc => acc.id);

    // Delete all PENDING orders
    const deleteResult = await prisma.tradeOrder.deleteMany({
      where: {
        accountId: { in: accountIds },
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted ${deleteResult.count} pending orders`,
      deletedCount: deleteResult.count,
    });
  } catch (error: any) {
    console.error('Delete all pending orders error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
