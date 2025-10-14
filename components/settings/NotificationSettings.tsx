"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/components/ui/use-toast"
import { Bell } from "lucide-react"

interface Preferences {
  emailNotifications: boolean
  dailyReport: boolean
  drawdownAlert: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<Preferences>({
    emailNotifications: true,
    dailyReport: false,
    drawdownAlert: true,
  })
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch("/api/settings/preferences")
      if (response.ok) {
        const data = await response.json()
        setPreferences({
          emailNotifications: data.emailNotifications,
          dailyReport: data.dailyReport,
          drawdownAlert: data.drawdownAlert,
        })
      }
    } catch (error) {
      console.error("Failed to fetch preferences:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const updatePreference = async (key: keyof Preferences, value: boolean) => {
    const newPreferences = { ...preferences, [key]: value }
    setPreferences(newPreferences)

    try {
      const response = await fetch("/api/settings/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPreferences),
      })

      if (response.ok) {
        toast({
          title: "Saved",
          description: "Notification preferences updated",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to update preferences",
          variant: "destructive",
        })
        // Revert on error
        setPreferences(preferences)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      })
      // Revert on error
      setPreferences(preferences)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Configure your notification preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="email-notifications">Email Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Receive email notifications for important events
            </p>
          </div>
          <Switch
            id="email-notifications"
            checked={preferences.emailNotifications}
            onCheckedChange={(checked) =>
              updatePreference("emailNotifications", checked)
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="daily-report">Daily Report</Label>
            <p className="text-sm text-muted-foreground">
              Receive a daily summary of your trading activity
            </p>
          </div>
          <Switch
            id="daily-report"
            checked={preferences.dailyReport}
            onCheckedChange={(checked) => updatePreference("dailyReport", checked)}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="drawdown-alert">Drawdown Alert</Label>
            <p className="text-sm text-muted-foreground">
              Get alerted when drawdown exceeds safe limits
            </p>
          </div>
          <Switch
            id="drawdown-alert"
            checked={preferences.drawdownAlert}
            onCheckedChange={(checked) =>
              updatePreference("drawdownAlert", checked)
            }
          />
        </div>
      </CardContent>
    </Card>
  )
}
