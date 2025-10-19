"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  CheckCircle2,
  RefreshCw,
  Calendar,
  XCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react"
import { AssetCategory, SetupDirection } from "@prisma/client"

interface ParsedSetup {
  category: AssetCategory
  symbol: string
  direction: SetupDirection
  timeframe: string
  entryPrice: number
  stopLoss: number
  analysisDate: Date | string
}

interface ExistingSetupSummary {
  id: string
  symbol: string
  category: AssetCategory
  direction: SetupDirection
  entryPrice: number
  stopLoss: number
  analysisDate: Date | string
}

interface ValidationError {
  field: string
  message: string
  value?: any
}

interface PreviewItem {
  index: number
  setup: ParsedSetup
  action: "INSERT" | "UPDATE" | "UPDATE_DATE_ONLY" | "SKIP" | "ERROR"
  reason: string
  existingSetup?: ExistingSetupSummary | null
  errors?: ValidationError[]
}

interface PreviewStats {
  total: number
  toInsert: number
  toUpdate: number
  toUpdateDateOnly: number
  errors: number
  byCategory?: Record<string, number>
  byDirection?: Record<string, number>
}

interface ImportPreviewProps {
  items: PreviewItem[]
  stats: PreviewStats
  parseErrors?: Array<{
    index: number
    setupSymbol?: string
    errors: ValidationError[]
    action: "ERROR"
  }>
  onConfirm: () => void
  onCancel: () => void
  loading?: boolean
}

