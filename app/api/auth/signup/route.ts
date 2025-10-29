import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { stripe } from "@/lib/stripe"

const VALID_PLANS = ['starter', 'pro', 'enterprise']

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, password, plan } = body

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Validate that plan is provided and valid
    if (!plan || !VALID_PLANS.includes(plan.toLowerCase())) {
      return NextResponse.json(
        { error: "Valid subscription plan is required. Please select a plan from the pricing page." },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create Stripe customer first
    let stripeCustomerId: string | undefined
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          signupPlan: plan.toLowerCase(),
        },
      })
      stripeCustomerId = customer.id
      console.log('[Signup] Created Stripe customer:', stripeCustomerId)
    } catch (stripeError) {
      console.error('[Signup] Failed to create Stripe customer:', stripeError)
      return NextResponse.json(
        { error: "Failed to create payment account. Please try again." },
        { status: 500 }
      )
    }

    // Create user with Stripe customer ID
    const user = await db.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        stripeCustomerId,
      },
    })

    console.log('[Signup] User created successfully:', {
      userId: user.id,
      email: user.email,
      stripeCustomerId,
      plan: plan.toLowerCase(),
    })

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          stripeCustomerId,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
