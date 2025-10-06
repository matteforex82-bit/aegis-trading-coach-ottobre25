"use client"

import { signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { LogOut, User } from "lucide-react"

export function Header() {
  const { data: session } = useSession()

  return (
    <header className="h-16 border-b bg-card flex items-center justify-between px-6">
      <div>
        <h1 className="text-xl font-semibold">Trading Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {session?.user?.name || "Trader"}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-medium">{session?.user?.name}</p>
            <p className="text-muted-foreground text-xs">{session?.user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
