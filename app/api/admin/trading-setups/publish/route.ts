import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/admin/trading-setups/publish
 * Pubblica/depubblica setup in Trading Room
 */
export async function POST(request: NextRequest) {
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
    const { setupIds, isActive } = body;

    if (!setupIds || !Array.isArray(setupIds) || setupIds.length === 0) {
      return NextResponse.json({ error: 'No setup IDs provided' }, { status: 400 });
    }

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be boolean' }, { status: 400 });
    }

    console.log('[Admin] Publishing setups:', { setupIds, isActive });

    // Update setups
    const result = await prisma.tradingSetup.updateMany({
      where: {
        id: {
          in: setupIds
        }
      },
      data: {
        isActive: isActive,
        publishedAt: isActive ? new Date() : undefined
      }
    });

    console.log('[Admin] Updated', result.count, 'setups');

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      message: isActive
        ? `${result.count} setup(s) pubblicati in Trading Room`
        : `${result.count} setup(s) rimossi da Trading Room`
    });

  } catch (error: any) {
    console.error('[Admin] Publish error:', error);
    return NextResponse.json(
      {
        error: 'Failed to publish setups',
        message: error.message
      },
      { status: 500 }
    );
  }
}
