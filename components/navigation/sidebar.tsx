"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Wallet,
  TrendingUp,
  BarChart3,
  BookOpen,
  Settings,
  Shield,
  Target,
  StickyNote,
  Crown,
  Users,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Accounts", href: "/dashboard/accounts", icon: Wallet },
  { name: "Trades", href: "/dashboard/trades", icon: TrendingUp },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Trading Room", href: "/dashboard/trading-room", icon: Target, isPremium: true },
  { name: "My Notes", href: "/dashboard/journal", icon: StickyNote },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

// Admin-only navigation items
const adminNavigation = [
  { name: "Admin Panel", href: "/admin", icon: Users, isAdmin: true },
  { name: "Manage Setups", href: "/dashboard/admin/trading-room", icon: Crown, isAdmin: true },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="flex h-full w-64 flex-col bg-card border-r">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-primary-foreground" />
        </div>
        <span className="text-lg font-bold">AEGIS</span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {/* Regular navigation */}
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {item.isPremium && (
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-primary to-purple-600 text-white">
                  PRO
                </Badge>
              )}
            </Link>
          )
        })}

        {/* Admin-only navigation (shown only if user role is ADMIN) */}
        {session?.user?.role === "ADMIN" && (
          <>
            <div className="my-4 border-t pt-4">
              <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Admin Tools
              </p>
            </div>
            {adminNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-destructive text-destructive-foreground"
                      : "text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="flex-1">{item.name}</span>
                  <Badge variant="outline" className="text-xs border-destructive text-destructive">
                    ADMIN
                  </Badge>
                </Link>
              )
            })}
          </>
        )}
      </nav>
    </div>
  )
}
