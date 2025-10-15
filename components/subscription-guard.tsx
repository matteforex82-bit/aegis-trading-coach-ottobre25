"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, CreditCard } from "lucide-react"

interface SubscriptionStatus {
  plan: string
  status: string
  hasActiveSubscription: boolean
  isSubscriptionValid: boolean
}

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const response = await fetch("/api/user/subscription")
      if (response.ok) {
        const data = await response.json()
        setSubscription(data)
      }
    } catch (error) {
      console.error("Failed to check subscription:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    )
  }

  // If no active subscription, show upgrade message
  if (!subscription?.hasActiveSubscription || !subscription?.isSubscriptionValid) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Subscription Required</CardTitle>
            <CardDescription>
              You need an active subscription to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">
                <strong>Current Status:</strong> {subscription?.status || 'No subscription'}
              </p>
              <p className="text-sm text-muted-foreground">
                To access advanced trading analytics, account management, and all premium features, please subscribe to one of our plans.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                size="lg"
                onClick={() => router.push('/pricing')}
              >
                View Pricing Plans
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/dashboard/settings/billing')}
              >
                Manage Billing
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              All plans include a 14-day free trial
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If subscription is active and valid, show protected content
  return <>{children}</>
}
