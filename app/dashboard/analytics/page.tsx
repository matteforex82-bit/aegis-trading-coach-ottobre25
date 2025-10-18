"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, TrendingUp, Target, Award, Trophy, AlertTriangle } from "lucide-react"
import { StatsCard } from "@/components/analytics/StatsCard"
import { ProfitChart } from "@/components/analytics/ProfitChart"
import { MonthlyPerformance } from "@/components/analytics/MonthlyPerformance"
import { SymbolAnalysis } from "@/components/analytics/SymbolAnalysis"
import { formatCurrency } from "@/lib/utils"
import { SubscriptionGuard } from "@/components/subscription-guard"

interface AnalyticsData {
  summary: {
    totalTrades: number
    winningTrades: number
    losingTrades: number
    winRate: number
    profitFactor: number
    averageWin: number
    averageLoss: number
    averageRR: number
    bestTrade: number
    worstTrade: number
    totalProfit: number
    grossProfit: number
    grossLoss: number
  }
  equityCurve: Array<{
    date: string
    profit: number
    trade: number
  }>
  monthlyPerformance: Array<{
    month: string
    profit: number
    trades: number
  }>
  symbolAnalysis: Array<{
    symbol: string
    trades: number
    wins: number
    losses: number
    winRate: number
    profit: number
    volume: number
  }>
  weekdayAnalysis: Array<{
    day: string
    trades: number
    profit: number
    winRate: number
  }>
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    fetchAnalytics()
  }, [period])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/analytics?period=${period}`)
      if (response.ok) {
        const analyticsData = await response.json()
        setData(analyticsData)
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Failed to load analytics data
      </div>
    )
  }

  const { summary } = data

  // Determine variants based on performance
  const winRateVariant = summary.winRate >= 55 ? 'success' : summary.winRate >= 45 ? 'default' : 'warning'
  const profitFactorVariant = summary.profitFactor >= 2 ? 'success' : summary.profitFactor >= 1 ? 'default' : 'destructive'
  const rrVariant = summary.averageRR >= 2 ? 'success' : summary.averageRR >= 1 ? 'default' : 'warning'

  return (
    <SubscriptionGuard>
      <div className="space-y-6">
        {/* Header with Period Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
            <p className="text-muted-foreground">
              Advanced trading analytics and insights
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
              <SelectItem value="999999">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Win Rate"
            value={`${summary.winRate.toFixed(1)}%`}
            description={`${summary.winningTrades}W / ${summary.losingTrades}L`}
            icon={Target}
            variant={winRateVariant}
          />
          <StatsCard
            title="Profit Factor"
            value={summary.profitFactor >= 999 ? '∞' : summary.profitFactor.toFixed(2)}
            description={`${formatCurrency(summary.grossProfit)} / ${formatCurrency(summary.grossLoss)}`}
            icon={Award}
            variant={profitFactorVariant}
          />
          <StatsCard
            title="Average R:R"
            value={summary.averageRR.toFixed(2)}
            description={`Avg Win: ${formatCurrency(summary.averageWin)}`}
            icon={TrendingUp}
            variant={rrVariant}
          />
          <StatsCard
            title="Total Profit"
            value={formatCurrency(summary.totalProfit)}
            description={`${summary.totalTrades} total trades`}
            icon={Trophy}
            variant={summary.totalProfit >= 0 ? 'success' : 'destructive'}
          />
        </div>

        {/* Best & Worst Trade Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Best Trade</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.bestTrade)}</p>
                </div>
                <Trophy className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/50 bg-red-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Worst Trade</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.worstTrade)}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid gap-4 lg:grid-cols-2">
          <ProfitChart data={data.equityCurve} />
          <MonthlyPerformance data={data.monthlyPerformance} />
        </div>

        {/* Symbol Analysis */}
        <SymbolAnalysis data={data.symbolAnalysis} />

        {/* Weekday Analysis Card */}
        {data.weekdayAnalysis.length > 0 && (
          <Card>
            <CardContent className="pt-6">
              <h3 className="text-lg font-semibold mb-4">Performance by Day of Week</h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.weekdayAnalysis.map((day) => (
                  <div
                    key={day.day}
                    className="flex flex-col p-3 border rounded-lg"
                  >
                    <span className="text-sm font-medium text-muted-foreground">{day.day}</span>
                    <span className={`text-lg font-bold ${day.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(day.profit)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {day.trades} trades • {day.winRate.toFixed(0)}% WR
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SubscriptionGuard>
  )
}
