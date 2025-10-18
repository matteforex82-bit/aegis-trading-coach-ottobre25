import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: number
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

export function StatsCard({ title, value, description, icon: Icon, trend, variant = 'default' }: StatsCardProps) {
  const variantStyles = {
    default: '',
    success: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    destructive: 'border-red-500/50 bg-red-500/5',
  }

  const trendColor = trend !== undefined
    ? trend >= 0
      ? 'text-green-600 dark:text-green-400'
      : 'text-red-600 dark:text-red-400'
    : ''

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend !== undefined && (
          <p className={`text-xs mt-1 ${trendColor}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend).toFixed(2)}%
          </p>
        )}
      </CardContent>
    </Card>
  )
}
