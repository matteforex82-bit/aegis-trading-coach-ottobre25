"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Key, Copy, Trash2, Plus, AlertCircle } from "lucide-react"
import { formatDate } from "@/lib/utils"
import copy from "copy-to-clipboard"

interface ApiKey {
  id: string
  name: string
  isActive: boolean
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
}

export function ApiKeyManager() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchApiKeys()
  }, [])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch("/api/settings/api-keys")
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch API keys",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setGeneratedKey(data.key)
        setNewKeyName("")
        fetchApiKeys()
        toast({
          title: "Success",
          description: "API key created successfully",
        })
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to create API key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  const revokeApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/settings/api-keys?id=${id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        fetchApiKeys()
        toast({
          title: "Success",
          description: "API key revoked successfully",
        })
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to revoke API key",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (text: string) => {
    copy(text)
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    })
  }

  const handleDialogClose = () => {
    setIsDialogOpen(false)
    setGeneratedKey(null)
    setNewKeyName("")
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              API Keys
            </CardTitle>
            <CardDescription>
              Manage your API keys for MT5/MT4 Expert Advisors
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New API Key</DialogTitle>
                <DialogDescription>
                  Create a new API key for your trading platform integration
                </DialogDescription>
              </DialogHeader>

              {generatedKey ? (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 flex gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <strong>Important:</strong> Save this key now. It will not be shown again!
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Your API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(generatedKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    <p className="mb-2">Next steps:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Copy this API key</li>
                      <li>Open your MT5 Expert Advisor settings</li>
                      <li>Paste the key in the API_KEY parameter</li>
                      <li>Save and restart the EA</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="keyName">Key Name</Label>
                    <Input
                      id="keyName"
                      placeholder="e.g., MT5 Account 123456"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") createApiKey()
                      }}
                    />
                    <p className="text-sm text-muted-foreground">
                      Choose a descriptive name to identify this key
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                {generatedKey ? (
                  <Button onClick={handleDialogClose}>Done</Button>
                ) : (
                  <>
                    <Button variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button onClick={createApiKey} disabled={isCreating}>
                      {isCreating ? "Generating..." : "Generate Key"}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No API keys yet</p>
            <p className="text-sm">Generate your first API key to connect MT5/MT4</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <Badge variant={key.isActive ? "default" : "secondary"}>
                      {key.isActive ? "Active" : "Revoked"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {key.lastUsedAt ? formatDate(key.lastUsedAt) : "Never"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(key.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {key.isActive && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately revoke the API key "{key.name}".
                              Your MT5/MT4 Expert Advisor will no longer be able to sync
                              data using this key.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokeApiKey(key.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Revoke Key
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
