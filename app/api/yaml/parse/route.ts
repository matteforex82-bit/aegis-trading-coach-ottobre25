import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import yaml from 'js-yaml';

interface YAMLAsset {
  symbol: string;
  trading_setup: {
    primary_entry?: {
      type: string;
      price: number;
    };
    secondary_entry?: {
      type: string;
      price: number;
    };
    stop_loss: {
      price: number;
    };
    take_profit_targets?: Array<{
      price: number;
      close_percentage?: number;
    }>;
  };
}

interface YAMLData {
  assets?: YAMLAsset[];
  setups?: YAMLAsset[];
  waiting_list?: YAMLAsset[];
}

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

    // Parse YAML
    const parsedData = yaml.load(fileContent) as YAMLData;

    // Support multiple formats: assets, setups, waiting_list
    const dataArray = parsedData?.assets || parsedData?.setups || parsedData?.waiting_list;

    if (!dataArray || !Array.isArray(dataArray)) {
      return NextResponse.json({ error: 'Invalid YAML structure - missing assets, setups, or waiting_list array' }, { status: 400 });
    }

    // If array is empty (like setups: []), skip to next option
    const assets = dataArray.length > 0 ? dataArray : (parsedData?.waiting_list || parsedData?.setups || parsedData?.assets || []);

    // Convert to simple order format for preview
    const orders = assets.map((asset: YAMLAsset) => {
      const entry = asset.trading_setup.primary_entry || asset.trading_setup.secondary_entry;
      if (!entry) return null;

      const direction = entry.type.toUpperCase().includes('BUY') ? 'BUY' : 'SELL';
      const orderType = entry.type.toLowerCase().includes('limit')
        ? (direction === 'BUY' ? 'BUY_LIMIT' : 'SELL_LIMIT')
        : (direction === 'BUY' ? 'BUY_STOP' : 'SELL_STOP');

      return {
        symbol: asset.symbol,
        direction,
        orderType,
        entryPrice: entry.price,
        stopLoss: asset.trading_setup.stop_loss.price,
        takeProfit1: asset.trading_setup.take_profit_targets?.[0]?.price,
        takeProfit2: asset.trading_setup.take_profit_targets?.[1]?.price,
        takeProfit3: asset.trading_setup.take_profit_targets?.[2]?.price,
        riskAmount: 100, // Default risk
        lotSize: 0.01, // Default lot size
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      orders,
    });
  } catch (error: any) {
    console.error('YAML parse error:', error);
    return NextResponse.json(
      {
        error: 'Failed to parse YAML',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
