"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface Trade {
  id: string
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
  stopLoss?: number
  takeProfit?: number
  account: {
    login: string
    broker: string
  }
}

export default function TradesPage() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchTrades()
  }, [])

  const fetchTrades = async () => {
    try {
      const response = await fetch("/api/trades")
      if (response.ok) {
        const data = await response.json()
        setTrades(data)
      }
    } catch (error) {
      console.error("Failed to fetch trades:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const closedTrades = trades.filter(t => t.closeTime)
  const openTrades = trades.filter(t => !t.closeTime)

  const renderTradesTable = (tradesList: Trade[], showClosePrice: boolean = true) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ticket</TableHead>
          <TableHead>Symbol</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Volume</TableHead>
          <TableHead className="text-right">Open Price</TableHead>
          {showClosePrice && <TableHead className="text-right">Close Price</TableHead>}
          <TableHead className="text-right">Profit/Loss</TableHead>
          <TableHead>Open Time</TableHead>
          {showClosePrice && <TableHead>Close Time</TableHead>}
          <TableHead>Account</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {tradesList.length > 0 ? (
          tradesList.map((trade) => (
            <TableRow key={trade.id}>
              <TableCell className="font-mono text-sm">{trade.ticket}</TableCell>
              <TableCell className="font-medium">{trade.symbol}</TableCell>
              <TableCell>
                <Badge variant={trade.type === "BUY" ? "default" : "secondary"}>
                  {trade.type}
                </Badge>
              </TableCell>
              <TableCell>{trade.volume.toFixed(2)}</TableCell>
              <TableCell className="text-right">{trade.openPrice.toFixed(5)}</TableCell>
              {showClosePrice && (
                <TableCell className="text-right">
                  {trade.closePrice ? trade.closePrice.toFixed(5) : "-"}
                </TableCell>
              )}
              <TableCell className="text-right">
                {trade.profit !== undefined && trade.profit !== null ? (
                  <span className={trade.profit >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                    {trade.profit >= 0 ? (
                      <TrendingUp className="inline h-4 w-4 mr-1" />
                    ) : (
                      <TrendingDown className="inline h-4 w-4 mr-1" />
                    )}
                    {formatCurrency(trade.profit)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-sm">{formatDate(trade.openTime)}</TableCell>
              {showClosePrice && (
                <TableCell className="text-sm">
                  {trade.closeTime ? formatDate(trade.closeTime) : "-"}
                </TableCell>
              )}
              <TableCell>
                <div className="text-sm">
                  <p className="font-medium">{trade.account.broker}</p>
                  <p className="text-muted-foreground">{trade.account.login}</p>
                </div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={showClosePrice ? 10 : 9} className="text-center py-8 text-muted-foreground">
              No trades found
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trade History</h2>
        <p className="text-muted-foreground">
          View all your trading activity
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trades.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Open Positions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openTrades.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Closed Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedTrades.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Trades</CardTitle>
          <CardDescription>
            Browse your open positions and trade history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">All Trades</TabsTrigger>
              <TabsTrigger value="open">Open Positions ({openTrades.length})</TabsTrigger>
              <TabsTrigger value="closed">Closed ({closedTrades.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="space-y-4">
              {renderTradesTable(trades)}
            </TabsContent>
            <TabsContent value="open" className="space-y-4">
              {renderTradesTable(openTrades, false)}
            </TabsContent>
            <TabsContent value="closed" className="space-y-4">
              {renderTradesTable(closedTrades)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
