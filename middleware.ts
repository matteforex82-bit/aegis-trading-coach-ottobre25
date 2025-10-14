import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// This middleware runs BEFORE any authentication
// Perfect for API Key validation that needs to bypass Vercel Protection
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ============================================================================
  // PRIORITY 1: API Key Authentication for MT5/MT4 Endpoints
  // ============================================================================
  // These endpoints bypass ALL authentication if valid API Key is present
  // This is CRITICAL for commercial product - clients don't touch Vercel settings

  if (pathname.startsWith('/api/ingest/')) {
    // Check for API Key in headers
    const apiKey = request.headers.get('X-API-Key') || request.headers.get('x-api-key')

    if (apiKey && apiKey.startsWith('sk_aegis_')) {
      // Valid API Key format detected
      // The route handler will do full validation against database
      // But we signal here that this request should proceed
      const response = NextResponse.next()
      response.headers.set('X-API-Auth', 'pending-validation')
      return response
    }

    // No valid API Key format - return clear error
    return NextResponse.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid API Key',
        hint: 'Add X-API-Key header with your API key from dashboard',
        code: 'MISSING_API_KEY'
      },
      {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  }

  // ============================================================================
  // PRIORITY 2: Public Routes (no auth required)
  // ============================================================================

  const publicPaths = [
    '/auth/signin',
    '/auth/signup',
    '/api/auth',
    '/api/health',
    '/api/ping',
    '/api/ea-health',
    '/pricing',
    '/',
  ]

  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // ============================================================================
  // PRIORITY 3: Admin Routes (ADMIN role required)
  // ============================================================================

  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET
    })

    // Not authenticated - redirect to signin
    if (!token) {
      const signInUrl = new URL('/auth/signin', request.url)
      signInUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(signInUrl)
    }

    // Not an admin - redirect to dashboard
    if (token.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Admin authenticated - proceed
    return NextResponse.next()
  }

  // ============================================================================
  // PRIORITY 4: Protected Routes (NextAuth required)
  // ============================================================================

  // Check for valid session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // If no token and trying to access protected route
  if (!token) {
    // Redirect to signin
    const signInUrl = new URL('/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(signInUrl)
  }

  // Valid session - proceed
  return NextResponse.next()
}

// Configure which routes this middleware applies to
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - static files (.png, .jpg, etc)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
