"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { TradingSetupCard } from "@/components/trading-room/TradingSetupCard"
import { TradingSetupForm } from "@/components/trading-room/TradingSetupForm"
import { ImportSetupsTab } from "@/components/trading-room/ImportSetupsTab"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Shield, Upload } from "lucide-react"
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

export default function AdminTradingRoomPage() {
  const [loading, setLoading] = useState(true)
  const [setups, setSetups] = useState<TradingSetup[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingSetup, setEditingSetup] = useState<TradingSetup | null>(null)
  const [deletingSetupId, setDeletingSetupId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()

  useEffect(() => {
    fetchSetups()
  }, [])

  const fetchSetups = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/admin/trading-setups")

      if (response.status === 403) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive",
        })
        return
      }

      if (!response.ok) {
        throw new Error("Failed to fetch setups")
      }

      const data = await response.json()
      setSetups(data.setups)
    } catch (error: any) {
      console.error("Error fetching setups:", error)
      toast({
        title: "Error",
        description: "Failed to load trading setups",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (setup: TradingSetup) => {
    setEditingSetup(setup)
    setShowForm(true)
  }

  const handleDelete = async (setupId: string) => {
    try {
      const response = await fetch(`/api/admin/trading-setups/${setupId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete setup")
      }

      toast({
        title: "Success",
        description: "Trading setup deleted successfully",
      })

      fetchSetups()
    } catch (error: any) {
      console.error("Error deleting setup:", error)
      toast({
        title: "Error",
        description: "Failed to delete trading setup",
        variant: "destructive",
      })
    } finally {
      setDeletingSetupId(null)
    }
  }

  const handleFormSuccess = () => {
    fetchSetups()
    setEditingSetup(null)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingSetup(null)
  }

  const handleImportSuccess = () => {
    fetchSetups()
    setActiveTab("overview")
  }

  const groupedSetups = {
    FOREX: setups.filter((s) => s.category === "FOREX"),
    INDICES: setups.filter((s) => s.category === "INDICES"),
    COMMODITIES: setups.filter((s) => s.category === "COMMODITIES"),
    BITCOIN: setups.filter((s) => s.category === "BITCOIN"),
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            Admin - Trading Room
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage curated Elliott Wave trading setups for premium users
          </p>
        </div>
        {activeTab === "overview" && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Setup
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="import">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Setups</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{setups.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {setups.filter((s) => s.isActive).length} active
            </p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Commodities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{groupedSetups.COMMODITIES.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bitcoin</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{groupedSetups.BITCOIN.length}</div>
          </CardContent>
        </Card>
      </div>

          {/* Setups List */}
          <div className="space-y-6">
            {Object.entries(groupedSetups).map(([category, categorySetups]) => (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-xl font-semibold">{category}</h2>
                  <Badge variant="secondary">{categorySetups.length}</Badge>
                </div>

                {categorySetups.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No {category} setups yet. Click "Add Setup" to create one.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categorySetups.map((setup) => (
                      <TradingSetupCard
                        key={setup.id}
                        setup={setup}
                        isAdmin={true}
                        onEdit={handleEdit}
                        onDelete={(id) => setDeletingSetupId(id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="mt-6">
          <ImportSetupsTab onSuccess={handleImportSuccess} />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <TradingSetupForm
        open={showForm}
        onOpenChange={handleFormClose}
        setup={editingSetup}
        onSuccess={handleFormSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSetupId} onOpenChange={(open) => !open && setDeletingSetupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the trading setup.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingSetupId && handleDelete(deletingSetupId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
