import { Metadata } from 'next'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DollarSign, TrendingUp, Receipt, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Revenue Analytics - Admin',
  description: 'Financial metrics and revenue tracking',
}

async function getRevenueData() {
  // Get all paid invoices
  const allInvoices = await db.invoice.findMany({
    where: {
      status: 'paid',
    },
    include: {
      subscription: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      paidAt: 'desc',
    },
  })

  // Total revenue all time
  const totalRevenue = allInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  // Current month revenue
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const thisMonthInvoices = allInvoices.filter(
    (inv) => inv.paidAt && inv.paidAt >= startOfMonth
  )

  const thisMonthRevenue = thisMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  // Last month revenue
  const startOfLastMonth = new Date(startOfMonth)
  startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

  const lastMonthInvoices = allInvoices.filter((inv) => {
    if (!inv.paidAt) return false
    return inv.paidAt >= startOfLastMonth && inv.paidAt < startOfMonth
  })

  const lastMonthRevenue = lastMonthInvoices.reduce((sum, inv) => sum + inv.amount, 0)

  // Revenue growth percentage
  const revenueGrowth =
    lastMonthRevenue > 0
      ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
      : 0

  // MRR (active subscriptions)
  const activeSubscriptions = await db.user.findMany({
    where: {
      plan: {
        not: 'FREE',
      },
      status: 'ACTIVE',
    },
    select: {
      plan: true,
    },
  })

  const planPrices = {
    STARTER: 29,
    PRO: 99,
    ENTERPRISE: 299,
  }

  const mrr = activeSubscriptions.reduce((sum, sub) => {
    return sum + (planPrices[sub.plan as keyof typeof planPrices] || 0)
  }, 0)

  // ARR (Annual Recurring Revenue)
  const arr = mrr * 12

  // Average Revenue Per User (ARPU)
  const arpu = activeSubscriptions.length > 0 ? mrr / activeSubscriptions.length : 0

  // Revenue by plan
  const revenueByPlan = allInvoices.reduce((acc, inv) => {
    const plan = inv.subscription.plan
    acc[plan] = (acc[plan] || 0) + inv.amount
    return acc
  }, {} as Record<string, number>)

  // Recent transactions
  const recentInvoices = allInvoices.slice(0, 10)

  return {
    totalRevenue: totalRevenue / 100, // Convert from cents
    thisMonthRevenue: thisMonthRevenue / 100,
    lastMonthRevenue: lastMonthRevenue / 100,
    revenueGrowth,
    mrr,
    arr,
    arpu,
    revenueByPlan,
    recentInvoices,
    totalInvoices: allInvoices.length,
  }
}

export default async function RevenuePage() {
  const data = await getRevenueData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Revenue Analytics</h1>
        <p className="text-muted-foreground mt-2">
          Financial metrics and performance tracking
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.thisMonthRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={data.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.revenueGrowth >= 0 ? '+' : ''}
                {data.revenueGrowth.toFixed(1)}%
              </span>{' '}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              MRR / ARR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              ARR: ${data.arr.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              ARPU
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${data.arpu.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Average per user</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue by Plan</CardTitle>
          <CardDescription>Total revenue breakdown by subscription tier</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(data.revenueByPlan)
              .sort(([, a], [, b]) => b - a)
              .map(([plan, amount]) => (
                <div key={plan} className="flex items-center">
                  <div className="w-32 font-medium">{plan}</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{
                          width: `${(amount / data.totalRevenue / 100) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-32 text-right text-sm font-medium">
                    ${(amount / 100).toFixed(2)}
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest successful payments ({data.totalInvoices} total)</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice ID</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="text-sm">
                    {invoice.paidAt
                      ? new Date(invoice.paidAt).toLocaleDateString()
                      : new Date(invoice.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {invoice.subscription.user.name || 'No name'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.subscription.user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{invoice.subscription.plan}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">
                    ${(invoice.amount / 100).toFixed(2)} {invoice.currency}
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">{invoice.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded">
                      {invoice.stripeInvoiceId.slice(0, 12)}...
                    </code>
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
