import { NextRequest } from "next/server"
import { db } from "./db"

/**
 * Verify MT5 API Key from request headers
 * Returns the userId if valid, null if invalid
 */
export async function verifyMT5ApiKey(request: NextRequest): Promise<string | null> {
  // Get API key from header
  const apiKey = request.headers.get("X-API-Key")

  if (!apiKey || !apiKey.startsWith("sk_aegis_")) {
    return null
  }

  try {
    // Find active API key in database
    const keyRecord = await db.apiKey.findFirst({
      where: {
        key: apiKey,
        isActive: true,
      },
      select: {
        userId: true,
        id: true,
      },
    })

    if (!keyRecord) {
      return null
    }

    // Update last used timestamp
    await db.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    })

    return keyRecord.userId
  } catch (error) {
    console.error("MT5 API key verification error:", error)
    return null
  }
}

/**
 * Get trading account by login for authenticated user
 */
export async function getTradingAccountByLogin(
  userId: string,
  accountLogin: string
) {
  return db.tradingAccount.findFirst({
    where: {
      userId,
      login: accountLogin,
      deletedAt: null,
    },
  })
}
