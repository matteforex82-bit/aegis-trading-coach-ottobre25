import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * DELETE /api/admin/trading-setups/delete
 * Elimina setup multipli
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify admin role
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { setupIds } = body;

    if (!setupIds || !Array.isArray(setupIds) || setupIds.length === 0) {
      return NextResponse.json({ error: 'No setup IDs provided' }, { status: 400 });
    }

    console.log('[Admin] Deleting setups:', setupIds);

    // Delete setups
    const result = await prisma.tradingSetup.deleteMany({
      where: {
        id: {
          in: setupIds
        }
      }
    });

    console.log('[Admin] Deleted', result.count, 'setups');

    return NextResponse.json({
      success: true,
      deletedCount: result.count,
      message: `${result.count} setup(s) eliminati`
    });

  } catch (error: any) {
    console.error('[Admin] Delete error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete setups',
        message: error.message
      },
      { status: 500 }
    );
  }
}
