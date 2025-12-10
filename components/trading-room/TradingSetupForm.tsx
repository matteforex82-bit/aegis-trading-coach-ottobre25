"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
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
  expiresAt?: Date | string | null
  notes?: string | null
  pdfUrl?: string | null
}

interface TradingSetupFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  setup?: TradingSetup | null
  onSuccess: () => void
}

export function TradingSetupForm({ open, onOpenChange, setup, onSuccess }: TradingSetupFormProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  // Form state
  const [category, setCategory] = useState<AssetCategory>("FOREX")
  const [symbol, setSymbol] = useState("")
  const [direction, setDirection] = useState<SetupDirection>("BUY")
  const [timeframe, setTimeframe] = useState("")
  const [wavePattern, setWavePattern] = useState("")
  const [waveCount, setWaveCount] = useState("")
  const [entryPrice, setEntryPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit1, setTakeProfit1] = useState("")
  const [takeProfit2, setTakeProfit2] = useState("")
  const [takeProfit3, setTakeProfit3] = useState("")
  const [invalidation, setInvalidation] = useState("")
  const [analysisDate, setAnalysisDate] = useState("")
  const [expiresAt, setExpiresAt] = useState("")
  const [notes, setNotes] = useState("")
  const [pdfUrl, setPdfUrl] = useState("")

  // Load setup data when editing
  useEffect(() => {
    if (setup) {
      setCategory(setup.category)
      setSymbol(setup.symbol)
      setDirection(setup.direction)
      setTimeframe(setup.timeframe)
      setWavePattern(setup.wavePattern || "")
      setWaveCount(setup.waveCount || "")
      setEntryPrice(setup.entryPrice.toString())
      setStopLoss(setup.stopLoss.toString())
      setTakeProfit1(setup.takeProfit1?.toString() || "")
      setTakeProfit2(setup.takeProfit2?.toString() || "")
      setTakeProfit3(setup.takeProfit3?.toString() || "")
      setInvalidation(setup.invalidation?.toString() || "")
      setAnalysisDate(
        new Date(setup.analysisDate).toISOString().split("T")[0]
      )
      setExpiresAt(
        setup.expiresAt
          ? new Date(setup.expiresAt).toISOString().split("T")[0]
          : ""
      )
      setNotes(setup.notes || "")
      setPdfUrl(setup.pdfUrl || "")
    } else {
      // Reset form for new setup
      resetForm()
    }
  }, [setup])

  const resetForm = () => {
    setCategory("FOREX")
    setSymbol("")
    setDirection("BUY")
    setTimeframe("")
    setWavePattern("")
    setWaveCount("")
    setEntryPrice("")
    setStopLoss("")
    setTakeProfit1("")
    setTakeProfit2("")
    setTakeProfit3("")
    setInvalidation("")
    setAnalysisDate(new Date().toISOString().split("T")[0])
    setExpiresAt("")
    setNotes("")
    setPdfUrl("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Handle MARKET orders: if entryPrice is 0 or "MARKET", set to null
      const entryPriceValue = entryPrice.trim().toUpperCase() === "MARKET" || parseFloat(entryPrice) === 0
        ? null
        : parseFloat(entryPrice);

      const payload = {
        category,
        symbol: symbol.trim().toUpperCase(),
        direction,
        timeframe: timeframe.trim(),
        wavePattern: wavePattern.trim() || null,
        waveCount: waveCount.trim() || null,
        entryPrice: entryPriceValue,
        stopLoss: parseFloat(stopLoss),
        takeProfit1: takeProfit1 ? parseFloat(takeProfit1) : null,
        takeProfit2: takeProfit2 ? parseFloat(takeProfit2) : null,
        takeProfit3: takeProfit3 ? parseFloat(takeProfit3) : null,
        invalidation: invalidation ? parseFloat(invalidation) : null,
        analysisDate: new Date(analysisDate).toISOString(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        notes: notes.trim() || null,
        pdfUrl: pdfUrl.trim() || null,
      }

      const url = setup
        ? `/api/admin/trading-setups/${setup.id}`
        : "/api/admin/trading-setups"
      const method = setup ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to save setup")
      }

      toast({
        title: "Success",
        description: setup
          ? "Trading setup updated successfully"
          : "Trading setup created successfully",
      })

      resetForm()
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      console.error("Error saving setup:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to save trading setup",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {setup ? "Edit Trading Setup" : "Create Trading Setup"}
          </DialogTitle>
          <DialogDescription>
            {setup
              ? "Update the trading setup details below"
              : "Add a new curated trading setup for your users"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category and Symbol */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as AssetCategory)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FOREX">FOREX</SelectItem>
                  <SelectItem value="INDICES">Indices</SelectItem>
                  <SelectItem value="COMMODITIES">Commodities</SelectItem>
                  <SelectItem value="BITCOIN">Bitcoin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbol">Symbol *</Label>
              <Input
                id="symbol"
                placeholder="e.g., EURUSD, US30, XAUUSD"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Direction and Timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="direction">Direction *</Label>
              <Select value={direction} onValueChange={(v) => setDirection(v as SetupDirection)}>
                <SelectTrigger id="direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                  <SelectItem value="NEUTRAL">NEUTRAL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframe">Timeframe *</Label>
              <Input
                id="timeframe"
                placeholder="e.g., 4h, 1D, 3D"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Elliott Wave Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wavePattern">Wave Pattern</Label>
              <Input
                id="wavePattern"
                placeholder="e.g., Wave 3 Impulse"
                value={wavePattern}
                onChange={(e) => setWavePattern(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="waveCount">Wave Count</Label>
              <Input
                id="waveCount"
                placeholder="e.g., 1-2-3-4-5"
                value={waveCount}
                onChange={(e) => setWaveCount(e.target.value)}
              />
            </div>
          </div>

          {/* Entry and Stop Loss */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="entryPrice">Entry Price (0 or MARKET for immediate execution)</Label>
              <Input
                id="entryPrice"
                type="text"
                placeholder="Enter price, 0, or MARKET"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stopLoss">Stop Loss *</Label>
              <Input
                id="stopLoss"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Take Profit Levels */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="takeProfit1">Take Profit 1</Label>
              <Input
                id="takeProfit1"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                value={takeProfit1}
                onChange={(e) => setTakeProfit1(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeProfit2">Take Profit 2</Label>
              <Input
                id="takeProfit2"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                value={takeProfit2}
                onChange={(e) => setTakeProfit2(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="takeProfit3">Take Profit 3</Label>
              <Input
                id="takeProfit3"
                type="number"
                step="0.00001"
                placeholder="0.00000"
                value={takeProfit3}
                onChange={(e) => setTakeProfit3(e.target.value)}
              />
            </div>
          </div>

          {/* Invalidation */}
          <div className="space-y-2">
            <Label htmlFor="invalidation">Invalidation Price</Label>
            <Input
              id="invalidation"
              type="number"
              step="0.00001"
              placeholder="0.00000"
              value={invalidation}
              onChange={(e) => setInvalidation(e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="analysisDate">Analysis Date *</Label>
              <Input
                id="analysisDate"
                type="date"
                value={analysisDate}
                onChange={(e) => setAnalysisDate(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiresAt">Expires At</Label>
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Analysis Notes</Label>
            <Textarea
              id="notes"
              placeholder="Additional analysis notes, context, or trading ideas..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* PDF URL */}
          <div className="space-y-2">
            <Label htmlFor="pdfUrl">PDF URL (Optional)</Label>
            <Input
              id="pdfUrl"
              type="url"
              placeholder="https://example.com/analysis.pdf"
              value={pdfUrl}
              onChange={(e) => setPdfUrl(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {setup ? "Update Setup" : "Create Setup"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
