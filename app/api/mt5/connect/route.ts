import { NextRequest, NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import crypto from 'crypto';

/**
 * POST /api/mt5/connect
 * Auto-registration endpoint for MT5 EA
 * Called when EA starts for the first time without API key
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountLogin, broker, server, currency, balance, accountName } = body;

    // Validate required fields
    if (!accountLogin || !broker || !server) {
      return NextResponse.json(
        { error: 'Missing required fields: accountLogin, broker, server' },
        { status: 400 }
      );
    }

    // Check if account already exists
    const existingAccount = await prisma.tradingAccount.findUnique({
      where: { login: accountLogin },
    });

    if (existingAccount) {
      return NextResponse.json(
        {
          error: 'Account already registered',
          message: 'This account is already connected. Please retrieve your API key from the dashboard.',
          accountId: existingAccount.id,
        },
        { status: 409 }
      );
    }

    // Generate API key
    const apiKey = crypto.randomBytes(32).toString('base64url');

    // Create trading account with admin user (for now - in production should be linked to proper user)
    // Get admin user (first user in database)
    const adminUser = await prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!adminUser) {
      return NextResponse.json(
        { error: 'No users found in system. Please create a user first.' },
        { status: 500 }
      );
    }

    // Generate API key
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');

    // Create new trading account
    const newAccount = await prisma.tradingAccount.create({
      data: {
        userId: adminUser.id,
        login: accountLogin,
        broker,
        server,
        accountType: 'LIVE', // Default to LIVE, can be updated later
        status: 'ACTIVE',
        currency: currency || 'USD',
        startBalance: balance || 0,
        currentBalance: balance || 0,
        profit: 0,
        drawdown: 0,
        lastSyncAt: new Date(),
        mt5ApiKeys: {
          create: {
            key: apiKeyHash,
            name: `Auto-generated - ${new Date().toISOString()}`,
          },
        },
      },
    });

    console.log(`✅ Auto-registered MT5 account: ${accountLogin} (${broker})`);

    return NextResponse.json({
      success: true,
      message: 'Account registered successfully',
      data: {
        accountId: newAccount.id,
        accountLogin: newAccount.login,
        apiKey: apiKey,
        broker: newAccount.broker,
        server: newAccount.server,
      },
      instructions: {
        step1: 'Copy the API key below',
        step2: 'Open MT5 > Expert Advisors > AegisController-v4 > Settings',
        step3: 'Paste the API key in the API_KEY parameter',
        step4: 'Restart the EA',
      },
    });
  } catch (error: any) {
    console.error('❌ Error in /api/mt5/connect:', error);
    return NextResponse.json(
      {
        error: 'Failed to register account',
        message: error.message,
      },
      { status: 500 }
    );
  }
}
