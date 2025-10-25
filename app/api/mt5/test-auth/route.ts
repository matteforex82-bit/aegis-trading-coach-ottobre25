import { NextRequest, NextResponse } from "next/server"
import { verifyMT5ApiKey } from "@/lib/mt5-auth"

/**
 * Test endpoint to verify MT5 authentication
 * GET /api/mt5/test-auth
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("X-API-Key")

  console.log("[TEST-AUTH] Received API Key:", apiKey ? `${apiKey.substring(0, 15)}...` : "MISSING")

  if (!apiKey) {
    return NextResponse.json({
      success: false,
      error: "Missing X-API-Key header",
      headers: Object.fromEntries(request.headers.entries()),
    }, { status: 401 })
  }

  if (!apiKey.startsWith("sk_aegis_")) {
    return NextResponse.json({
      success: false,
      error: "Invalid API key format (must start with sk_aegis_)",
      receivedPrefix: apiKey.substring(0, 9),
    }, { status: 403 })
  }

  const userId = await verifyMT5ApiKey(request)

  if (!userId) {
    return NextResponse.json({
      success: false,
      error: "API key not found in database or inactive",
      keyPrefix: apiKey.substring(0, 15),
    }, { status: 403 })
  }

  return NextResponse.json({
    success: true,
    message: "Authentication successful!",
    userId,
    timestamp: new Date().toISOString(),
  })
}
