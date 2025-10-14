import { Metadata } from 'next'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, TrendingUp, CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Subscriptions - Admin',
  description: 'Manage all platform subscriptions',
}

async function getSubscriptions() {
  const subscriptions = await db.subscription.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      _count: {
        select: {
          invoices: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Calculate stats
  const activeCount = subscriptions.filter((s) => s.status === 'ACTIVE').length
  const trialCount = subscriptions.filter((s) => s.status === 'TRIAL').length
  const pastDueCount = subscriptions.filter((s) => s.status === 'PAST_DUE').length
  const canceledCount = subscriptions.filter((s) => s.status === 'CANCELED').length

  const planPrices = {
    STARTER: 29,
    PRO: 99,
    ENTERPRISE: 299,
  }

  const totalMRR = subscriptions
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => {
      return sum + (planPrices[s.plan as keyof typeof planPrices] || 0)
    }, 0)

  return {
    subscriptions,
    stats: {
      activeCount,
      trialCount,
      pastDueCount,
      canceledCount,
      totalMRR,
    },
  }
}

export default async function SubscriptionsPage() {
  const { subscriptions, stats } = await getSubscriptions()

  const statusColors = {
    ACTIVE: 'default',
    TRIAL: 'secondary',
    PAST_DUE: 'destructive',
    CANCELED: 'outline',
    EXPIRED: 'destructive',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Subscriptions Management</h1>
        <p className="text-muted-foreground mt-2">
          Monitor and manage all platform subscriptions
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCount}</div>
            <p className="text-xs text-muted-foreground">Paying customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              On Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.trialCount}</div>
            <p className="text-xs text-muted-foreground">14-day free trial</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Past Due
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pastDueCount}</div>
            <p className="text-xs text-muted-foreground">Payment failed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalMRR.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Monthly revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>{subscriptions.length} total subscriptions</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Stripe ID</TableHead>
                <TableHead>Period End</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Auto-Renew</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.id}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${sub.user.id}`}
                      className="hover:underline"
                    >
                      <div className="font-medium">{sub.user.name || 'No name'}</div>
                      <div className="text-sm text-muted-foreground">{sub.user.email}</div>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge>{sub.plan}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[sub.status as keyof typeof statusColors] as any}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.stripeSubscriptionId ? (
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {sub.stripeSubscriptionId.slice(0, 16)}...
                      </code>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub.stripeCurrentPeriodEnd ? (
                      <div className="text-sm">
                        {new Date(sub.stripeCurrentPeriodEnd).toLocaleDateString()}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>{sub._count.invoices}</TableCell>
                  <TableCell>
                    {sub.cancelAtPeriodEnd ? (
                      <Badge variant="outline">Canceling</Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(sub.createdAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
