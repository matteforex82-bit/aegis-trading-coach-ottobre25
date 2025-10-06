import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const accounts = await db.tradingAccount.findMany({
      where: {
        userId: session.user.id,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(accounts)
  } catch (error) {
    console.error("Get accounts error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
