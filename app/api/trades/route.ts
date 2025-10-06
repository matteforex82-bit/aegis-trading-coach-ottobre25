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

    const trades = await db.trade.findMany({
      where: {
        account: {
          userId: session.user.id,
          deletedAt: null,
        },
      },
      include: {
        account: {
          select: {
            login: true,
            broker: true,
          },
        },
      },
      orderBy: {
        openTime: "desc",
      },
      take: 100, // Limit to last 100 trades
    })

    return NextResponse.json(trades)
  } catch (error) {
    console.error("Get trades error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
