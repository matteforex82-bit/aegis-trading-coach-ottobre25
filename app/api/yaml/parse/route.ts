import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseYamlFile } from '@/lib/yaml-parser';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const accountId = formData.get('accountId') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!accountId) {
      return NextResponse.json({ error: 'No account ID provided' }, { status: 400 });
    }

    // Read file content
    const fileContent = await file.text();

    console.log('[YAML Parse] Starting parse for account:', accountId);

    // Use the comprehensive parser from lib/yaml-parser.ts
    const parseResult = parseYamlFile(fileContent);

    console.log('[YAML Parse] Result:', {
      success: parseResult.success,
      setupsCount: parseResult.setups.length,
      errorsCount: parseResult.errors.length
    });

    // If parsing failed or has validation errors, return detailed error info
    if (!parseResult.success || parseResult.errors.length > 0) {
      console.error('[YAML Parse] Validation errors:', parseResult.errors);

      return NextResponse.json({
        error: 'YAML parsing failed',
        message: `Found ${parseResult.errors.length} validation error(s)`,
        parseErrors: parseResult.errors.map(err => ({
          index: err.index,
          setupSymbol: err.setupSymbol,
          errors: err.errors.map(e => ({
            field: e.field,
            message: e.message,
            value: e.value
          }))
        })),
        metadata: parseResult.metadata
      }, { status: 400 });
    }

    // Convert ParsedTradingSetup[] to order preview format
    const orders = parseResult.setups.map((setup) => {
      // Determine order type based on whether we have execution prices or just analysis
      const hasExecutionPrices = setup.entryPrice != null && setup.stopLoss != null;

      return {
        symbol: setup.symbol,
        direction: setup.direction,
        orderType: hasExecutionPrices
          ? (setup.direction === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT')
          : 'ANALYSIS_ONLY',
        category: setup.category,
        timeframe: setup.timeframe,
        wavePattern: setup.wavePattern,
        waveCount: setup.waveCount,
        entryPrice: setup.entryPrice,
        stopLoss: setup.stopLoss,
        takeProfit1: setup.takeProfit1,
        takeProfit2: setup.takeProfit2,
        takeProfit3: setup.takeProfit3,
        invalidation: setup.invalidation,
        targetArea: setup.targetArea,
        confidence: setup.confidence,
        analysis: setup.analysis,
        analysisDate: setup.analysisDate,
        notes: setup.notes,
        riskAmount: 100, // Default risk
        lotSize: hasExecutionPrices ? 0.01 : null, // Only for executable setups
      };
    });

    console.log('[YAML Parse] Success! Converted', orders.length, 'setups to order format');

    return NextResponse.json({
      success: true,
      orders,
      totalParsed: orders.length,
      metadata: parseResult.metadata
    });
  } catch (error: any) {
    console.error('[YAML Parse] Unexpected error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse YAML',
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
