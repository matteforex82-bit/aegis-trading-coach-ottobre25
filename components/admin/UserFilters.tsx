'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { User, Mail, Calendar } from 'lucide-react'

type User = {
  id: string
  name: string | null
  email: string
  role: string
  plan: string
  status: string
  stripeCustomerId: string | null
  subscriptionId: string | null
  currentPeriodEnd: Date | null
  trialEndsAt: Date | null
  createdAt: Date
  _count: {
    tradingAccounts: number
  }
}

interface UserFiltersProps {
  users: User[]
}

export function UserFilters({ users }: UserFiltersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Filter and search users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      const matchesSearch =
        searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())

      // Plan filter
      const matchesPlan = planFilter === 'all' || user.plan === planFilter

      // Status filter
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter

      return matchesSearch && matchesPlan && matchesStatus
    })
  }, [users, searchQuery, planFilter, statusFilter])

  const handleReset = () => {
    setSearchQuery('')
    setPlanFilter('all')
    setStatusFilter('all')
  }

  const hasActiveFilters = searchQuery !== '' || planFilter !== 'all' || statusFilter !== 'all'

  const roleColors = {
    USER: 'secondary',
    ADMIN: 'destructive',
  }

  const planColors = {
    FREE: 'outline',
    STARTER: 'default',
    PRO: 'default',
    ENTERPRISE: 'default',
  }

  const statusColors = {
    ACTIVE: 'default',
    TRIAL: 'secondary',
    PAST_DUE: 'destructive',
    CANCELED: 'outline',
    EXPIRED: 'destructive',
  }

  return (
    <div className="space-y-4">
      {/* Filters Row */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="FREE">Free</SelectItem>
            <SelectItem value="STARTER">Starter</SelectItem>
            <SelectItem value="PRO">Pro</SelectItem>
            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="PAST_DUE">Past Due</SelectItem>
            <SelectItem value="CANCELED">Canceled</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={handleReset}>
            <X className="h-4 w-4 mr-1" />
            Reset
          </Button>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredUsers.length} of {users.length} users
        </span>
        {hasActiveFilters && (
          <span className="text-primary">Filters active</span>
        )}
      </div>

      {/* Users Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Accounts</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                No users found matching your criteria
              </TableCell>
            </TableRow>
          ) : (
            filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="font-medium">{user.name || 'No name'}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {user.email}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={roleColors[user.role as keyof typeof roleColors] as any}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={planColors[user.plan as keyof typeof planColors] as any}>
                    {user.plan}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[user.status as keyof typeof statusColors] as any}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell>{user._count.tradingAccounts}</TableCell>
                <TableCell>
                  {user.currentPeriodEnd ? (
                    <div className="text-sm">
                      <div className="text-muted-foreground">
                        Renews {new Date(user.currentPeriodEnd).toLocaleDateString()}
                      </div>
                    </div>
                  ) : user.trialEndsAt ? (
                    <div className="text-sm">
                      <div className="text-muted-foreground">
                        Trial ends {new Date(user.trialEndsAt).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/admin/users/${user.id}`}>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
