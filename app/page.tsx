import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"

export default async function Home() {
  const session = await getServerSession(authOptions)

  if (session) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-5xl w-full">
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold mb-4">
            AEGIS Trading Coach
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Professional trading dashboard with MT4/MT5 integration
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/pricing">
              <Button size="lg">Get Started</Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline">Sign In</Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Real-time Sync</h3>
            <p className="text-sm text-muted-foreground">
              Automatic synchronization with MetaTrader 4/5 platforms
            </p>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Advanced Analytics</h3>
            <p className="text-sm text-muted-foreground">
              Detailed statistics and performance metrics for your trades
            </p>
          </div>
          <div className="bg-card border rounded-lg p-6">
            <h3 className="font-bold text-lg mb-2">Multi-Account</h3>
            <p className="text-sm text-muted-foreground">
              Manage demo, live, and prop firm accounts in one place
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            Built with Next.js 15.5.4 • React 18.3.1 • Prisma 6.16.3 • NextAuth 4.24.11
          </p>
        </div>
      </div>
    </div>
  )
}
