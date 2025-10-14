import { Metadata } from 'next'
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  User,
  Mail,
  Calendar,
  Shield,
  CreditCard,
  Key,
  BarChart3,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'
import { ChangePlanForm } from '@/components/admin/ChangePlanForm'

export const metadata: Metadata = {
  title: 'User Details - Admin',
}

async function getUser(id: string) {
  const user = await db.user.findUnique({
    where: { id },
    include: {
      tradingAccounts: {
        select: {
          id: true,
          login: true,
          broker: true,
          accountType: true,
          currentBalance: true,
          profit: true,
          drawdown: true,
          createdAt: true,
        },
      },
      subscription: {
        include: {
          invoices: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      },
    },
  })

  if (!user) {
    return null
  }

  // Get API keys count
  const apiKeysCount = await db.apiKey.count({
    where: {
      userId: id,
      isActive: true,
    },
  })

  return { ...user, apiKeysCount }
}

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getUser(id)

  if (!user) {
    notFound()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{user.name || 'Unnamed User'}</h1>
          <p className="text-muted-foreground mt-1">{user.email}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/users">
            <Button variant="outline">Back to Users</Button>
          </Link>
          {user.stripeCustomerId && (
            <Button variant="outline" asChild>
              <a
                href={`https://dashboard.stripe.com/customers/${user.stripeCustomerId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                View in Stripe
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* User Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Account Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">User ID</div>
              <div className="font-mono text-sm">{user.id}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Role</div>
              <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Joined</div>
              <div className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Plan</div>
              <Badge>{user.plan}</Badge>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Status</div>
              <Badge
                variant={
                  user.status === 'ACTIVE'
                    ? 'default'
                    : user.status === 'TRIAL'
                    ? 'secondary'
                    : 'destructive'
                }
              >
                {user.status}
              </Badge>
            </div>
            {user.currentPeriodEnd && (
              <div>
                <div className="text-xs text-muted-foreground">Renews</div>
                <div className="text-sm">{new Date(user.currentPeriodEnd).toLocaleDateString()}</div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Usage
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <div className="text-xs text-muted-foreground">Trading Accounts</div>
              <div className="text-2xl font-bold">{user.tradingAccounts.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">API Keys</div>
              <div className="text-2xl font-bold">{user.apiKeysCount}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Change Subscription Plan</CardTitle>
          <CardDescription>Manually update user's subscription plan</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePlanForm userId={user.id} currentPlan={user.plan} />
        </CardContent>
      </Card>

      {/* Trading Accounts */}
      {user.tradingAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Trading Accounts</CardTitle>
            <CardDescription>{user.tradingAccounts.length} connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.tradingAccounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      {account.broker} - {account.login}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {account.accountType} • Balance: ${account.currentBalance.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm">
                      Profit: <span className={account.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                        ${account.profit.toFixed(2)}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Drawdown: {account.drawdown.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {user.subscription?.invoices && user.subscription.invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
            <CardDescription>Recent invoices and payments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.subscription.invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between border-b pb-3 last:border-0"
                >
                  <div>
                    <div className="font-medium">
                      ${(invoice.amount / 100).toFixed(2)} {invoice.currency}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Badge variant={invoice.status === 'paid' ? 'default' : 'secondary'}>
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
