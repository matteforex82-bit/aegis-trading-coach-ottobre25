"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatCurrency } from "@/lib/utils"

interface MonthlyData {
  month: string
  profit: number
  trades: number
}

interface MonthlyPerformanceProps {
  data: MonthlyData[]
}

export function MonthlyPerformance({ data }: MonthlyPerformanceProps) {
  // Format month labels
  const chartData = data.map(point => ({
    ...point,
    monthLabel: new Date(point.month + '-01').toLocaleDateString('en-US', {
      month: 'short',
      year: '2-digit'
    }),
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium">{data.monthLabel}</p>
          <p className={`text-sm font-semibold ${data.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Profit: {formatCurrency(data.profit)}
          </p>
          <p className="text-sm text-muted-foreground">
            Trades: {data.trades}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Performance</CardTitle>
        <CardDescription>Profit breakdown by month</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="monthLabel"
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                className="text-xs text-muted-foreground"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="profit" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.profit >= 0 ? '#22c55e' : '#ef4444'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No monthly data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
