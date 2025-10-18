"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatCurrency } from "@/lib/utils"

interface EquityPoint {
  date: string
  profit: number
  trade: number
}

interface ProfitChartProps {
  data: EquityPoint[]
}

export function ProfitChart({ data }: ProfitChartProps) {
  // Format data for chart
  const chartData = data.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{payload[0].payload.date}</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            Cumulative: {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            Trade: {formatCurrency(payload[0].payload.trade)}
          </p>
        </div>
      )
    }
    return null
  }

  const finalProfit = data.length > 0 ? data[data.length - 1].profit : 0
  const isPositive = finalProfit >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>Equity Curve</CardTitle>
        <CardDescription>
          Cumulative profit over time
          <span className={`ml-2 font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(finalProfit)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="profit"
                stroke={isPositive ? "#22c55e" : "#ef4444"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No trade data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
