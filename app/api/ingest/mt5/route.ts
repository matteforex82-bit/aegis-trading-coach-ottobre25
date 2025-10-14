import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AccountType, AccountStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { checkAccountLimit } from '@/lib/plan-limits'

// CORS headers for MT5 EA
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
}

// Validate API Key from request header
async function validateApiKey(request: NextRequest): Promise<{ valid: boolean; userId?: string; error?: string }> {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

  if (!apiKey) {
    return { valid: false, error: 'Missing API Key' }
  }

  // Check if key starts with expected prefix
  if (!apiKey.startsWith('sk_aegis_')) {
    return { valid: false, error: 'Invalid API Key format' }
  }

  // Find all active API keys and check against hashed values
  const apiKeys = await db.apiKey.findMany({
    where: { isActive: true }
  })

  for (const key of apiKeys) {
    const isValid = await bcrypt.compare(apiKey, key.key)
    if (isValid) {
      // Update last used timestamp
      await db.apiKey.update({
        where: { id: key.id },
        data: { lastUsedAt: new Date() }
      })

      return { valid: true, userId: key.userId }
    }
  }

  return { valid: false, error: 'Invalid or expired API Key' }
}

interface MT5Account {
  login: string
  broker: string
  server?: string
  balance: number
  equity: number
  margin?: number
  freeMargin?: number
  marginLevel?: number
  currency?: string
  leverage?: number
  propFirm?: string
  phase?: string
  startBalance?: number
}

interface MT5Trade {
  ticket: string
  symbol: string
  type: string
  volume: number
  openPrice: number
  closePrice?: number
  openTime: string
  closeTime?: string
  profit?: number
  commission?: number
  swap?: number
  comment?: string
  stopLoss?: number
  takeProfit?: number
}

interface MT5Metrics {
  profit: number
  drawdown: number
  dailyProfit?: number
  dailyDrawdown?: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
}

interface MT5Data {
  account: MT5Account
  trades?: MT5Trade[]
  openPositions?: MT5Trade[]
  metrics?: MT5Metrics
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  try {
    // Validate API Key first
    const authResult = await validateApiKey(request)

    if (!authResult.valid) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: authResult.error || 'Invalid API Key',
          hint: 'Make sure you have set the API_KEY parameter in your MT5 Expert Advisor'
        },
        { status: 401, headers: corsHeaders }
      )
    }

    const data: MT5Data = await request.json()

    // Validate required fields
    if (!data.account || !data.account.login) {
      return NextResponse.json(
        { error: 'Missing required account data' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { account, trades, openPositions, metrics } = data

    // Find or create trading account
    const existingAccount = await db.tradingAccount.findUnique({
      where: { login: account.login.toString() }
    })

    let tradingAccount

    if (existingAccount) {
      // Update existing account
      tradingAccount = await db.tradingAccount.update({
        where: { id: existingAccount.id },
        data: {
          broker: account.broker,
          server: account.server,
          currentBalance: account.balance,
          equity: account.equity,
          margin: account.margin,
          freeMargin: account.freeMargin,
          marginLevel: account.marginLevel,
          currency: account.currency || 'USD',
          leverage: account.leverage,
          profit: metrics?.profit || 0,
          drawdown: metrics?.drawdown || 0,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        }
      })
    } else {
      // Check plan limits before creating new account
      const limitCheck = await checkAccountLimit(authResult.userId!)

      if (!limitCheck.canCreate) {
        return NextResponse.json(
          {
            error: 'Account limit reached',
            message: `You have reached the maximum number of trading accounts (${limitCheck.limit}) for your plan`,
            hint: 'Please upgrade your plan to add more accounts',
            currentCount: limitCheck.currentCount,
            limit: limitCheck.limit,
          },
          { status: 403, headers: corsHeaders }
        )
      }

      // Create new account using the authenticated user from API key
      tradingAccount = await db.tradingAccount.create({
        data: {
          userId: authResult.userId!,
          login: account.login.toString(),
          broker: account.broker,
          server: account.server,
          accountType: account.phase ? AccountType.CHALLENGE : AccountType.DEMO,
          status: AccountStatus.ACTIVE,
          propFirm: account.propFirm,
          phase: account.phase,
          startBalance: account.startBalance || account.balance,
          currentBalance: account.balance,
          equity: account.equity,
          margin: account.margin,
          freeMargin: account.freeMargin,
          marginLevel: account.marginLevel,
          currency: account.currency || 'USD',
          leverage: account.leverage,
          profit: metrics?.profit || 0,
          drawdown: metrics?.drawdown || 0,
          lastSyncAt: new Date(),
        }
      })
    }

    // Sync trades if provided
    if (trades && trades.length > 0) {
      for (const trade of trades) {
        await db.trade.upsert({
          where: {
            accountId_ticket: {
              accountId: tradingAccount.id,
              ticket: trade.ticket.toString()
            }
          },
          create: {
            accountId: tradingAccount.id,
            ticket: trade.ticket.toString(),
            symbol: trade.symbol,
            type: trade.type,
            volume: trade.volume,
            openPrice: trade.openPrice,
            closePrice: trade.closePrice,
            openTime: new Date(trade.openTime),
            closeTime: trade.closeTime ? new Date(trade.closeTime) : null,
            profit: trade.profit,
            commission: trade.commission,
            swap: trade.swap,
            comment: trade.comment,
            stopLoss: trade.stopLoss,
            takeProfit: trade.takeProfit,
          },
          update: {
            closePrice: trade.closePrice,
            closeTime: trade.closeTime ? new Date(trade.closeTime) : null,
            profit: trade.profit,
            commission: trade.commission,
            swap: trade.swap,
            updatedAt: new Date(),
          }
        })
      }
    }

    // Save metrics if provided
    if (metrics) {
      await db.accountMetrics.create({
        data: {
          accountId: tradingAccount.id,
          balance: account.balance,
          equity: account.equity,
          margin: account.margin,
          freeMargin: account.freeMargin,
          marginLevel: account.marginLevel,
          profit: metrics.profit,
          drawdown: metrics.drawdown,
          dailyProfit: metrics.dailyProfit,
          dailyDrawdown: metrics.dailyDrawdown,
          totalTrades: metrics.totalTrades,
          winningTrades: metrics.winningTrades,
          losingTrades: metrics.losingTrades,
          winRate: metrics.totalTrades > 0
            ? (metrics.winningTrades / metrics.totalTrades) * 100
            : 0,
        }
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Data synced successfully',
      accountId: tradingAccount.id,
      tradesProcessed: trades?.length || 0,
      timestamp: new Date().toISOString()
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('MT5 Ingest Error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'MT5 Ingest API - Use POST to sync data',
    requiredFields: {
      account: {
        login: 'string (required)',
        broker: 'string (required)',
        balance: 'number (required)',
        equity: 'number (required)',
      },
      trades: 'array (optional)',
      metrics: 'object (optional)'
    }
  }, { headers: corsHeaders })
}
