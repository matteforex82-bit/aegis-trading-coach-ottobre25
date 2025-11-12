import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const account = await db.tradingAccount.findUnique({
      where: { id },
    })

    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    if (account.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Hard delete - remove all related data in correct order
    console.log(`[Account Delete] Deleting account ${account.login} and all related data...`)

    // Delete related data in order (respecting foreign key constraints)
    await db.drawdownSnapshot.deleteMany({ where: { accountId: id } })
    await db.tradeOrder.deleteMany({ where: { accountId: id } })
    await db.position.deleteMany({ where: { accountId: id } })
    await db.trade.deleteMany({ where: { accountId: id } })
    await db.challengeSetup.deleteMany({ where: { accountId: id } })

    // Delete associated API keys
    await db.apiKey.deleteMany({
      where: {
        userId: session.user.id,
        name: { contains: account.login }
      }
    })

    // Finally delete the account itself
    await db.tradingAccount.delete({ where: { id } })

    console.log(`[Account Delete] Successfully deleted account ${account.login}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete account error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
