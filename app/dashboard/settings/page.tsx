"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ApiKeyManager } from "@/components/settings/ApiKeyManager"
import { ProfileSettings } from "@/components/settings/ProfileSettings"
import { PasswordChange } from "@/components/settings/PasswordChange"
import { NotificationSettings } from "@/components/settings/NotificationSettings"
import { ThemeSettings } from "@/components/settings/ThemeSettings"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <PasswordChange />
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-6">
          <ApiKeyManager />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <ThemeSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
