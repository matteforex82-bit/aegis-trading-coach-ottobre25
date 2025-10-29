"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Loader2, CreditCard, Zap } from "lucide-react"
import { PlanChangeModal } from "@/components/billing/PlanChangeModal"
import { SubscriptionPlan } from "@prisma/client"

interface SubscriptionStatus {
  plan: string
  status: string
  hasActiveSubscription: boolean
  isSubscriptionValid: boolean
  isExistingUser?: boolean
}

interface SubscriptionGuardProps {
  children: React.ReactNode
}

export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  // Check if user is in checkout flow (has plan parameter)
  const isCheckoutFlow = searchParams.get('plan') !== null

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

  // Allow checkout flow to proceed without subscription check
  if (isCheckoutFlow) {
    console.log('[SubscriptionGuard] Checkout flow detected, allowing access')
    return <>{children}</>
  }

  // If no active subscription, show appropriate message based on user type
  if (!subscription?.hasActiveSubscription || !subscription?.isSubscriptionValid) {
    // EXISTING USER - Show upgrade modal/call-to-action
    if (subscription?.isExistingUser) {
      return (
        <div className="flex items-center justify-center h-full p-8">
          <Card className="max-w-2xl w-full">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Upgrade Your Plan</CardTitle>
              <CardDescription>
                Continue your trading journey with a premium plan
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  To access AEGIS Trading Coach platform features including advanced trading analytics, account management, MT5 execution, and risk management tools, please subscribe to one of our plans.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button
                  size="lg"
                  onClick={() => setShowUpgradeModal(true)}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  Upgrade Plan
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push('/settings/billing')}
                >
                  Manage Billing
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Choose a plan and get instant access to all features
              </p>
            </CardContent>
          </Card>

          {/* Plan Change Modal */}
          <PlanChangeModal
            open={showUpgradeModal}
            onOpenChange={setShowUpgradeModal}
            currentPlan={subscription?.plan as SubscriptionPlan}
          />
        </div>
      )
    }

    // NEW USER - Show pricing page link (fallback, shouldn't normally happen)
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
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Choose a plan and get instant access to all features
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // If subscription is active and valid, show protected content
  return <>{children}</>
}
