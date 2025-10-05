import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"

export default withAuth(
  function middleware(req) {
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname

        // Public routes
        const publicRoutes = [
          '/auth/signin',
          '/auth/signup',
          '/api/auth',
          '/api/ingest',
          '/api/ea-health',
          '/api/health',
          '/api/ping',
        ]

        // Check if path starts with any public route
        if (publicRoutes.some(route => path.startsWith(route))) {
          return true
        }

        // All other routes require authentication
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}
