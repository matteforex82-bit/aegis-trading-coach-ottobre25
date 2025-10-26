import { db } from '../lib/db';

const ACCOUNT_LOGIN = '4000072938';

async function analyzeAccountTrades() {
  console.log(`\n📊 Analyzing trades for account: ${ACCOUNT_LOGIN}\n`);

  try {
    // Find the account
    const account = await db.tradingAccount.findFirst({
      where: { login: ACCOUNT_LOGIN },
      select: {
        id: true,
        login: true,
        broker: true,
        currentBalance: true,
        userId: true,
      },
    });

    if (!account) {
      console.log(`❌ Account ${ACCOUNT_LOGIN} not found in database!`);
      return;
    }

    console.log(`✅ Account found:`);
    console.log(`   ID: ${account.id}`);
    console.log(`   Login: ${account.login}`);
    console.log(`   Broker: ${account.broker}`);
    console.log(`   Current Balance: $${account.currentBalance}`);
    console.log(`   User ID: ${account.userId}\n`);

    // Get all trades for this account
    const trades = await db.trade.findMany({
      where: { accountId: account.id },
      orderBy: { openTime: 'asc' },
      select: {
        id: true,
        ticket: true,
        symbol: true,
        type: true,
        volume: true,
        openPrice: true,
        closePrice: true,
        openTime: true,
        closeTime: true,
        profit: true,
        commission: true,
        swap: true,
        stopLoss: true,
        takeProfit: true,
      },
    });

    console.log(`📈 Total trades in database: ${trades.length}\n`);

    // Calculate statistics
    const closedTrades = trades.filter(t => t.closeTime !== null);
    const openTrades = trades.filter(t => t.closeTime === null);

    console.log(`   Closed trades: ${closedTrades.length}`);
    console.log(`   Open trades: ${openTrades.length}\n`);

    // Calculate profit statistics
    let totalProfit = 0;
    let totalCommission = 0;
    let totalSwap = 0;
    let winningTrades = 0;
    let losingTrades = 0;

    closedTrades.forEach(trade => {
      const profit = trade.profit || 0;
      const commission = trade.commission || 0;
      const swap = trade.swap || 0;

      totalProfit += profit;
      totalCommission += commission;
      totalSwap += swap;

      if (profit > 0) winningTrades++;
      if (profit < 0) losingTrades++;
    });

    const netProfit = totalProfit + totalCommission + totalSwap;
    const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length) * 100 : 0;

    console.log(`💰 Profit Breakdown:`);
    console.log(`   Gross Profit: $${totalProfit.toFixed(2)}`);
    console.log(`   Commission: $${totalCommission.toFixed(2)}`);
    console.log(`   Swap: $${totalSwap.toFixed(2)}`);
    console.log(`   Net Profit: $${netProfit.toFixed(2)}\n`);

    console.log(`📊 Trade Statistics:`);
    console.log(`   Winning trades: ${winningTrades}`);
    console.log(`   Losing trades: ${losingTrades}`);
    console.log(`   Win rate: ${winRate.toFixed(2)}%\n`);

    // Show first 10 trades
    console.log(`📋 First 10 trades:`);
    trades.slice(0, 10).forEach((trade, index) => {
      const profit = trade.profit || 0;
      const profitStr = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
      const status = trade.closeTime ? 'CLOSED' : 'OPEN';
      console.log(`   ${index + 1}. ${trade.ticket} ${trade.symbol} ${trade.type} ${profitStr} [${status}]`);
    });

    console.log(`\n📋 Last 10 trades:`);
    trades.slice(-10).forEach((trade, index) => {
      const profit = trade.profit || 0;
      const profitStr = profit >= 0 ? `+$${profit.toFixed(2)}` : `-$${Math.abs(profit).toFixed(2)}`;
      const status = trade.closeTime ? 'CLOSED' : 'OPEN';
      console.log(`   ${trades.length - 9 + index}. ${trade.ticket} ${trade.symbol} ${trade.type} ${profitStr} [${status}]`);
    });

    // Export to CSV for comparison
    console.log(`\n📝 Exporting trades to CSV...`);
    const csv = [
      'Ticket,Symbol,Type,Volume,OpenPrice,ClosePrice,OpenTime,CloseTime,Profit,Commission,Swap',
      ...trades.map(t => [
        t.ticket,
        t.symbol,
        t.type,
        t.volume,
        t.openPrice,
        t.closePrice || '',
        t.openTime.toISOString(),
        t.closeTime ? t.closeTime.toISOString() : '',
        t.profit || 0,
        t.commission || 0,
        t.swap || 0,
      ].join(',')),
    ].join('\n');

    const fs = require('fs');
    fs.writeFileSync('dashboard-trades-export.csv', csv);
    console.log(`✅ Trades exported to dashboard-trades-export.csv\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

analyzeAccountTrades();