export function ImportPreview({
  items,
  stats,
  parseErrors = [],
  onConfirm,
  onCancel,
  loading = false,
}: ImportPreviewProps) {
  const formatPrice = (price: number) => {
    return price.toFixed(price < 1 ? 5 : 2)
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getActionBadge = (action: PreviewItem["action"]) => {
    switch (action) {
      case "INSERT":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Insert
          </Badge>
        )
      case "UPDATE":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <RefreshCw className="h-3 w-3 mr-1" />
            Update
          </Badge>
        )
      case "UPDATE_DATE_ONLY":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Calendar className="h-3 w-3 mr-1" />
            Date Only
          </Badge>
        )
      case "ERROR":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="secondary">Skip</Badge>
    }
  }

  const getDirectionIcon = (direction: SetupDirection) => {
    return direction === "BUY" ? (
      <TrendingUp className="h-3 w-3 text-green-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-600" />
    )
  }

  // Combine items and parse errors
  const allItems = [
    ...items,
    ...parseErrors.map((err) => ({
      index: err.index,
      setup: { symbol: err.setupSymbol || "Unknown" } as any,
      action: err.action,
      reason: "Validation errors found",
      errors: err.errors,
    })),
  ].sort((a, b) => a.index - b.index)

  const hasErrors = stats.errors > 0
  const hasChanges = stats.toInsert + stats.toUpdate + stats.toUpdateDateOnly > 0

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Setups
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Insert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.toInsert}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.toUpdate}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Date Only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.toUpdateDateOnly}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Errors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
          </CardContent>
        </Card>
      </div>

      {/* Error Warning */}
      {hasErrors && (
        <Card className="border-red-500/50 bg-red-500/5">
          <CardHeader>
            <CardTitle className="text-red-600 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Validation Errors Found
            </CardTitle>
            <CardDescription>
              {stats.errors} setup{stats.errors > 1 ? "s have" : " has"} validation errors.
              Please review and fix the errors before importing.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Preview Table */}
      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
          <CardDescription>
            Review the changes that will be made to your trading setups
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList>
              <TabsTrigger value="all">All ({allItems.length})</TabsTrigger>
              <TabsTrigger value="insert">Insert ({stats.toInsert})</TabsTrigger>
              <TabsTrigger value="update">Update ({stats.toUpdate})</TabsTrigger>
              <TabsTrigger value="date">Date Only ({stats.toUpdateDateOnly})</TabsTrigger>
              {hasErrors && (
                <TabsTrigger value="errors" className="text-red-600">
                  Errors ({stats.errors})
                </TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="all" className="mt-4">
              <PreviewTable items={allItems} />
            </TabsContent>

            <TabsContent value="insert" className="mt-4">
              <PreviewTable items={allItems.filter((i) => i.action === "INSERT")} />
            </TabsContent>

            <TabsContent value="update" className="mt-4">
              <PreviewTable items={allItems.filter((i) => i.action === "UPDATE")} />
            </TabsContent>

            <TabsContent value="date" className="mt-4">
              <PreviewTable items={allItems.filter((i) => i.action === "UPDATE_DATE_ONLY")} />
            </TabsContent>

            {hasErrors && (
              <TabsContent value="errors" className="mt-4">
                <PreviewTable items={allItems.filter((i) => i.action === "ERROR")} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {hasChanges && !hasErrors && (
            <span className="text-green-600 font-medium">
              ✓ Ready to import {stats.toInsert + stats.toUpdate + stats.toUpdateDateOnly} setup
              {stats.toInsert + stats.toUpdate + stats.toUpdateDateOnly > 1 ? "s" : ""}
            </span>
          )}
          {hasErrors && (
            <span className="text-red-600 font-medium">
              ✗ Cannot import with validation errors
            </span>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={hasErrors || !hasChanges || loading}>
            {loading ? "Importing..." : "Confirm Import"}
          </Button>
        </div>
      </div>
    </div>
  )
}

function PreviewTable({ items }: { items: PreviewItem[] }) {
  const formatPrice = (price: number) => {
    return price.toFixed(price < 1 ? 5 : 2)
  }

  const formatDate = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  }

  const getActionBadge = (action: PreviewItem["action"]) => {
    switch (action) {
      case "INSERT":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Insert
          </Badge>
        )
      case "UPDATE":
        return (
          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
            <RefreshCw className="h-3 w-3 mr-1" />
            Update
          </Badge>
        )
      case "UPDATE_DATE_ONLY":
        return (
          <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">
            <Calendar className="h-3 w-3 mr-1" />
            Date Only
          </Badge>
        )
      case "ERROR":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      default:
        return <Badge variant="secondary">Skip</Badge>
    }
  }

  const getDirectionIcon = (direction: SetupDirection) => {
    return direction === "BUY" ? (
      <TrendingUp className="h-3 w-3 text-green-600" />
    ) : (
      <TrendingDown className="h-3 w-3 text-red-600" />
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No items to display
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>Action</TableHead>
            <TableHead>Symbol</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Direction</TableHead>
            <TableHead>Entry</TableHead>
            <TableHead>Stop Loss</TableHead>
            <TableHead>Timeframe</TableHead>
            <TableHead>Details</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.index}>
              <TableCell className="font-mono text-xs">{item.index + 1}</TableCell>
              <TableCell>{getActionBadge(item.action)}</TableCell>
              <TableCell className="font-semibold">{item.setup?.symbol || "N/A"}</TableCell>
              <TableCell>
                {item.setup?.category && (
                  <Badge variant="outline">{item.setup.category}</Badge>
                )}
              </TableCell>
              <TableCell>
                {item.setup?.direction && (
                  <div className="flex items-center gap-1">
                    {getDirectionIcon(item.setup.direction)}
                    <span className="text-xs">{item.setup.direction}</span>
                  </div>
                )}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.setup?.entryPrice && formatPrice(item.setup.entryPrice)}
              </TableCell>
              <TableCell className="font-mono text-xs">
                {item.setup?.stopLoss && formatPrice(item.setup.stopLoss)}
              </TableCell>
              <TableCell>{item.setup?.timeframe}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-[200px]">
                {item.errors && item.errors.length > 0 ? (
                  <div className="space-y-1">
                    {item.errors.map((err, i) => (
                      <div key={i} className="text-red-600">
                        <span className="font-semibold">{err.field}:</span> {err.message}
                      </div>
                    ))}
                  </div>
                ) : (
                  <span>{item.reason}</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
