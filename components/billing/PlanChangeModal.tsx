'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { toast } from 'sonner'
import { SubscriptionPlan } from '@prisma/client'

interface PlanDetails {
  name: string
  price: number
  description: string
  features: string[]
  color: string
  recommended?: boolean
}

const PLAN_DETAILS: Record<SubscriptionPlan, PlanDetails> = {
  FREE: {
    name: 'Free',
    price: 0,
    description: 'Perfect for trying out AEGIS',
    features: ['1 Trading Account', '1 API Key', '7 Days Retention'],
    color: 'bg-gray-500',
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    description: 'For individual traders',
    features: ['1 Trading Account', '2 API Keys', '30 Days Retention'],
    color: 'bg-blue-500',
  },
  PRO: {
    name: 'Pro',
    price: 99,
    description: 'For serious traders',
    features: ['5 Trading Accounts', '5 API Keys', '90 Days Retention', 'Advanced Analytics'],
    color: 'bg-purple-500',
    recommended: true,
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    description: 'For trading teams',
    features: ['Unlimited Accounts', 'Unlimited Keys', '365 Days Retention', 'Full Features'],
    color: 'bg-gradient-to-r from-orange-500 to-pink-500',
  },
}

const PLAN_ORDER: SubscriptionPlan[] = ['FREE', 'STARTER', 'PRO', 'ENTERPRISE']

interface PlanChangeModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan: SubscriptionPlan
}

export function PlanChangeModal({ open, onOpenChange, currentPlan }: PlanChangeModalProps) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handlePlanChange = async (newPlan: SubscriptionPlan) => {
    if (newPlan === currentPlan) {
      toast.error('You are already on this plan')
      return
    }

    setSelectedPlan(newPlan)
    setIsLoading(true)

    try {
      const response = await fetch('/api/subscription/change-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: newPlan }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change plan')
      }

      // If there's a checkout URL, redirect to Stripe Checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      // Success - refresh the page to show updated data
      toast.success(`Successfully changed to ${PLAN_DETAILS[newPlan].name} plan!`)
      onOpenChange(false)
      router.refresh()
    } catch (error: any) {
      console.error('Error changing plan:', error)
      toast.error(error.message || 'Failed to change plan. Please try again.')
    } finally {
      setIsLoading(false)
      setSelectedPlan(null)
    }
  }

  const getComparisonIndicator = (plan: SubscriptionPlan) => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlan)
    const planIndex = PLAN_ORDER.indexOf(plan)

    if (planIndex > currentIndex) {
      return { icon: ArrowUpCircle, label: 'Upgrade', color: 'text-green-600' }
    } else if (planIndex < currentIndex) {
      return { icon: ArrowDownCircle, label: 'Downgrade', color: 'text-orange-600' }
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change Your Plan</DialogTitle>
          <DialogDescription>
            Select a new plan to upgrade or downgrade your subscription. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {PLAN_ORDER.map((plan) => {
            const details = PLAN_DETAILS[plan]
            const comparison = getComparisonIndicator(plan)
            const isCurrent = plan === currentPlan
            const isSelected = selectedPlan === plan

            return (
              <Card
                key={plan}
                className={`relative p-4 cursor-pointer transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/5'
                    : isSelected
                    ? 'border-primary shadow-md'
                    : 'hover:border-gray-400'
                }`}
                onClick={() => !isCurrent && !isLoading && handlePlanChange(plan)}
              >
                {/* Badges */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <Badge variant="default" className="text-xs">
                        Current Plan
                      </Badge>
                    )}
                    {details.recommended && !isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Recommended
                      </Badge>
                    )}
                  </div>
                  {comparison && !isCurrent && (
                    <div className={`flex items-center gap-1 text-xs font-medium ${comparison.color}`}>
                      {comparison.icon && <comparison.icon className="h-3 w-3" />}
                      {comparison.label}
                    </div>
                  )}
                </div>

                {/* Plan Name & Price */}
                <div className="mb-3">
                  <h3 className="text-xl font-bold">{details.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{details.description}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">${details.price}</span>
                    {details.price > 0 && <span className="text-muted-foreground text-sm">/month</span>}
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-2 mb-4">
                  {details.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                <Button
                  className="w-full"
                  variant={isCurrent ? 'outline' : 'default'}
                  disabled={isCurrent || isLoading}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isCurrent && !isLoading) {
                      handlePlanChange(plan)
                    }
                  }}
                >
                  {isLoading && isSelected ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrent ? (
                    'Current Plan'
                  ) : (
                    `Select ${details.name}`
                  )}
                </Button>
              </Card>
            )
          })}
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">Important Notes:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>• <strong>Upgrades</strong> are prorated and charged immediately</li>
            <li>• <strong>Downgrades</strong> take effect at the end of your current billing period</li>
            <li>• You can change your plan at any time</li>
            <li>• Unused credits from upgrades will be applied to your next invoice</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
