import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { convertMultipleAssetsToTradeOrders, YAMLAsset } from '@/lib/yaml-to-orders';

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request
    const body = await request.json();
    const { yamlAnalysisId, assetIndices, generateSecondaryEntry = true } = body;

    if (!yamlAnalysisId) {
      return NextResponse.json({ error: 'YAML Analysis ID required' }, { status: 400 });
    }

    // 3. Fetch YAML analysis
    const yamlAnalysis = await prisma.yAMLAnalysis.findUnique({
      where: { id: yamlAnalysisId },
      include: {
        account: {
          include: {
            challengeSetup: true,
          },
        },
      },
    });

    if (!yamlAnalysis) {
      return NextResponse.json({ error: 'YAML Analysis not found' }, { status: 404 });
    }

    // 4. Verify ownership
    if (yamlAnalysis.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    // 5. Check challenge setup exists
    if (!yamlAnalysis.account.challengeSetup) {
      return NextResponse.json({
        error: 'Challenge Setup Required',
        message: 'Please complete Challenge Setup before generating trade orders',
        redirectTo: '/dashboard/challenge-setup',
      }, { status: 400 });
    }

    // 6. Extract assets to convert
    const extractedAssets = yamlAnalysis.extractedAssets as any;
    let assetsToConvert: YAMLAsset[] = [];

    if (assetIndices && Array.isArray(assetIndices)) {
      // Convert specific assets only
      assetsToConvert = assetIndices.map((idx: number) => extractedAssets[idx]).filter(Boolean);
    } else {
      // Convert all assets
      assetsToConvert = extractedAssets;
    }

    if (assetsToConvert.length === 0) {
      return NextResponse.json({ error: 'No assets to convert' }, { status: 400 });
    }

    // 7. Convert assets to TradeOrders
    const conversionResult = convertMultipleAssetsToTradeOrders(assetsToConvert, {
      accountId: yamlAnalysis.accountId,
      yamlAnalysisId: yamlAnalysis.id,
      challengeSetup: yamlAnalysis.account.challengeSetup,
      accountBalance: yamlAnalysis.account.currentBalance,
      accountCurrency: yamlAnalysis.account.currency,
      generateSecondaryEntry,
    });

    if (!conversionResult.success) {
      return NextResponse.json({
        error: 'Conversion failed',
        errors: conversionResult.errors,
        warnings: conversionResult.warnings,
      }, { status: 400 });
    }

    // 8. Validate daily budget
    const currentDailyDrawdown = 0; // TODO: Calculate from today's trades
    const remainingDailyBudget =
      yamlAnalysis.account.challengeSetup.dailyBudgetDollars - currentDailyDrawdown;

    if (conversionResult.summary.totalRiskAmount > remainingDailyBudget) {
      return NextResponse.json({
        error: 'Daily Budget Exceeded',
        message: `Total risk $${conversionResult.summary.totalRiskAmount.toFixed(2)} exceeds remaining daily budget $${remainingDailyBudget.toFixed(2)}`,
        remainingBudget: remainingDailyBudget,
        requestedRisk: conversionResult.summary.totalRiskAmount,
      }, { status: 400 });
    }

    // 9. Create TradeOrders in database
    const createdOrders = await Promise.all(
      conversionResult.orders.map((orderData) =>
        prisma.tradeOrder.create({
          data: orderData as any,
        })
      )
    );

    // 10. Update YAML analysis review status
    await prisma.yAMLAnalysis.update({
      where: { id: yamlAnalysisId },
      data: {
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
        reviewNotes: `Generated ${createdOrders.length} trade orders`,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${createdOrders.length} trade orders`,
      orders: createdOrders,
      summary: conversionResult.summary,
      warnings: conversionResult.warnings,
    });
  } catch (error: any) {
    console.error('Generate orders error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

// GET endpoint to preview order generation without creating them
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yamlAnalysisId = searchParams.get('yamlAnalysisId');
    const generateSecondary = searchParams.get('generateSecondary') !== 'false';

    if (!yamlAnalysisId) {
      return NextResponse.json({ error: 'YAML Analysis ID required' }, { status: 400 });
    }

    // Fetch and validate
    const yamlAnalysis = await prisma.yAMLAnalysis.findUnique({
      where: { id: yamlAnalysisId },
      include: {
        account: {
          include: {
            challengeSetup: true,
          },
        },
      },
    });

    if (!yamlAnalysis) {
      return NextResponse.json({ error: 'YAML Analysis not found' }, { status: 404 });
    }

    if (yamlAnalysis.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!yamlAnalysis.account.challengeSetup) {
      return NextResponse.json({
        error: 'Challenge Setup Required',
        hasSetup: false,
      }, { status: 400 });
    }

    // Preview conversion
    const extractedAssets = yamlAnalysis.extractedAssets as unknown as YAMLAsset[];
    const conversionResult = convertMultipleAssetsToTradeOrders(extractedAssets, {
      accountId: yamlAnalysis.accountId,
      yamlAnalysisId: yamlAnalysis.id,
      challengeSetup: yamlAnalysis.account.challengeSetup,
      accountBalance: yamlAnalysis.account.currentBalance,
      accountCurrency: yamlAnalysis.account.currency,
      generateSecondaryEntry: generateSecondary,
    });

    return NextResponse.json({
      preview: true,
      success: conversionResult.success,
      ordersPreview: conversionResult.orders,
      summary: conversionResult.summary,
      errors: conversionResult.errors,
      warnings: conversionResult.warnings,
      challengeSetup: yamlAnalysis.account.challengeSetup,
    });
  } catch (error: any) {
    console.error('Preview orders error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}
