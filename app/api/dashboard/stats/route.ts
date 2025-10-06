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

    // Get all trading accounts for the user
    const accounts = await db.tradingAccount.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      include: {
        trades: {
          where: {
            closeTime: { not: null },
          },
        },
      },
    })

    // Calculate statistics
    let totalBalance = 0
    let totalProfit = 0
    let totalStartBalance = 0
    let totalTrades = 0
    let winningTrades = 0
    let totalDrawdown = 0

    accounts.forEach((account) => {
      totalBalance += account.currentBalance
      totalProfit += account.profit
      totalStartBalance += account.startBalance
      totalDrawdown += account.drawdown

      account.trades.forEach((trade) => {
        totalTrades++
        if (trade.profit && trade.profit > 0) {
          winningTrades++
        }
      })
    })

    const profitPercentage = totalStartBalance > 0
      ? ((totalBalance - totalStartBalance) / totalStartBalance) * 100
      : 0

    const winRate = totalTrades > 0
      ? (winningTrades / totalTrades) * 100
      : 0

    const avgDrawdown = accounts.length > 0
      ? totalDrawdown / accounts.length
      : 0

    return NextResponse.json({
      totalBalance,
      totalProfit,
      profitPercentage,
      activeAccounts: accounts.filter(a => a.status === "ACTIVE").length,
      totalTrades,
      winRate,
      avgDrawdown,
      accounts: accounts.map(acc => ({
        id: acc.id,
        login: acc.login,
        broker: acc.broker,
        currentBalance: acc.currentBalance,
        profit: acc.profit,
        status: acc.status,
      })),
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
