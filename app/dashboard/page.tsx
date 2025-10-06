"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  DollarSign,
  Target,
  AlertTriangle,
} from "lucide-react"
import { formatCurrency, formatPercentage } from "@/lib/utils"

interface DashboardStats {
  totalBalance: number
  totalProfit: number
  profitPercentage: number
  activeAccounts: number
  totalTrades: number
  winRate: number
  avgDrawdown: number
  accounts: Array<{
    id: string
    login: string
    broker: string
    currentBalance: number
    profit: number
    status: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  const statCards = [
    {
      title: "Total Balance",
      value: formatCurrency(stats?.totalBalance || 0),
      icon: DollarSign,
      trend: stats?.profitPercentage || 0,
      trendLabel: "vs start balance",
    },
    {
      title: "Total Profit",
      value: formatCurrency(stats?.totalProfit || 0),
      icon: stats && stats.totalProfit >= 0 ? TrendingUp : TrendingDown,
      trend: stats?.profitPercentage || 0,
      variant: stats && stats.totalProfit >= 0 ? "success" : "destructive",
    },
    {
      title: "Active Accounts",
      value: stats?.activeAccounts || 0,
      icon: Wallet,
      description: "Trading accounts",
    },
    {
      title: "Total Trades",
      value: stats?.totalTrades || 0,
      icon: Activity,
      description: "All time",
    },
    {
      title: "Win Rate",
      value: `${(stats?.winRate || 0).toFixed(1)}%`,
      icon: Target,
      trend: stats?.winRate || 0,
      variant: stats && stats.winRate >= 50 ? "success" : "warning",
    },
    {
      title: "Avg Drawdown",
      value: `${(stats?.avgDrawdown || 0).toFixed(2)}%`,
      icon: AlertTriangle,
      variant: stats && stats.avgDrawdown < 5 ? "success" : "warning",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your trading performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend !== undefined && (
                <p className="text-xs text-muted-foreground">
                  <span
                    className={
                      stat.trend >= 0 ? "text-green-600" : "text-red-600"
                    }
                  >
                    {formatPercentage(stat.trend)}
                  </span>{" "}
                  {stat.trendLabel || ""}
                </p>
              )}
              {stat.description && (
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Accounts */}
      <Card>
        <CardHeader>
          <CardTitle>Active Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.accounts && stats.accounts.length > 0 ? (
            <div className="space-y-4">
              {stats.accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <p className="font-medium">{account.broker}</p>
                    <p className="text-sm text-muted-foreground">
                      Account: {account.login}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      {formatCurrency(account.currentBalance)}
                    </p>
                    <p
                      className={`text-sm ${
                        account.profit >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {formatCurrency(account.profit)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      account.status === "ACTIVE" ? "success" : "secondary"
                    }
                  >
                    {account.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active accounts yet</p>
              <p className="text-sm">Connect your MT4/MT5 account to get started</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
