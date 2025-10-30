import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, orders } = body;

    console.log('[YAML Confirm] Received request:', {
      accountId,
      ordersCount: orders?.length,
      firstOrder: orders?.[0]
    });

    if (!accountId) {
      return NextResponse.json({ error: 'No account ID provided' }, { status: 400 });
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      return NextResponse.json({ error: 'No orders provided' }, { status: 400 });
    }

    // Verify account ownership
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json({ error: 'Account not found or unauthorized' }, { status: 404 });
    }

    // Create TradingSetup entries (Elliott Wave signals)
    // These are signals/analysis, NOT immediate MT5 orders
    const createdSetups = await Promise.all(
      orders.map(async (order: any) => {
        console.log('[YAML Confirm] Creating setup:', {
          symbol: order.symbol,
          category: order.category,
          hasEntry: !!order.entryPrice,
          hasStop: !!order.stopLoss,
          hasTarget: !!order.targetArea
        });

        // Parse analysisDate - handle both string and Date
        let analysisDate = new Date();
        if (order.analysisDate) {
          const parsed = new Date(order.analysisDate);
          if (!isNaN(parsed.getTime())) {
            analysisDate = parsed;
          }
        }

        return prisma.tradingSetup.create({
          data: {
            // Required fields
            category: order.category || 'FOREX',
            symbol: order.symbol,
            direction: order.direction,
            timeframe: order.timeframe || 'Daily',
            analysisDate: analysisDate,

            // Elliott Wave fields
            wavePattern: order.wavePattern || null,
            waveCount: order.waveCount || null,

            // Price levels (all optional for analysis-only setups)
            entryPrice: order.entryPrice || null,
            stopLoss: order.stopLoss || null,
            takeProfit1: order.takeProfit1 || null,
            takeProfit2: order.takeProfit2 || null,
            takeProfit3: order.takeProfit3 || null,
            invalidation: order.invalidation || null,
            targetArea: order.targetArea || null,

            // Analysis details
            confidence: order.confidence || null,
            analysis: order.analysis || null,
            notes: order.notes || null,

            // Premium control
            isPremium: true,
            requiredPlan: 'PRO',

            // Active by default
            isActive: true,
          },
        });
      })
    );

    console.log('[YAML Confirm] Successfully created', createdSetups.length, 'setups');

    return NextResponse.json({
      success: true,
      createdCount: createdSetups.length,
      setups: createdSetups,
    });
  } catch (error: any) {
    console.error('[YAML Confirm] Error creating setups:', error);
    return NextResponse.json(
      {
        error: 'Failed to create trading setups',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
