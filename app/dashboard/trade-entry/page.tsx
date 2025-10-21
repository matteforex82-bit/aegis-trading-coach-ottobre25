import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db as prisma } from '@/lib/db';
import { TradeEntryClient } from './trade-entry-client';

export const metadata = {
  title: 'New Trade | AEGIS Trading Coach',
  description: 'Enter and validate new trades with AEGIS Guardian',
};

export default async function TradeEntryPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect('/auth/signin');
  }

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

      <TradeEntryClient accounts={accounts} />
    </div>
  );
}
