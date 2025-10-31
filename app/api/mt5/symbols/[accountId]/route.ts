import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * GET /api/mt5/symbols/[accountId]
 *
 * Get all broker symbol specifications for a specific trading account
 * Requires user to own the account or be admin
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ accountId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accountId } = await params;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID required' }, { status: 400 });
    }

    // Verify account access
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    if (!account) {
      // Check if admin
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true },
      });

      if (!user || user.role !== 'ADMIN') {
        return NextResponse.json(
          { error: 'Account not found or unauthorized' },
          { status: 404 }
        );
      }

      // Admin can access any account - verify it exists
      const adminAccount = await prisma.tradingAccount.findUnique({
        where: { id: accountId },
      });

      if (!adminAccount) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
      }
    }

    // Get all symbol specifications
    const specs = await prisma.brokerSymbolSpec.findMany({
      where: {
        accountId: accountId,
      },
      orderBy: {
        symbol: 'asc',
      },
    });

    // Get all symbol mappings
    const mappings = await prisma.symbolMapping.findMany({
      where: {
        accountId: accountId,
      },
      orderBy: {
        standardSymbol: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      account: {
        id: account?.id,
        login: account?.login,
        broker: account?.broker,
      },
      symbols: specs,
      mappings: mappings,
      stats: {
        totalSymbols: specs.length,
        totalMappings: mappings.length,
        lastSync: specs.length > 0 ? specs[0].lastUpdated : null,
      },
    });
  } catch (error: any) {
    console.error('[MT5 Symbols Get] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch symbols',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
