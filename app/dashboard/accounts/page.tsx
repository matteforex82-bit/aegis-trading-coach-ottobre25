"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Plus, RefreshCw, Trash2 } from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/utils"
import { AddAccountDialog } from "@/components/accounts/add-account-dialog"
import { ApiKeyButton } from "@/components/accounts/api-key-button"

interface TradingAccount {
  id: string
  login: string
  broker: string
  server?: string
  accountType: string
  status: string
  propFirm?: string
  phase?: string
  startBalance: number
  currentBalance: number
  equity?: number
  profit: number
  drawdown: number
  lastSyncAt?: string
  createdAt: string
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts")
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  const handleRefresh = () => {
    setIsRefreshing(true)
    fetchAccounts()
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return

    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setAccounts(accounts.filter(acc => acc.id !== id))
      }
    } catch (error) {
      console.error("Failed to delete account:", error)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "success" | "warning" | "destructive" | "secondary"> = {
      ACTIVE: "success",
      INACTIVE: "secondary",
      PASSED: "success",
      FAILED: "destructive",
      WITHDRAWN: "warning",
    }
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>
  }

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      DEMO: "bg-blue-100 text-blue-800",
      LIVE: "bg-green-100 text-green-800",
      CHALLENGE: "bg-yellow-100 text-yellow-800",
      FUNDED: "bg-purple-100 text-purple-800",
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[type] || "bg-gray-100 text-gray-800"}`}>
        {type}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Trading Accounts</h2>
          <p className="text-muted-foreground">
            Manage your MT4/MT5 trading accounts
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <AddAccountDialog onAccountAdded={fetchAccounts} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Accounts</CardTitle>
          <CardDescription>
            {accounts.length} account{accounts.length !== 1 ? "s" : ""} connected
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accounts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Broker</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Profit/Loss</TableHead>
                  <TableHead className="text-right">Drawdown</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Sync</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{account.login}</p>
                        {account.propFirm && (
                          <p className="text-xs text-muted-foreground">
                            {account.propFirm} - {account.phase}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getAccountTypeBadge(account.accountType)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{account.broker}</p>
                        {account.server && (
                          <p className="text-xs text-muted-foreground">{account.server}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(account.currentBalance)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${account.profit >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {formatCurrency(account.profit)}
                    </TableCell>
                    <TableCell className="text-right">
                      {account.drawdown.toFixed(2)}%
                    </TableCell>
                    <TableCell>{getStatusBadge(account.status)}</TableCell>
                    <TableCell>
                      {account.lastSyncAt ? (
                        <span className="text-sm">{formatDate(account.lastSyncAt)}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ApiKeyButton
                          accountId={account.id}
                          accountLogin={account.login}
                          broker={account.broker}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(account.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No accounts connected yet</p>
              <AddAccountDialog onAccountAdded={fetchAccounts} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
