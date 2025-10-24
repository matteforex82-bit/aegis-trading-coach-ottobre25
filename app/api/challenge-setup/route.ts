import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { validateSetup, calculateDerivedValues } from '@/lib/setup-validator';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const {
      accountId,
      challengeProvider,
      challengePhase,
      overRollMaxPercent,
      dailyMaxPercent,
      accountSize,
      userRiskPerTradePercent,
      userRiskPerAssetPercent,
      maxOrdersPerAsset,
      minTimeBetweenOrdersSec,
      pnlHideMode,
      pnlRefreshRateHours,
      orderLockEnabled,
      autoCloseInvalidation,
    } = body;

    // 3. Verify account ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true, challengeSetup: true },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access to account' }, { status: 403 });
    }

    if (account.challengeSetup) {
      return NextResponse.json(
        { error: 'Account already has a challenge setup' },
        { status: 400 }
      );
    }

    // 4. Validate setup
    const validation = validateSetup({
      accountSize,
      overRollMaxPercent,
      dailyMaxPercent,
      userRiskPerTradePercent,
      userRiskPerAssetPercent,
      maxOrdersPerAsset,
      minTimeBetweenOrdersSec,
    });

    if (!validation.isValid) {
      return NextResponse.json(
        {
          error: 'Invalid setup configuration',
          validationErrors: validation.errors,
        },
        { status: 400 }
      );
    }

    // 5. Calculate derived values
    const derived = calculateDerivedValues({
      accountSize,
      overRollMaxPercent,
      dailyMaxPercent,
      userRiskPerTradePercent,
      userRiskPerAssetPercent,
      maxOrdersPerAsset,
      minTimeBetweenOrdersSec,
    });

    // 6. Create challenge setup
    const challengeSetup = await prisma.challengeSetup.create({
      data: {
        accountId,
        challengeProvider,
        challengePhase,
        overRollMaxPercent,
        dailyMaxPercent,
        userRiskPerTradePercent,
        userRiskPerAssetPercent,
        maxOrdersPerAsset,
        minTimeBetweenOrdersSec,
        accountSize,
        dailyBudgetDollars: derived.dailyBudgetDollars,
        overRollBudgetDollars: derived.overRollBudgetDollars,
        maxTradeRiskDollars: derived.maxTradeRiskDollars,
        maxAssetAllocationDollars: derived.maxAssetAllocationDollars,
        pnlHideMode,
        pnlRefreshRateHours,
        orderLockEnabled,
        autoCloseInvalidation,
        isLocked: true, // Lock immediately after creation
      },
    });

    return NextResponse.json({
      status: 'success',
      message: 'Challenge setup activated successfully',
      challengeSetupId: challengeSetup.id,
      derived,
    });
  } catch (error: any) {
    console.error('Challenge setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve challenge setup for an account
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true },
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get challenge setup
    const challengeSetup = await prisma.challengeSetup.findUnique({
      where: { accountId },
    });

    if (!challengeSetup) {
      return NextResponse.json({ error: 'No challenge setup found' }, { status: 404 });
    }

    return NextResponse.json(challengeSetup);
  } catch (error: any) {
    console.error('Get challenge setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
