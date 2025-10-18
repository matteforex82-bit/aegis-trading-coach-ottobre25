"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TradingSetupCard } from "@/components/trading-room/TradingSetupCard"
import { Loader2, Target, TrendingUp, Zap, Crown } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AssetCategory } from "@prisma/client"

interface TradingSetup {
  id: string
  category: AssetCategory
  symbol: string
  direction: "BUY" | "SELL" | "NEUTRAL"
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

interface GroupedSetups {
  FOREX: TradingSetup[]
  INDICES: TradingSetup[]
  COMMODITIES: TradingSetup[]
  BITCOIN: TradingSetup[]
}

export default function TradingRoomPage() {
  const [loading, setLoading] = useState(true)
  const [groupedSetups, setGroupedSetups] = useState<GroupedSetups>({
    FOREX: [],
    INDICES: [],
    COMMODITIES: [],
    BITCOIN: [],
  })
  const [error, setError] = useState<string | null>(null)
  const [requiresUpgrade, setRequiresUpgrade] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchSetups()
  }, [])

  const fetchSetups = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/trading-setups")

      if (response.status === 403) {
        const data = await response.json()
        setRequiresUpgrade(true)
        setError(data.message || "Premium subscription required")
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch trading setups")
      }

      const data = await response.json()
      setGroupedSetups(data.groupedSetups)
    } catch (err: any) {
      console.error("Error fetching setups:", err)
      setError(err.message || "Failed to load trading setups")
      toast({
        title: "Error",
        description: "Failed to load trading setups. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Show upgrade required message
  if (requiresUpgrade) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Crown className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">Trading Room - Premium Feature</CardTitle>
            <CardDescription>
              Access curated Elliott Wave trading setups with our PRO or ENTERPRISE plans
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                What you get:
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground ml-7">
                <li>Daily curated Elliott Wave analysis across FOREX, Indices, Commodities, and Bitcoin</li>
                <li>Clear entry, stop loss, and multiple take profit levels</li>
                <li>Wave counts and invalidation levels</li>
                <li>Access to full analysis PDFs</li>
                <li>Risk/Reward ratios calculated for each setup</li>
              </ul>
            </div>

            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" asChild>
                <a href="/dashboard/settings/billing">
                  <Zap className="h-4 w-4 mr-2" />
                  Upgrade to PRO
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Start your premium subscription today and gain access to professional trading setups
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Show error state
  if (error && !requiresUpgrade) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchSetups}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const getTotalCount = () => {
    return Object.values(groupedSetups).reduce((sum, setups) => sum + setups.length, 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Target className="h-8 w-8 text-primary" />
            Trading Room
          </h1>
          <p className="text-muted-foreground mt-1">
            Curated Elliott Wave trading setups across multiple asset classes
          </p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          <Crown className="h-3 w-3 mr-1" />
          Premium Feature
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Setups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{getTotalCount()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">FOREX</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{groupedSetups.FOREX.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Indices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{groupedSetups.INDICES.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Commodities & BTC</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {groupedSetups.COMMODITIES.length + groupedSetups.BITCOIN.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs by Category */}
      <Tabs defaultValue="FOREX" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="FOREX">
            FOREX ({groupedSetups.FOREX.length})
          </TabsTrigger>
          <TabsTrigger value="INDICES">
            Indices ({groupedSetups.INDICES.length})
          </TabsTrigger>
          <TabsTrigger value="COMMODITIES">
            Commodities ({groupedSetups.COMMODITIES.length})
          </TabsTrigger>
          <TabsTrigger value="BITCOIN">
            Bitcoin ({groupedSetups.BITCOIN.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="FOREX" className="mt-6">
          {groupedSetups.FOREX.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No FOREX setups available at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSetups.FOREX.map((setup) => (
                <TradingSetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="INDICES" className="mt-6">
          {groupedSetups.INDICES.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No Indices setups available at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSetups.INDICES.map((setup) => (
                <TradingSetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="COMMODITIES" className="mt-6">
          {groupedSetups.COMMODITIES.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No Commodities setups available at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSetups.COMMODITIES.map((setup) => (
                <TradingSetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="BITCOIN" className="mt-6">
          {groupedSetups.BITCOIN.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No Bitcoin setups available at the moment
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedSetups.BITCOIN.map((setup) => (
                <TradingSetupCard key={setup.id} setup={setup} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
