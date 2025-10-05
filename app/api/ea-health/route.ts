import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'MT4/MT5 Expert Advisor endpoint is ready',
    timestamp: new Date().toISOString(),
    endpoints: {
      mt4: '/api/ingest/mt4',
      mt5: '/api/ingest/mt5'
    }
  })
}
