import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * GET /api/dashboard/pnl-snapshot
 *
 * Returns the latest P&L snapshot (or creates one if needed)
 * Used for 4h refresh P&L dashboard
 *
 * Query params:
 * - accountId: Trading account ID
 * - reveal: true to force real-time P&L (creates manual reveal snapshot)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const reveal = searchParams.get('reveal') === 'true';

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId parameter' },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 403 }
      );
    }

    // If reveal requested, create real-time snapshot
    if (reveal) {
      const newSnapshot = await prisma.pnLSnapshot.create({
        data: {
          accountId,
          balance: account.currentBalance,
          equity: account.equity || account.currentBalance,
          profit: account.profit,
          drawdown: account.drawdown,
          dailyPnL: account.dailyDrawdown || 0,
          isManualReveal: true,
        },
      });

      return NextResponse.json({
        snapshot: newSnapshot,
        isRealTime: true,
        message: 'Real-time P&L revealed',
      });
    }

    // Get latest snapshot (within last 4 hours)
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);

    let latestSnapshot = await prisma.pnLSnapshot.findFirst({
      where: {
        accountId,
        snapshotTime: {
          gte: fourHoursAgo,
        },
      },
      orderBy: {
        snapshotTime: 'desc',
      },
    });

    // If no recent snapshot, create one
    if (!latestSnapshot) {
      latestSnapshot = await prisma.pnLSnapshot.create({
        data: {
          accountId,
          balance: account.currentBalance,
          equity: account.equity || account.currentBalance,
          profit: account.profit,
          drawdown: account.drawdown,
          dailyPnL: account.dailyDrawdown || 0,
          isManualReveal: false,
        },
      });
    }

    // Calculate next update time
    const nextUpdateTime = new Date(
      latestSnapshot.snapshotTime.getTime() + 4 * 60 * 60 * 1000
    );

    return NextResponse.json({
      snapshot: latestSnapshot,
      nextUpdate: nextUpdateTime,
      canReveal: true,
      isRealTime: false,
    });
  } catch (error: any) {
    console.error('Error fetching P&L snapshot:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/dashboard/pnl-snapshot
 *
 * Creates a new P&L snapshot (called by cron job or manual trigger)
 *
 * Body:
 * - accountId: Trading account ID
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'Missing accountId' },
        { status: 400 }
      );
    }

    // Verify ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 403 }
      );
    }

    // Create snapshot
    const snapshot = await prisma.pnLSnapshot.create({
      data: {
        accountId,
        balance: account.currentBalance,
        equity: account.equity || account.currentBalance,
        profit: account.profit,
        drawdown: account.drawdown,
        dailyPnL: account.dailyDrawdown || 0,
        isManualReveal: false,
      },
    });

    return NextResponse.json({
      success: true,
      snapshot,
    });
  } catch (error: any) {
    console.error('Error creating P&L snapshot:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
