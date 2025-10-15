import { NextResponse } from 'next/server'
import Stripe from 'stripe'

export async function GET() {
  try {
    // Test 1: Check if env var exists
    const secretKey = process.env.STRIPE_SECRET_KEY

    if (!secretKey) {
      return NextResponse.json({
        success: false,
        error: 'STRIPE_SECRET_KEY not found in environment',
        tests: {
          envVarExists: false,
        }
      })
    }

    // Test 2: Check key format
    const keyFormat = secretKey.substring(0, 8)
    const isTestKey = secretKey.startsWith('sk_test_')

    // Test 3: Try to initialize Stripe
    let stripeClient: Stripe
    try {
      stripeClient = new Stripe(secretKey, {
        apiVersion: '2024-11-20' as any,
        typescript: true,
      })
    } catch (initError: any) {
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize Stripe client',
        details: initError.message,
        tests: {
          envVarExists: true,
          keyFormat,
          isTestKey,
          stripeInit: false,
        }
      })
    }

    // Test 4: Try to list customers (simplest API call)
    try {
      const customers = await stripeClient.customers.list({ limit: 1 })

      return NextResponse.json({
        success: true,
        message: 'Stripe connection successful',
        tests: {
          envVarExists: true,
          keyFormat,
          isTestKey,
          stripeInit: true,
          apiCall: true,
          customerCount: customers.data.length,
        }
      })
    } catch (apiError: any) {
      return NextResponse.json({
        success: false,
        error: 'Stripe API call failed',
        details: {
          type: apiError.type,
          code: apiError.code,
          message: apiError.message,
          statusCode: apiError.statusCode,
          raw: apiError.raw?.message,
        },
        tests: {
          envVarExists: true,
          keyFormat,
          isTestKey,
          stripeInit: true,
          apiCall: false,
        }
      })
    }

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
