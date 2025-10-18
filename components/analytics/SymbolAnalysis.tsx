"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/utils"
import { TrendingUp, TrendingDown } from "lucide-react"

interface SymbolData {
  symbol: string
  trades: number
  wins: number
  losses: number
  winRate: number
  profit: number
  volume: number
}

interface SymbolAnalysisProps {
  data: SymbolData[]
}

export function SymbolAnalysis({ data }: SymbolAnalysisProps) {
  // Sort by profit descending and take top 10
  const topSymbols = [...data]
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Symbol Performance</CardTitle>
        <CardDescription>Trading performance by instrument (top 10)</CardDescription>
      </CardHeader>
      <CardContent>
        {topSymbols.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win Rate</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="text-right">Volume</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topSymbols.map((symbol) => (
                  <TableRow key={symbol.symbol}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {symbol.profit >= 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        )}
                        {symbol.symbol}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-sm text-muted-foreground">
                        {symbol.trades} ({symbol.wins}W / {symbol.losses}L)
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={symbol.winRate >= 50 ? 'default' : 'secondary'}
                        className={symbol.winRate >= 50 ? 'bg-green-500' : ''}
                      >
                        {symbol.winRate.toFixed(1)}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-medium ${symbol.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(symbol.profit)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {symbol.volume.toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            No symbol data available
          </div>
        )}
      </CardContent>
    </Card>
  )
}
