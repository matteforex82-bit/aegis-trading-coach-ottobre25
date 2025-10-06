"use client"

import { SessionProvider } from "next-auth/react"
import { Sidebar } from "@/components/navigation/sidebar"
import { Header } from "@/components/navigation/header"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto bg-background p-6">
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
