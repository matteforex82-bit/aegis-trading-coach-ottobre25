import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/admin/symbols/mapping
 *
 * Create or update a symbol mapping (standard → broker symbol)
 * Both admin and regular users can create mappings for their own accounts
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { accountId, standardSymbol, brokerSymbol, category, confidence } = body;

    if (!accountId || !standardSymbol || !brokerSymbol) {
      return NextResponse.json(
        { error: 'accountId, standardSymbol, and brokerSymbol are required' },
        { status: 400 }
      );
    }

    // Verify account access
    const account = await prisma.tradingAccount.findFirst({
      where: {
        id: accountId,
        userId: session.user.id,
      },
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN';

    // If not admin, must own the account
    if (!account && !isAdmin) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 404 }
      );
    }

    // Verify broker symbol exists in specs
    const brokerSpec = await prisma.brokerSymbolSpec.findUnique({
      where: {
        accountId_symbol: {
          accountId: accountId,
          symbol: brokerSymbol,
        },
      },
    });

    if (!brokerSpec) {
      return NextResponse.json(
        {
          error: 'Broker symbol not found',
          message: `Symbol "${brokerSymbol}" does not exist on this broker. Please sync symbols from MT5 first.`,
        },
        { status: 400 }
      );
    }

    // Create or update mapping
    const mapping = await prisma.symbolMapping.upsert({
      where: {
        standardSymbol_accountId: {
          standardSymbol: standardSymbol.toUpperCase(),
          accountId: accountId,
        },
      },
      create: {
        accountId: accountId,
        standardSymbol: standardSymbol.toUpperCase(),
        brokerSymbol: brokerSymbol,
        category: category || null,
        confidence: confidence || 1.0,
        source: 'manual',
        createdBy: session.user.id,
      },
      update: {
        brokerSymbol: brokerSymbol,
        category: category || undefined,
        confidence: confidence || 1.0,
        source: 'manual',
      },
    });

    console.log(
      `[Symbol Mapping] Created/Updated mapping: ${standardSymbol} → ${brokerSymbol} for account ${accountId}`
    );

    return NextResponse.json({
      success: true,
      mapping: mapping,
      message: `Mapping created: ${standardSymbol} → ${brokerSymbol}`,
    });
  } catch (error: any) {
    console.error('[Symbol Mapping] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create symbol mapping',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/symbols/mapping
 *
 * Delete a symbol mapping
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('id');
    const accountId = searchParams.get('accountId');
    const standardSymbol = searchParams.get('standardSymbol');

    if (!mappingId && (!accountId || !standardSymbol)) {
      return NextResponse.json(
        { error: 'Either id or (accountId + standardSymbol) is required' },
        { status: 400 }
      );
    }

    // Find mapping
    let mapping;
    if (mappingId) {
      mapping = await prisma.symbolMapping.findUnique({
        where: { id: mappingId },
        include: { account: true },
      });
    } else {
      mapping = await prisma.symbolMapping.findUnique({
        where: {
          standardSymbol_accountId: {
            standardSymbol: standardSymbol!.toUpperCase(),
            accountId: accountId!,
          },
        },
        include: { account: true },
      });
    }

    if (!mapping) {
      return NextResponse.json({ error: 'Mapping not found' }, { status: 404 });
    }

    // Verify access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    const isAdmin = user?.role === 'ADMIN';
    const ownsAccount = mapping.account.userId === session.user.id;

    if (!isAdmin && !ownsAccount) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Delete mapping
    await prisma.symbolMapping.delete({
      where: { id: mapping.id },
    });

    console.log(`[Symbol Mapping] Deleted mapping: ${mapping.standardSymbol} → ${mapping.brokerSymbol}`);

    return NextResponse.json({
      success: true,
      message: `Mapping deleted: ${mapping.standardSymbol} → ${mapping.brokerSymbol}`,
    });
  } catch (error: any) {
    console.error('[Symbol Mapping Delete] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to delete symbol mapping',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
