"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BookOpen } from "lucide-react"

export default function JournalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Trading Journal</h2>
        <p className="text-muted-foreground">
          Document your trading thoughts and strategies
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
          <CardDescription>
            Trading journal feature is under development
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="w-24 h-24 text-muted-foreground mb-4" />
          <p className="text-center text-muted-foreground">
            This page will include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Daily trading notes</li>
            <li>• Trade-specific annotations</li>
            <li>• Market observations</li>
            <li>• Strategy refinements</li>
            <li>• Emotional tracking</li>
            <li>• Tags and categories</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
