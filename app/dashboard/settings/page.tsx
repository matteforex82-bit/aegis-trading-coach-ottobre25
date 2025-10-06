"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings as SettingsIcon } from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Settings page is under development
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <SettingsIcon className="w-24 h-24 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            This page will include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Profile settings</li>
            <li>• Password change</li>
            <li>• Notification preferences</li>
            <li>• Theme customization</li>
            <li>• API key management</li>
            <li>• Export/import data</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
