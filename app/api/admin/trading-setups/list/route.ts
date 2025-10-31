import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * GET /api/admin/trading-setups/list
 * Lista TUTTI i trading setups per admin (anche non pubblicati)
 */
export async function GET(request: NextRequest) {
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

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const category = searchParams.get('category');

    // Build where clause
    const where: any = {};

    if (isActive !== null && isActive !== '') {
      where.isActive = isActive === 'true';
    }

    if (category) {
      where.category = category;
    }

    // Fetch ALL setups (no isActive filter by default)
    const setups = await prisma.tradingSetup.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('[Admin Trading Setups] Fetched', setups.length, 'setups');

    return NextResponse.json({
      success: true,
      setups,
      count: setups.length
    });

  } catch (error: any) {
    console.error('[Admin Trading Setups] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch trading setups',
        message: error.message
      },
      { status: 500 }
    );
  }
}
