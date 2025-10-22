import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { TradeEntryClient } from './trade-entry-client';

export const metadata = {
  title: 'New Trade | AEGIS Trading Coach',
  description: 'Enter and validate new trades with AEGIS Guardian',
};

interface PageProps {
  searchParams: Promise<{ setup?: string }>;
}

export default async function TradeEntryPage({ searchParams }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

  // Await searchParams (Next.js 15 requirement)
  const params = await searchParams;

  // Fetch user's trading accounts
  const accounts = await prisma.tradingAccount.findMany({
    where: {
      userId: session.user.id,
      deletedAt: null,
    },
    include: {
      propFirmChallenge: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Fetch trading setup if provided in query params
  let prefilledSetup = null;
  if (params.setup) {
    const setup = await prisma.tradingSetup.findUnique({
      where: {
        id: params.setup,
        isActive: true, // Only fetch active setups
      },
    });

    if (setup) {
      prefilledSetup = {
        symbol: setup.symbol,
        direction: setup.direction as 'BUY' | 'SELL',
        entryPrice: setup.entryPrice,
        stopLoss: setup.stopLoss,
        takeProfit1: setup.takeProfit1 || undefined,
        takeProfit2: setup.takeProfit2 || undefined,
        takeProfit3: setup.takeProfit3 || undefined,
        wavePattern: setup.wavePattern,
        waveCount: setup.waveCount,
      };
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="container mx-auto py-12">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <h1 className="text-3xl font-bold">No Trading Accounts</h1>
          <p className="text-muted-foreground">
            You need to add a trading account before placing trades.
          </p>
          <a
            href="/dashboard/accounts"
            className="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Add Trading Account
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">New Trade Entry</h1>
        <p className="text-muted-foreground">
          AEGIS will validate your trade in real-time and block violations
        </p>
      </div>

      <TradeEntryClient accounts={accounts} prefilledSetup={prefilledSetup} />
    </div>
  );
}
