import { Metadata } from 'next'
import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  AlertCircle,
  Target,
  Percent,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Admin Dashboard - AEGIS',
  description: 'SaaS analytics and user management',
}

async function getAdminStats() {
  // Date ranges
  const now = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Total users by plan
  const usersByPlan = await db.user.groupBy({
    by: ['plan'],
    _count: true,
  })

  // Total users by status
  const usersByStatus = await db.user.groupBy({
    by: ['status'],
    _count: true,
  })

  // Total users
  const totalUsers = await db.user.count()

  // Users created in last 30 days
  const newUsersLast30Days = await db.user.count({
    where: {
      createdAt: {
        gte: thirtyDaysAgo,
      },
    },
  })

  // Active subscriptions (not FREE)
  const activeSubscriptions = await db.user.count({
    where: {
      plan: {
        not: 'FREE',
      },
      status: {
        in: ['ACTIVE', 'TRIAL'],
      },
    },
  })

  // MRR Calculation (Monthly Recurring Revenue)
  const paidSubscriptions = await db.user.findMany({
    where: {
      plan: {
        not: 'FREE',
      },
      status: 'ACTIVE', // Only count active paying customers
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

  const mrr = paidSubscriptions.reduce((sum, sub) => {
    return sum + (planPrices[sub.plan as keyof typeof planPrices] || 0)
  }, 0)

  // Total invoices paid this month
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const invoicesThisMonth = await db.invoice.aggregate({
    where: {
      status: 'paid',
      paidAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      amount: true,
    },
    _count: true,
  })

  // Recent users
  const recentUsers = await db.user.findMany({
    take: 5,
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      status: true,
      createdAt: true,
    },
  })

  // Past due subscriptions
  const pastDueCount = await db.user.count({
    where: {
      status: 'PAST_DUE',
    },
  })

  // Canceled subscriptions in last 30 days (churn)
  const canceledLast30Days = await db.user.count({
    where: {
      status: 'CANCELED',
      updatedAt: {
        gte: thirtyDaysAgo,
      },
    },
  })

  // === ADVANCED METRICS ===

  // Churn Rate % (monthly)
  const payingUsersStartOfMonth = await db.user.count({
    where: {
      plan: { not: 'FREE' },
      status: { in: ['ACTIVE', 'TRIAL'] },
      createdAt: { lt: startOfThisMonth },
    },
  })
  const churnRate = payingUsersStartOfMonth > 0
    ? (canceledLast30Days / payingUsersStartOfMonth) * 100
    : 0

  // ARPU (Average Revenue Per User)
  const arpu = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0

  // MRR Last Month (for growth calculation)
  const paidSubscriptionsLastMonth = await db.user.findMany({
    where: {
      plan: { not: 'FREE' },
      status: 'ACTIVE',
      createdAt: { lt: startOfThisMonth },
    },
    select: { plan: true },
  })

  const mrrLastMonth = paidSubscriptionsLastMonth.reduce((sum, sub) => {
    return sum + (planPrices[sub.plan as keyof typeof planPrices] || 0)
  }, 0)

  // MRR Growth Rate
  const mrrGrowthRate = mrrLastMonth > 0
    ? ((mrr - mrrLastMonth) / mrrLastMonth) * 100
    : 0

  // Customer Lifetime Value (CLV) - simplified
  // Average months a customer stays (estimate based on churn)
  const avgCustomerLifespanMonths = churnRate > 0 ? 100 / churnRate : 12
  const clv = arpu * avgCustomerLifespanMonths

  // Net Revenue Retention (NRR) - simplified
  // Tracks expansion vs contraction
  const nrr = mrrLastMonth > 0
    ? (mrr / mrrLastMonth) * 100
    : 100

  // === AT-RISK CUSTOMERS ===

  const threeDaysFromNow = new Date()
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

  // Get at-risk customers
  const atRiskCustomers = await db.user.findMany({
    where: {
      OR: [
        // Payment failed
        { status: 'PAST_DUE' },
        // Subscription ending soon
        {
          cancelAtPeriodEnd: true,
          currentPeriodEnd: {
            lte: threeDaysFromNow,
          },
        },
        // Trial ending soon (< 3 days)
        {
          status: 'TRIAL',
          trialEndsAt: {
            lte: threeDaysFromNow,
            gte: now,
          },
        },
      ],
      plan: { not: 'FREE' }, // Only paying/trial customers
    },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      status: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      cancelAtPeriodEnd: true,
      createdAt: true,
    },
    orderBy: {
      currentPeriodEnd: 'asc', // Soonest expiry first
    },
    take: 10,
  })

  return {
    totalUsers,
    newUsersLast30Days,
    activeSubscriptions,
    mrr,
    invoicesThisMonth: {
      amount: invoicesThisMonth._sum.amount || 0,
      count: invoicesThisMonth._count,
    },
    usersByPlan,
    usersByStatus,
    recentUsers,
    pastDueCount,
    canceledLast30Days,
    // Advanced metrics
    churnRate,
    arpu,
    mrrGrowthRate,
    clv,
    nrr,
    mrrLastMonth,
    // At-risk customers
    atRiskCustomers,
  }
}

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  const planColors = {
    FREE: 'bg-gray-500',
    STARTER: 'bg-blue-500',
    PRO: 'bg-purple-500',
    ENTERPRISE: 'bg-gradient-to-r from-orange-500 to-pink-500',
  }

  const statusColors = {
    ACTIVE: 'default',
    TRIAL: 'secondary',
    PAST_DUE: 'destructive',
    CANCELED: 'outline',
    EXPIRED: 'destructive',
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Overview of your SaaS platform metrics
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newUsersLast30Days} in last 30 days
            </p>
          </CardContent>
        </Card>

        {/* MRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.mrr.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeSubscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>

        {/* Revenue This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(stats.invoicesThisMonth.amount / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.invoicesThisMonth.count} invoices paid
            </p>
          </CardContent>
        </Card>

        {/* Churn Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.churnRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.canceledLast30Days} churned (30d) • {stats.pastDueCount} past due
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advanced KPIs - Second Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CLV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer LTV</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.clv.toFixed(0)}</div>
            <p className="text-xs text-muted-foreground">
              Lifetime value per customer
            </p>
          </CardContent>
        </Card>

        {/* ARPU */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ARPU</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.arpu.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Average revenue per user/month
            </p>
          </CardContent>
        </Card>

        {/* NRR */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">NRR</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.nrr.toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground">
              Net revenue retention rate
            </p>
          </CardContent>
        </Card>

        {/* MRR Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">MRR Growth</CardTitle>
            {stats.mrrGrowthRate >= 0 ? (
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.mrrGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.mrrGrowthRate >= 0 ? '+' : ''}{stats.mrrGrowthRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Month-over-month growth
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts/Breakdowns */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Users by Plan */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Plan</CardTitle>
            <CardDescription>Distribution across subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.usersByPlan.map((item) => (
                <div key={item.plan} className="flex items-center">
                  <div className="w-24 font-medium">{item.plan}</div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className={`h-2 rounded-full ${
                          planColors[item.plan as keyof typeof planColors]
                        }`}
                        style={{
                          width: `${(item._count / stats.totalUsers) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="w-16 text-right text-sm text-muted-foreground">
                    {item._count} ({Math.round((item._count / stats.totalUsers) * 100)}%)
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Users by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Users by Status</CardTitle>
            <CardDescription>Subscription health overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.usersByStatus.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{item.status}</span>
                  </div>
                  <Badge variant={statusColors[item.status as keyof typeof statusColors] as any}>
                    {item._count}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At-Risk Customers */}
      {stats.atRiskCustomers.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-900">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  At-Risk Customers
                </CardTitle>
                <CardDescription>Customers requiring attention</CardDescription>
              </div>
              <Badge variant="destructive">{stats.atRiskCustomers.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.atRiskCustomers.map((user) => {
                // Determine risk reason and level
                let riskReason = ''
                let riskLevel: 'high' | 'medium' = 'medium'

                if (user.status === 'PAST_DUE') {
                  riskReason = 'Payment Failed'
                  riskLevel = 'high'
                } else if (user.cancelAtPeriodEnd) {
                  const daysLeft = user.currentPeriodEnd
                    ? Math.ceil((new Date(user.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0
                  riskReason = `Canceling in ${daysLeft} days`
                  riskLevel = daysLeft <= 1 ? 'high' : 'medium'
                } else if (user.trialEndsAt) {
                  const daysLeft = Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  riskReason = `Trial ends in ${daysLeft} days`
                  riskLevel = daysLeft <= 1 ? 'high' : 'medium'
                }

                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{user.name || 'No name'}</div>
                        <Badge
                          variant={riskLevel === 'high' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {riskLevel === 'high' ? '🔴 High Risk' : '🟡 At Risk'}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                        {riskReason}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{user.plan}</Badge>
                      <Link href={`/admin/users/${user.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Users */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
          <CardDescription>Latest registrations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border-b pb-3 last:border-0"
              >
                <div>
                  <div className="font-medium">{user.name || 'No name'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">{user.plan}</Badge>
                  <Badge variant={statusColors[user.status as keyof typeof statusColors] as any}>
                    {user.status}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
