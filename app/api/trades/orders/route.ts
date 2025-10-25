import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/trades/orders
 *
 * Creates a new TradeOrder (pending execution)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      accountId,
      symbol,
      type, // BUY or SELL
      lotSize,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      takeProfit3,
      riskPercent,
      riskAmount,
      comment,
    } = body;

    // Validate required fields
    if (!accountId || !symbol || !type || !lotSize || !stopLoss || !riskPercent || !riskAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.tradingAccount.findUnique({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    // Create trade order
    const typeUpper = type.toUpperCase();
    const direction = typeUpper.includes('BUY') ? 'BUY' : 'SELL';
    const orderType = entryPrice ? `${direction}_LIMIT` : `${direction}_STOP`;

    const tradeOrder = await prisma.tradeOrder.create({
      data: {
        accountId,
        symbol: symbol.toUpperCase(),
        direction,
        orderType,
        type: typeUpper,
        lotSize: parseFloat(lotSize),
        entryPrice: entryPrice ? parseFloat(entryPrice) : null,
        stopLoss: parseFloat(stopLoss),
        takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : null,
        takeProfit2: takeProfit2 ? parseFloat(takeProfit2) : null,
        takeProfit3: takeProfit3 ? parseFloat(takeProfit3) : null,
        riskPercent: parseFloat(riskPercent),
        riskAmount: parseFloat(riskAmount),
        comment: comment || `AEGIS Trade - ${symbol}`,
        status: 'PENDING',
      },
    });

    return NextResponse.json({
      success: true,
      order: tradeOrder,
      message: 'Trade order created successfully. Waiting for EA execution.',
    }, { status: 201 });

  } catch (error) {
    console.error('Trade order creation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create trade order',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/trades/orders?accountId=xxx
 *
 * Gets all trade orders for an account
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status'); // PENDING, EXECUTED, FAILED, CANCELED

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    // Verify account ownership
    const account = await prisma.tradingAccount.findUnique({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    // Fetch orders
    const orders = await prisma.tradeOrder.findMany({
      where: {
        accountId,
        ...(status && { status: status as any }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    return NextResponse.json({
      orders,
      count: orders.length,
    });

  } catch (error) {
    console.error('Fetch orders error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch orders',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
