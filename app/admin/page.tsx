import { Metadata } from 'next'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Admin Dashboard - AEGIS',
  description: 'SaaS analytics and user management',
}

async function getAdminStats() {
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
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

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

        {/* Churn/Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pastDueCount}</div>
            <p className="text-xs text-muted-foreground">
              Past due • {stats.canceledLast30Days} churned (30d)
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
