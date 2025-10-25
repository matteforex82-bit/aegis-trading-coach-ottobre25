import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * GET /api/alerts
 *
 * Returns alerts for the user's accounts
 *
 * Query params:
 * - accountId: (optional) Filter by specific account
 * - unreadOnly: true to return only unread alerts
 * - limit: Number of alerts to return (default 50)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const unreadOnly = searchParams.get('unreadOnly') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    // Build query
    const where: any = {
      account: {
        userId: session.user.id,
      },
      isDismissed: false,
    };

    if (accountId) {
      where.accountId = accountId;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        account: {
          select: {
            id: true,
            login: true,
            broker: true,
          },
        },
      },
    });

    // Count unread
    const unreadCount = await prisma.alert.count({
      where: {
        account: {
          userId: session.user.id,
        },
        isRead: false,
        isDismissed: false,
      },
    });

    return NextResponse.json({
      alerts,
      unreadCount,
      total: alerts.length,
    });
  } catch (error: any) {
    console.error('Error fetching alerts:', error);
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
 * POST /api/alerts
 *
 * Creates a new alert
 *
 * Body:
 * - accountId: Trading account ID
 * - type: Alert type
 * - severity: INFO, WARNING, CRITICAL
 * - title: Alert title
 * - message: Alert message
 * - metadata: (optional) Additional data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, type, severity, title, message, metadata } = body;

    if (!accountId || !type || !severity || !title || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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

    // Create alert
    const alert = await prisma.alert.create({
      data: {
        accountId,
        type,
        severity,
        title,
        message,
        metadata: metadata || {},
      },
    });

    console.log(`🔔 Alert created: ${severity} - ${title}`);

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    console.error('Error creating alert:', error);
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
 * PATCH /api/alerts
 *
 * Updates alert status (mark as read/dismissed)
 *
 * Body:
 * - alertId: Alert ID
 * - action: 'read' | 'dismiss'
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { alertId, action } = body;

    if (!alertId || !action) {
      return NextResponse.json(
        { error: 'Missing alertId or action' },
        { status: 400 }
      );
    }

    // Verify ownership
    const alert = await prisma.alert.findUnique({
      where: { id: alertId },
      include: { account: true },
    });

    if (!alert || alert.account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Alert not found or unauthorized' },
        { status: 403 }
      );
    }

    // Update based on action
    const updateData: any = {};

    if (action === 'read') {
      updateData.isRead = true;
      updateData.readAt = new Date();
    } else if (action === 'dismiss') {
      updateData.isDismissed = true;
      updateData.dismissedAt = new Date();
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Use "read" or "dismiss"' },
        { status: 400 }
      );
    }

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      alert: updatedAlert,
    });
  } catch (error: any) {
    console.error('Error updating alert:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
