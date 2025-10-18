import { Metadata } from 'next'
import { db } from '@/lib/db'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UserFilters } from '@/components/admin/UserFilters'

export const metadata: Metadata = {
  title: 'Users Management - Admin',
  description: 'Manage platform users and subscriptions',
}

async function getUsers() {
  const users = await db.user.findMany({
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
      status: true,
      stripeCustomerId: true,
      subscriptionId: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      createdAt: true,
      _count: {
        select: {
          tradingAccounts: true,
        },
      },
    },
  })

  return users
}

export default async function UsersPage() {
  const users = await getUsers()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Users Management</h1>
        <p className="text-muted-foreground mt-2">
          View and manage all platform users
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paying Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.plan !== 'FREE' && u.status === 'ACTIVE').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">On Trial</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.status === 'TRIAL').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Past Due</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {users.filter((u) => u.status === 'PAST_DUE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table with Filters */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>Search, filter, and manage platform users</CardDescription>
        </CardHeader>
        <CardContent>
          <UserFilters users={users} />
        </CardContent>
      </Card>
    </div>
  )
}
