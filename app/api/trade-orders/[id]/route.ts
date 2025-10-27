import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const orderId = params.id;

    // Verify ownership
    const order = await prisma.tradeOrder.findUnique({
      where: { id: orderId },
      include: {
        account: {
          select: { userId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only cancel pending orders' },
        { status: 400 }
      );
    }

    // Delete the order
    await prisma.tradeOrder.delete({
      where: { id: orderId },
    });

    return NextResponse.json({
      success: true,
      message: 'Order canceled successfully',
    });
  } catch (error: any) {
    console.error('Cancel trade order error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
