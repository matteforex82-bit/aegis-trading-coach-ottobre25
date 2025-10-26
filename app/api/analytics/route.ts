import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'all' // 'all' or number of days
    const accountId = searchParams.get('accountId') // optional filter

    // Calculate date range - if period is 'all', don't filter by date
    let startDate: Date | undefined
    if (period !== 'all') {
      const periodDays = parseInt(period)
      startDate = new Date()
      startDate.setDate(startDate.getDate() - periodDays)
    }

    // Get all trading accounts for the user
    const accountsWhere: any = {
      userId: session.user.id,
      deletedAt: null,
    }

    if (accountId) {
      accountsWhere.id = accountId
    }

    const accounts = await db.tradingAccount.findMany({
      where: accountsWhere,
      include: {
        trades: {
          where: {
            closeTime: startDate ? {
              not: null,
              gte: startDate
            } : {
              not: null
            },
          },
          orderBy: {
            closeTime: 'asc'
          }
        },
      },
    })

    // Calculate comprehensive analytics
    const allTrades = accounts.flatMap(acc => acc.trades)

    if (allTrades.length === 0) {
      return NextResponse.json({
        summary: {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          profitFactor: 0,
          averageWin: 0,
          averageLoss: 0,
          averageRR: 0,
          bestTrade: 0,
          worstTrade: 0,
          totalProfit: 0,
          grossProfit: 0,
          grossLoss: 0,
        },
        equityCurve: [],
        monthlyPerformance: [],
        symbolAnalysis: [],
        weekdayAnalysis: [],
      })
    }

    // Summary stats
    // Calculate net profit per trade (profit + commission + swap)
    const tradesWithNetProfit = allTrades.map(t => ({
      ...t,
      netProfit: (t.profit || 0) + (t.commission || 0) + (t.swap || 0)
    }))

    const winningTrades = tradesWithNetProfit.filter(t => t.netProfit > 0)
    const losingTrades = tradesWithNetProfit.filter(t => t.netProfit < 0)

    const grossProfit = winningTrades.reduce((sum, t) => sum + t.netProfit, 0)
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.netProfit, 0))
    const totalProfit = tradesWithNetProfit.reduce((sum, t) => sum + t.netProfit, 0)

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 999 : 0
    const winRate = allTrades.length > 0 ? (winningTrades.length / allTrades.length) * 100 : 0

    const averageWin = winningTrades.length > 0
      ? grossProfit / winningTrades.length
      : 0
    const averageLoss = losingTrades.length > 0
      ? grossLoss / losingTrades.length
      : 0
    const averageRR = averageLoss > 0 ? averageWin / averageLoss : 0

    const netProfits = tradesWithNetProfit.map(t => t.netProfit)
    const bestTrade = netProfits.length > 0 ? Math.max(...netProfits) : 0
    const worstTrade = netProfits.length > 0 ? Math.min(...netProfits) : 0

    // Equity curve (cumulative profit over time)
    let cumulativeProfit = 0
    const equityCurve = tradesWithNetProfit.map(trade => {
      cumulativeProfit += trade.netProfit
      return {
        date: trade.closeTime!.toISOString(),
        profit: cumulativeProfit,
        trade: trade.netProfit,
      }
    })

    // Monthly performance
    const monthlyMap = new Map<string, { profit: number; trades: number }>()
    tradesWithNetProfit.forEach(trade => {
      const month = new Date(trade.closeTime!).toISOString().slice(0, 7) // YYYY-MM
      const existing = monthlyMap.get(month) || { profit: 0, trades: 0 }
      monthlyMap.set(month, {
        profit: existing.profit + trade.netProfit,
        trades: existing.trades + 1,
      })
    })

    const monthlyPerformance = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({
        month,
        profit: data.profit,
        trades: data.trades,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Symbol analysis
    const symbolMap = new Map<string, {
      trades: number
      wins: number
      losses: number
      profit: number
      volume: number
    }>()

    tradesWithNetProfit.forEach(trade => {
      const existing = symbolMap.get(trade.symbol) || {
        trades: 0,
        wins: 0,
        losses: 0,
        profit: 0,
        volume: 0,
      }

      symbolMap.set(trade.symbol, {
        trades: existing.trades + 1,
        wins: existing.wins + (trade.netProfit > 0 ? 1 : 0),
        losses: existing.losses + (trade.netProfit < 0 ? 1 : 0),
        profit: existing.profit + trade.netProfit,
        volume: existing.volume + trade.volume,
      })
    })

    const symbolAnalysis = Array.from(symbolMap.entries())
      .map(([symbol, data]) => ({
        symbol,
        trades: data.trades,
        wins: data.wins,
        losses: data.losses,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
        profit: data.profit,
        volume: data.volume,
      }))
      .sort((a, b) => b.profit - a.profit)

    // Weekday analysis (0 = Sunday, 6 = Saturday)
    const weekdayMap = new Map<number, { trades: number; profit: number; wins: number }>()
    tradesWithNetProfit.forEach(trade => {
      const day = new Date(trade.closeTime!).getDay()
      const existing = weekdayMap.get(day) || { trades: 0, profit: 0, wins: 0 }
      weekdayMap.set(day, {
        trades: existing.trades + 1,
        profit: existing.profit + trade.netProfit,
        wins: existing.wins + (trade.netProfit > 0 ? 1 : 0),
      })
    })

    const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const weekdayAnalysis = Array.from(weekdayMap.entries())
      .map(([day, data]) => ({
        day: weekdayNames[day],
        trades: data.trades,
        profit: data.profit,
        winRate: data.trades > 0 ? (data.wins / data.trades) * 100 : 0,
      }))
      .sort((a, b) => weekdayNames.indexOf(a.day) - weekdayNames.indexOf(b.day))

    return NextResponse.json({
      summary: {
        totalTrades: allTrades.length,
        winningTrades: winningTrades.length,
        losingTrades: losingTrades.length,
        winRate,
        profitFactor,
        averageWin,
        averageLoss,
        averageRR,
        bestTrade,
        worstTrade,
        totalProfit,
        grossProfit,
        grossLoss,
      },
      equityCurve,
      monthlyPerformance,
      symbolAnalysis,
      weekdayAnalysis,
    })
  } catch (error) {
    console.error("Analytics error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
