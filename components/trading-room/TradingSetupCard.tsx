"use client"

import Link from "next/link"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  FileText,
  AlertTriangle,
  Target,
  Shield
} from "lucide-react"
import { AssetCategory, SetupDirection } from "@prisma/client"

interface TradingSetup {
  id: string
  category: AssetCategory
  symbol: string
  direction: SetupDirection
  timeframe: string
  wavePattern?: string | null
  waveCount?: string | null
  entryPrice: number
  stopLoss: number
  takeProfit1?: number | null
  takeProfit2?: number | null
  takeProfit3?: number | null
  invalidation?: number | null
  analysisDate: Date | string
  publishedAt: Date | string
  expiresAt?: Date | string | null
  notes?: string | null
  pdfUrl?: string | null
  isPremium: boolean
  isActive: boolean
}

interface TradingSetupCardProps {
  setup: TradingSetup
  isAdmin?: boolean
  onEdit?: (setup: TradingSetup) => void
  onDelete?: (setupId: string) => void
}

export function TradingSetupCard({ setup, isAdmin = false, onEdit, onDelete }: TradingSetupCardProps) {
  const directionIcon = {
    BUY: <TrendingUp className="h-4 w-4" />,
    SELL: <TrendingDown className="h-4 w-4" />,
    NEUTRAL: <Minus className="h-4 w-4" />,
  }[setup.direction]

  const directionColor = {
    BUY: "bg-green-500/10 text-green-600 border-green-500/20",
    SELL: "bg-red-500/10 text-red-600 border-red-500/20",
    NEUTRAL: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  }[setup.direction]

  const categoryColor = {
    FOREX: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    INDICES: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    COMMODITIES: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    BITCOIN: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  }[setup.category]

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const formatPrice = (price: number) => {
    return price.toFixed(price < 1 ? 5 : 2)
  }

  const calculateRiskReward = () => {
    if (!setup.takeProfit1) return null
    const risk = Math.abs(setup.entryPrice - setup.stopLoss)
    const reward = Math.abs(setup.takeProfit1 - setup.entryPrice)
    return (reward / risk).toFixed(2)
  }

  const riskReward = calculateRiskReward()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl font-bold">{setup.symbol}</CardTitle>
            <Badge variant="outline" className={directionColor}>
              {directionIcon}
              {setup.direction}
            </Badge>
            <Badge variant="outline" className={categoryColor}>
              {setup.category}
            </Badge>
          </div>
          {isAdmin && !setup.isActive && (
            <Badge variant="secondary" className="bg-gray-500/10">
              Inactive
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-2">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {setup.timeframe}
          </div>
          {setup.wavePattern && (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {setup.wavePattern}
            </div>
          )}
          {setup.waveCount && (
            <Badge variant="outline" className="text-xs">
              {setup.waveCount}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Levels */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Entry Price</p>
            <p className="text-sm font-semibold">{formatPrice(setup.entryPrice)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Stop Loss</p>
            <p className="text-sm font-semibold text-red-600">{formatPrice(setup.stopLoss)}</p>
          </div>
        </div>

        {/* Take Profits */}
        {(setup.takeProfit1 || setup.takeProfit2 || setup.takeProfit3) && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3 w-3" />
              Take Profit Levels
            </p>
            <div className="flex gap-2">
              {setup.takeProfit1 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  TP1: {formatPrice(setup.takeProfit1)}
                </Badge>
              )}
              {setup.takeProfit2 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  TP2: {formatPrice(setup.takeProfit2)}
                </Badge>
              )}
              {setup.takeProfit3 && (
                <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                  TP3: {formatPrice(setup.takeProfit3)}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Risk/Reward and Invalidation */}
        <div className="flex items-center justify-between text-xs">
          {riskReward && (
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">R:R</span>
              <span className="font-semibold text-primary">1:{riskReward}</span>
            </div>
          )}
          {setup.invalidation && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <AlertTriangle className="h-3 w-3" />
              <span>Invalid @ {formatPrice(setup.invalidation)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {setup.notes && (
          <div className="bg-muted/50 p-3 rounded-md">
            <p className="text-xs text-muted-foreground mb-1">Analysis Notes</p>
            <p className="text-sm">{setup.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            <p>Published: {formatDate(setup.publishedAt)}</p>
            {setup.expiresAt && (
              <p className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="h-3 w-3" />
                Expires: {formatDate(setup.expiresAt)}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {!isAdmin && (
              <Button size="sm" asChild className={setup.direction === 'BUY' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}>
                <Link href={`/dashboard/trade-entry?setup=${setup.id}`}>
                  {setup.direction === 'BUY' ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  Trade This
                </Link>
              </Button>
            )}
            {setup.pdfUrl && (
              <Button variant="outline" size="sm" asChild>
                <a href={setup.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-4 w-4 mr-1" />
                  PDF
                </a>
              </Button>
            )}
            {isAdmin && (
              <>
                {onEdit && (
                  <Button variant="outline" size="sm" onClick={() => onEdit(setup)}>
                    Edit
                  </Button>
                )}
                {onDelete && (
                  <Button variant="destructive" size="sm" onClick={() => onDelete(setup.id)}>
                    Delete
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
