import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, CreditCard, Calendar, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { BillingManagement } from '@/components/billing/BillingManagement'
import { PlanActions } from '@/components/billing/PlanActions'

export const metadata: Metadata = {
  title: 'Billing - Settings',
  description: 'Manage your subscription and billing details',
}

const PLAN_DETAILS = {
  FREE: {
    name: 'Free',
    price: 0,
    features: ['1 Trading Account', '1 API Key', '7 Days Retention'],
    color: 'bg-gray-500',
  },
  STARTER: {
    name: 'Starter',
    price: 29,
    features: ['1 Trading Account', '2 API Keys', '30 Days Retention'],
    color: 'bg-blue-500',
  },
  PRO: {
    name: 'Pro',
    price: 99,
    features: ['5 Trading Accounts', '5 API Keys', '90 Days Retention', 'Advanced Analytics'],
    color: 'bg-purple-500',
  },
  ENTERPRISE: {
    name: 'Enterprise',
    price: 299,
    features: ['Unlimited Accounts', 'Unlimited Keys', '365 Days Retention', 'Full Features'],
    color: 'bg-gradient-to-r from-orange-500 to-pink-500',
  },
}

const STATUS_BADGES = {
  ACTIVE: { label: 'Active', variant: 'default' as const, icon: CheckCircle2 },
  TRIAL: { label: 'Trial', variant: 'secondary' as const, icon: Clock },
  PAST_DUE: { label: 'Past Due', variant: 'destructive' as const, icon: AlertCircle },
  CANCELED: { label: 'Canceled', variant: 'outline' as const, icon: XCircle },
  EXPIRED: { label: 'Expired', variant: 'destructive' as const, icon: XCircle },
}

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

export default async function BillingPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.email) {
    redirect('/auth/signin')
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      email: true,
      name: true,
      plan: true,
      status: true,
      stripeCustomerId: true,
      subscriptionId: true,
      currentPeriodStart: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      cancelAtPeriodEnd: true,
      subscription: {
        select: {
          stripeSubscriptionId: true,
          stripePriceId: true,
          status: true,
          canceledAt: true,
          createdAt: true,
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
    },
  })

  if (!user) {
    redirect('/auth/signin')
  }

  const planDetails = PLAN_DETAILS[user.plan]
  const statusBadge = STATUS_BADGES[user.status]
  const StatusIcon = statusBadge.icon

  const isOnTrial = user.status === 'TRIAL' && user.trialEndsAt
  const trialDaysLeft = isOnTrial
    ? Math.ceil((new Date(user.trialEndsAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0

  return (
    <div className="space-y-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </Button>
        <h1 className="text-3xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan and billing information
        </p>
      </div>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>You are currently on the {planDetails.name} plan</CardDescription>
            </div>
            <Badge variant={statusBadge.variant} className="flex items-center gap-1">
              <StatusIcon className="h-3 w-3" />
              {statusBadge.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold">${planDetails.price}</span>
            {planDetails.price > 0 && <span className="text-muted-foreground">/month</span>}
          </div>

          {/* Trial Notice */}
          {isOnTrial && trialDaysLeft > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900 dark:text-blue-100">
                  Trial Active - {trialDaysLeft} days remaining
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                  Your trial ends on {new Date(user.trialEndsAt!).toLocaleDateString()}. You won't be charged until then.
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Notice */}
          {user.cancelAtPeriodEnd && user.currentPeriodEnd && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-orange-900 dark:text-orange-100">
                  Subscription Ending
                </p>
                <p className="text-sm text-orange-700 dark:text-orange-300 mt-1">
                  Your subscription will end on {new Date(user.currentPeriodEnd).toLocaleDateString()}. You will be downgraded to the Free plan.
                </p>
              </div>
            </div>
          )}

          {/* Plan Features */}
          <div>
            <h3 className="font-semibold mb-3">Plan Features</h3>
            <ul className="space-y-2">
              {planDetails.features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Billing Period */}
          {user.currentPeriodEnd && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Next billing date: {new Date(user.currentPeriodEnd).toLocaleDateString()}
            </div>
          )}

          {/* Action Buttons */}
          <PlanActions currentPlan={user.plan} />
        </CardContent>
      </Card>

      {/* Billing Management Component */}
      {user.stripeCustomerId && (
        <BillingManagement
          stripeCustomerId={user.stripeCustomerId}
          subscriptionId={user.subscriptionId}
          cancelAtPeriodEnd={user.cancelAtPeriodEnd}
        />
      )}

      {/* Recent Invoices */}
      {user.subscription?.invoices && user.subscription.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Your recent billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.subscription.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        ${(invoice.amount / 100).toFixed(2)} {invoice.currency}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
            {user.stripeCustomerId && (
              <Button variant="link" className="mt-4 p-0" asChild>
                <a
                  href={`https://billing.stripe.com/p/login/test_${user.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View all invoices →
                </a>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Support Card */}
      <Card>
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
          <CardDescription>Questions about billing or your subscription?</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Our support team is here to help with any billing questions or issues.
            </p>
            <Button variant="outline" asChild>
              <Link href="/contact">Contact Support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
