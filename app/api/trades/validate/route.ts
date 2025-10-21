import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validateTrade, type TradeValidationInput } from '@/lib/trade-validator';
import { db as prisma } from '@/lib/db';

/**
 * POST /api/trades/validate
 *
 * Validates a trade before execution using:
 * - Risk calculator
 * - Correlation engine
 * - Prop firm validator
 *
 * Returns: validation result with canExecute boolean
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const {
      accountId,
      symbol,
      direction,
      entryPrice,
      stopLoss,
      takeProfit1,
      riskPercent,
      lotSize, // Optional: if user wants to validate specific lot size
    } = body;

    // Validate required fields
    if (!accountId || !symbol || !direction || !entryPrice || !stopLoss || !riskPercent) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Fetch account
    const account = await prisma.tradingAccount.findUnique({
      where: {
        id: accountId,
        userId: session.user.id,
      },
      include: {
        propFirmChallenge: true,
      },
    });

    if (!account) {
      return NextResponse.json(
        { error: 'Trading account not found' },
        { status: 404 }
      );
    }

    // Fetch existing open trades for correlation analysis
    const openTrades = await prisma.trade.findMany({
      where: {
        accountId,
        closeTime: null, // Only open trades
      },
      select: {
        symbol: true,
        type: true,
        volume: true,
        stopLoss: true,
        openPrice: true,
      },
    });

    // Convert open trades to TradeExposure format
    const existingTrades = openTrades.map(trade => {
      // Parse currency pair
      const cleanSymbol = trade.symbol.toUpperCase().replace(/[^A-Z]/g, '');
      const baseCurrency = cleanSymbol.substring(0, 3);
      const quoteCurrency = cleanSymbol.substring(3, 6);

      // Calculate risk percent for this trade (approximation)
      const pipDistance = Math.abs(trade.openPrice - (trade.stopLoss || trade.openPrice));
      const riskAmount = trade.volume * pipDistance * 10; // Simplified
      const tradeRiskPercent = (riskAmount / account.startBalance) * 100;

      return {
        symbol: trade.symbol,
        direction: trade.type.toUpperCase().includes('BUY') ? 'BUY' as const : 'SELL' as const,
        riskPercent: tradeRiskPercent,
        baseCurrency,
        quoteCurrency,
      };
    });

    // Prepare validation input
    const validationInput: TradeValidationInput = {
      symbol,
      direction: direction.toUpperCase() as 'BUY' | 'SELL',
      entryPrice: parseFloat(entryPrice),
      stopLoss: parseFloat(stopLoss),
      takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : undefined,
      riskPercent: parseFloat(riskPercent),
      accountBalance: account.currentBalance,
      accountCurrency: account.currency,
      existingTrades,
      maxCurrencyExposure: account.propFirmChallenge?.maxCurrencyExposure || 2.0,
    };

    // Add prop firm rules if account has challenge
    if (account.propFirmChallenge) {
      const challenge = account.propFirmChallenge;

      validationInput.propFirmRules = {
        provider: challenge.provider,
        phase: challenge.phase,
        maxDailyLossPercent: challenge.maxDailyLossPercent,
        maxTotalLossPercent: challenge.maxTotalLossPercent,
        profitTargetPercent: challenge.profitTargetPercent,
        minTradingDays: challenge.minTradingDays || undefined,
        maxLotSize: challenge.maxLotSize || undefined,
        maxOpenTrades: challenge.maxOpenTrades || undefined,
        currentDailyLoss: challenge.currentDailyLoss,
        currentTotalDrawdown: challenge.currentTotalDrawdown,
        currentProfit: challenge.currentProfit,
        tradingDaysCompleted: challenge.tradingDaysCompleted,
        startBalance: account.startBalance,
        currentBalance: account.currentBalance,
      };
    }

    // Execute validation
    const validationResult = await validateTrade(validationInput);

    // Check lock mode
    const lockMode = account.lockMode || 'MEDIUM';

    let finalCanExecute = validationResult.canExecute;

    // Apply lock mode logic
    if (lockMode === 'HARD' && !validationResult.canExecute) {
      finalCanExecute = false;
    } else if (lockMode === 'SOFT') {
      // Allow execution even with violations (just warnings)
      finalCanExecute = true;
    }

    return NextResponse.json({
      ...validationResult,
      canExecute: finalCanExecute,
      lockMode,
      account: {
        id: account.id,
        login: account.login,
        broker: account.broker,
        currentBalance: account.currentBalance,
        lockMode: account.lockMode,
      },
    });

  } catch (error) {
    console.error('Trade validation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to validate trade',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
