import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/mt5/violation-log
 *
 * Called by MT5 EA to log violations (FOMO attempts, manual modifications, etc)
 * Used for discipline tracking and scorecard generation
 *
 * Body:
 * - accountLogin: MT5 account login
 * - ticket: MT5 ticket (optional)
 * - violationType: MANUAL_SLTP_MODIFICATION_ATTEMPT, FOMO_ORDER_ATTEMPT, etc
 * - description: Human-readable description
 * - severity: INFO, WARNING, CRITICAL
 * - metadata: (optional) Additional data as JSON
 *
 * Authentication: X-API-Key header
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const apiKey = request.headers.get('x-api-key');

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API Key' },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      accountLogin,
      ticket,
      violationType,
      description,
      severity,
      metadata,
    } = body;

    if (!accountLogin || !violationType) {
      return NextResponse.json(
        { error: 'Missing required fields: accountLogin, violationType' },
        { status: 400 }
      );
    }

    // 3. Find account and verify API key
    const account = await prisma.tradingAccount.findFirst({
      where: {
        login: accountLogin,
        mt5ApiKey: apiKey,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid API key or account not found' },
        { status: 403 }
      );
    }

    // 4. Determine action taken based on violation type
    let actionTaken = 'LOGGED';

    if (violationType === 'MANUAL_SLTP_MODIFICATION_ATTEMPT') {
      actionTaken = 'BLOCKED_AND_RESTORED';
    } else if (violationType === 'FOMO_ORDER_ATTEMPT') {
      actionTaken = 'BLOCKED';
    } else if (violationType === 'DRAWDOWN_LIMIT_CRITICAL') {
      actionTaken = 'BLOCK_NEW_ORDERS';
    }

    // 5. Create violation log entry
    const violation = await prisma.violationLog.create({
      data: {
        accountId: account.id,
        violationType,
        description: description || `Violation: ${violationType}`,
        actionTaken,
        severity: severity || 'WARNING',
        metadata: metadata || {
          ticket: ticket?.toString(),
          timestamp: new Date().toISOString(),
        },
      },
    });

    // 6. Log to console for monitoring
    const severityEmoji: Record<string, string> = {
      INFO: 'ℹ️',
      WARNING: '⚠️',
      CRITICAL: '🚨',
    };
    const emoji = severityEmoji[severity || 'WARNING'] || '⚠️';

    console.log(
      `${emoji} Violation logged for ${accountLogin}: ${violationType} - ${description || 'No description'}`
    );

    // 7. Check if we should notify user (critical violations)
    if (severity === 'CRITICAL') {
      // TODO: Send notification (email, push, etc)
      console.log(`🚨 CRITICAL VIOLATION - User notification should be sent`);
    }

    return NextResponse.json({
      success: true,
      message: 'Violation logged',
      violation: {
        id: violation.id,
        type: violation.violationType,
        severity: violation.severity,
        actionTaken: violation.actionTaken,
        timestamp: violation.timestamp,
      },
    });
  } catch (error: any) {
    console.error('Error logging violation:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
