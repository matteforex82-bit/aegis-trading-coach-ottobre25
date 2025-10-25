import { NextRequest, NextResponse } from 'next/server';
import yaml from 'js-yaml';
import { db as prisma } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/**
 * YAML Upload Endpoint
 * User uploads YAML/TXT file with Elliott Wave trading setups
 * System parses, validates, and stores in database
 *
 * Reference: Section 2 of technical specification (simplified - no AI)
 */

interface YAMLAsset {
  id?: string;
  symbol: string;
  timeframe?: string;
  current_price?: number;
  scenario_type?: string;
  wave_structure?: any;
  trading_setup: {
    primary_entry?: {
      type: string;
      price: number;
      description?: string;
    };
    secondary_entry?: {
      type: string;
      price: number;
      description?: string;
    };
    stop_loss: {
      price: number;
      description?: string;
    };
    take_profit_targets?: Array<{
      id?: string;
      price: number;
      description?: string;
      close_percentage?: number;
    }>;
    invalidation?: {
      price: number;
      rule?: string;
    };
  };
  constraints?: {
    max_simultaneous_orders?: number;
    max_allocation_percent?: number;
    entry_mode?: string;
    entry_lock?: boolean;
    allow_averaging?: boolean;
  };
}

interface YAMLData {
  analysis_metadata?: {
    created_date?: string;
    analyst_id?: string;
    scenario?: string;
    confidence?: string;
  };
  assets: YAMLAsset[];
  challenge_rules_applied?: any;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const accountId = formData.get('accountId') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!accountId) {
      return NextResponse.json(
        { error: 'Account ID required' },
        { status: 400 }
      );
    }

    // 3. Verify account ownership
    const account = await prisma.tradingAccount.findUnique({
      where: { id: accountId },
      select: { userId: true }
    });

    if (!account || account.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Account not found or unauthorized' },
        { status: 403 }
      );
    }

    // 4. Read file content
    const rawYAML = await file.text();

    // 5. Parse YAML
    let parsedData: YAMLData;
    try {
      parsedData = yaml.load(rawYAML) as YAMLData;
    } catch (parseError: any) {
      return NextResponse.json({
        error: 'YAML parsing failed',
        message: parseError.message,
        details: 'Invalid YAML syntax. Please check your file format.'
      }, { status: 400 });
    }

    // 6. Validate YAML structure
    const validation = validateYAMLStructure(parsedData);

    if (!validation.isValid) {
      return NextResponse.json({
        error: 'Invalid YAML structure',
        validationErrors: validation.errors,
        details: 'YAML file is missing required fields or has incorrect structure.'
      }, { status: 400 });
    }

    // 7. Extract trading assets
    const extractedAssets = parsedData.assets || [];

    // 8. Save to database
    const analysis = await prisma.yAMLAnalysis.create({
      data: {
        accountId,
        fileName: file.name,
        rawYAML,
        parsedData: parsedData as any,
        extractedAssets: extractedAssets as any,
        validationStatus: 'VALID',
      }
    });

    // 9. Return success response with preview
    return NextResponse.json({
      status: 'success',
      message: 'YAML uploaded and validated successfully',
      analysisId: analysis.id,
      assetsCount: extractedAssets.length,
      assets: extractedAssets.map((asset: YAMLAsset) => ({
        symbol: asset.symbol,
        scenario: asset.scenario_type || 'N/A',
        direction: asset.trading_setup?.primary_entry?.type || 'UNKNOWN',
        entry: asset.trading_setup?.primary_entry?.price,
        stopLoss: asset.trading_setup?.stop_loss?.price,
        takeProfit: asset.trading_setup?.take_profit_targets?.[0]?.price,
        invalidation: asset.trading_setup?.invalidation?.price,
      })),
      metadata: parsedData.analysis_metadata,
    });

  } catch (error: any) {
    console.error('YAML upload error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 });
  }
}

/**
 * GET endpoint to retrieve YAML analysis by ID
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Analysis ID required' }, { status: 400 });
    }

    const analysis = await prisma.yAMLAnalysis.findUnique({
      where: { id },
      include: {
        account: {
          select: {
            id: true,
            login: true,
            broker: true,
            userId: true,
          },
        },
      },
    });

    if (!analysis) {
      return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
    }

    if (analysis.account.userId !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error('Get YAML analysis error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message,
    }, { status: 500 });
  }
}

/**
 * Validate YAML Structure
 * Ensures all required fields are present
 */
function validateYAMLStructure(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check if data exists
  if (!data) {
    errors.push("YAML file is empty or unreadable");
    return { isValid: false, errors };
  }

  // Check if assets array exists
  if (!data.assets || !Array.isArray(data.assets)) {
    errors.push("Missing 'assets' array in YAML. Expected: assets: [...]");
    return { isValid: false, errors };
  }

  // Check if assets array is not empty
  if (data.assets.length === 0) {
    errors.push("Assets array is empty. At least one trading setup is required.");
    return { isValid: false, errors };
  }

  // Validate each asset
  data.assets.forEach((asset: any, index: number) => {
    const assetPrefix = `Asset ${index + 1} (${asset.symbol || 'UNKNOWN'})`;

    // Required: symbol
    if (!asset.symbol) {
      errors.push(`${assetPrefix}: Missing 'symbol' field`);
    }

    // Required: trading_setup
    if (!asset.trading_setup) {
      errors.push(`${assetPrefix}: Missing 'trading_setup' object`);
      return; // Skip further validation for this asset
    }

    // Required: primary_entry or secondary_entry
    if (!asset.trading_setup.primary_entry && !asset.trading_setup.secondary_entry) {
      errors.push(`${assetPrefix}: Missing 'primary_entry' or 'secondary_entry'`);
    }

    // Validate primary_entry if exists
    if (asset.trading_setup.primary_entry) {
      if (!asset.trading_setup.primary_entry.type) {
        errors.push(`${assetPrefix}: primary_entry missing 'type' (buy_limit/sell_limit)`);
      }
      if (typeof asset.trading_setup.primary_entry.price !== 'number') {
        errors.push(`${assetPrefix}: primary_entry missing or invalid 'price'`);
      }
    }

    // Required: stop_loss
    if (!asset.trading_setup.stop_loss) {
      errors.push(`${assetPrefix}: Missing 'stop_loss' object`);
    } else if (typeof asset.trading_setup.stop_loss.price !== 'number') {
      errors.push(`${assetPrefix}: stop_loss missing or invalid 'price'`);
    }

    // Optional but recommended: take_profit_targets
    if (!asset.trading_setup.take_profit_targets || asset.trading_setup.take_profit_targets.length === 0) {
      // Just a warning, not an error
      console.warn(`${assetPrefix}: No take_profit_targets defined (recommended but optional)`);
    }

    // Optional but recommended: invalidation
    if (!asset.trading_setup.invalidation) {
      console.warn(`${assetPrefix}: No invalidation level defined (recommended for Elliott Wave)`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}
