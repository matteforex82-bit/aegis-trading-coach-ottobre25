'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/alert-dialog'
import { Loader2, CreditCard, X, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface BillingManagementProps {
  stripeCustomerId: string
  subscriptionId: string | null
  cancelAtPeriodEnd: boolean
}

export function BillingManagement({
  stripeCustomerId,
  subscriptionId,
  cancelAtPeriodEnd,
}: BillingManagementProps) {
  const router = useRouter()
  const [isCanceling, setIsCanceling] = useState(false)
  const [isReactivating, setIsReactivating] = useState(false)
  const [isManagingPayment, setIsManagingPayment] = useState(false)

  const handleCancelSubscription = async () => {
    if (!subscriptionId) return

    setIsCanceling(true)
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to cancel subscription')
      }

      toast.success('Subscription canceled', {
        description: 'Your subscription will remain active until the end of the billing period.',
      })

      router.refresh()
    } catch (error) {
      console.error('Cancel subscription error:', error)
      toast.error('Failed to cancel subscription', {
        description: 'Please try again or contact support.',
      })
    } finally {
      setIsCanceling(false)
    }
  }

  const handleReactivateSubscription = async () => {
    if (!subscriptionId) return

    setIsReactivating(true)
    try {
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to reactivate subscription')
      }

      toast.success('Subscription reactivated', {
        description: 'Your subscription will continue at the end of the current period.',
      })

      router.refresh()
    } catch (error) {
      console.error('Reactivate subscription error:', error)
      toast.error('Failed to reactivate subscription', {
        description: 'Please try again or contact support.',
      })
    } finally {
      setIsReactivating(false)
    }
  }

  const handleManagePaymentMethod = async () => {
    setIsManagingPayment(true)
    try {
      const response = await fetch('/api/billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        throw new Error('Failed to create billing portal session')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Billing portal error:', error)
      toast.error('Failed to open billing portal', {
        description: 'Please try again or contact support.',
      })
      setIsManagingPayment(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription Management</CardTitle>
        <CardDescription>Manage your subscription and payment methods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Manage Payment Method */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Payment Method</p>
              <p className="text-sm text-muted-foreground">
                Update your credit card or billing information
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={handleManagePaymentMethod}
            disabled={isManagingPayment}
          >
            {isManagingPayment ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Manage'
            )}
          </Button>
        </div>

        {/* Cancel or Reactivate Subscription */}
        {subscriptionId && (
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {cancelAtPeriodEnd ? (
                <RotateCcw className="h-5 w-5 text-green-600" />
              ) : (
                <X className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {cancelAtPeriodEnd ? 'Reactivate Subscription' : 'Cancel Subscription'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {cancelAtPeriodEnd
                    ? 'Resume your subscription and continue with current plan'
                    : 'Cancel your subscription at the end of the billing period'}
                </p>
              </div>
            </div>

            {cancelAtPeriodEnd ? (
              <Button
                variant="outline"
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
              >
                {isReactivating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Reactivating...
                  </>
                ) : (
                  'Reactivate'
                )}
              </Button>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive hover:text-destructive">
                    Cancel
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel Subscription?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Your subscription will remain active until the end of your current billing
                      period. After that, you'll be downgraded to the Free plan.
                      <br />
                      <br />
                      You can reactivate your subscription at any time before it expires.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleCancelSubscription}
                      disabled={isCanceling}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isCanceling ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Canceling...
                        </>
                      ) : (
                        'Yes, Cancel Subscription'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
