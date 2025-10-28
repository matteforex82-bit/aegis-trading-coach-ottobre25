import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseYAMLToOrders } from '@/lib/yaml-to-orders';

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

    // Parse YAML to orders (without creating them in DB)
    const orders = await parseYAMLToOrders(fileContent, accountId);

    return NextResponse.json({
      success: true,
      orders: orders.map(order => ({
        symbol: order.symbol,
        direction: order.direction,
        orderType: order.orderType,
        entryPrice: order.entryPrice,
        stopLoss: order.stopLoss,
        takeProfit1: order.takeProfit1,
        takeProfit2: order.takeProfit2,
        takeProfit3: order.takeProfit3,
        riskAmount: order.riskAmount,
        lotSize: order.lotSize,
      })),
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
