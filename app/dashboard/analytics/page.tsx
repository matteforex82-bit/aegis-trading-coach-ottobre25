"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <p className="text-muted-foreground">
          Advanced trading analytics and insights
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Advanced analytics features are under development
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="w-24 h-24 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            This page will include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Performance charts and graphs</li>
            <li>• Win rate analysis</li>
            <li>• Profit factor metrics</li>
            <li>• Risk/reward ratios</li>
            <li>• Monthly performance breakdown</li>
            <li>• Symbol-based analytics</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
