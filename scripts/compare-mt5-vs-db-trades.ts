import { db } from '../lib/db';

const ACCOUNT_LOGIN = '4000072938';

/**
 * This script compares trades in database vs MT5 HTML report
 * to identify which trades are missing and why
 */

async function compareTrades() {
  console.log(`\n📊 Comparing MT5 Report vs Database Trades\n`);
  console.log(`Account: ${ACCOUNT_LOGIN}\n`);

  try {
    // Get account from database
    const account = await db.tradingAccount.findFirst({
      where: { login: ACCOUNT_LOGIN },
      select: { id: true, login: true, broker: true },
    });

    if (!account) {
      console.log(`❌ Account ${ACCOUNT_LOGIN} not found!`);
      return;
    }

    // Get all trades from database
    const dbTrades = await db.trade.findMany({
      where: { accountId: account.id },
      orderBy: { openTime: 'asc' },
      select: {
        ticket: true,
        symbol: true,
        type: true,
        openTime: true,
        closeTime: true,
        profit: true,
        commission: true,
        swap: true,
      },
    });

    console.log(`✅ Database Trades: ${dbTrades.length}`);
    console.log(`📋 MT5 Report Trades: 171 (from HTML report)`);
    console.log(`❌ Missing Trades: ${171 - dbTrades.length}\n`);

    // Analyze date ranges
    if (dbTrades.length > 0) {
      const firstTrade = dbTrades[0];
      const lastTrade = dbTrades[dbTrades.length - 1];

      console.log(`📅 Date Range in Database:`);
      console.log(`   First trade: ${firstTrade.openTime.toISOString().split('T')[0]} (Ticket: ${firstTrade.ticket})`);
      console.log(`   Last trade:  ${lastTrade.openTime.toISOString().split('T')[0]} (Ticket: ${lastTrade.ticket})\n`);

      // Group trades by month
      const tradesByMonth = new Map<string, number>();
      dbTrades.forEach(trade => {
        const month = trade.openTime.toISOString().substring(0, 7); // YYYY-MM
        tradesByMonth.set(month, (tradesByMonth.get(month) || 0) + 1);
      });

      console.log(`📊 Trades per Month in Database:`);
      Array.from(tradesByMonth.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .forEach(([month, count]) => {
          console.log(`   ${month}: ${count} trades`);
        });

      console.log(`\n📈 Net Profit Calculation (Database):`);
      let totalProfit = 0;
      let totalCommission = 0;
      let totalSwap = 0;

      dbTrades.forEach(trade => {
        totalProfit += trade.profit || 0;
        totalCommission += trade.commission || 0;
        totalSwap += trade.swap || 0;
      });

      const netProfit = totalProfit + totalCommission + totalSwap;

      console.log(`   Profit:     $${totalProfit.toFixed(2)}`);
      console.log(`   Commission: $${totalCommission.toFixed(2)}`);
      console.log(`   Swap:       $${totalSwap.toFixed(2)}`);
      console.log(`   Net Profit: $${netProfit.toFixed(2)}`);
      console.log(`\n   MT5 Report Net Profit: -$5,852.18`);
      console.log(`   Difference: $${(netProfit - (-5852.18)).toFixed(2)}`);

      // Analyze which tickets we have
      console.log(`\n🎫 Sample Ticket Numbers (first 10 in DB):`);
      dbTrades.slice(0, 10).forEach((trade, i) => {
        console.log(`   ${i + 1}. ${trade.ticket} - ${trade.symbol} ${trade.type} (${trade.openTime.toISOString().split('T')[0]})`);
      });

      console.log(`\n🎫 Sample Ticket Numbers (last 10 in DB):`);
      dbTrades.slice(-10).forEach((trade, i) => {
        console.log(`   ${dbTrades.length - 9 + i}. ${trade.ticket} - ${trade.symbol} ${trade.type} (${trade.openTime.toISOString().split('T')[0]})`);
      });

      // MT5 report shows first trade ticket: 310226083 (from HTML)
      // Check if we have it
      const firstMT5Ticket = '310226083';
      const hasFirstMT5Trade = dbTrades.some(t => t.ticket === firstMT5Ticket);

      console.log(`\n🔍 First trade from MT5 HTML report:`);
      console.log(`   Ticket: ${firstMT5Ticket} (EURUSD buy, opened 2025-09-04 02:25:00)`);
      console.log(`   Present in DB: ${hasFirstMT5Trade ? '✅ YES' : '❌ NO'}`);

      if (!hasFirstMT5Trade) {
        console.log(`\n⚠️  FINDING: The first trade from MT5 report is NOT in database!`);
        console.log(`   This suggests trades BEFORE ${firstTrade.openTime.toISOString().split('T')[0]} were never synced.`);
      }
    }

    console.log(`\n📝 HYPOTHESIS:`);
    console.log(`   Based on the analysis:`);
    console.log(`   1. Database has 134 trades`);
    console.log(`   2. MT5 report has 171 trades`);
    console.log(`   3. Missing: 37 trades (22% of total)`);
    console.log(`\n   MOST LIKELY CAUSE:`);
    console.log(`   - The MT5 EA started syncing trades from a certain date`);
    console.log(`   - Older trades (37 of them) were never imported`);
    console.log(`   - These are probably the first trades in the MT5 report`);
    console.log(`\n   SOLUTION:`);
    console.log(`   - Create a manual import script to parse the MT5 HTML report`);
    console.log(`   - Extract the 37 missing trades`);
    console.log(`   - Insert them into the database`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.$disconnect();
  }
}

compareTrades();
