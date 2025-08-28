import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Update the middleware to handle admin login better
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth") ||
    req.nextUrl.pathname.startsWith("/register-success") ||
    req.nextUrl.pathname.startsWith("/reset-password")
  
  // Static files and API routes - skip authentication
  const isStaticFile = req.nextUrl.pathname.startsWith("/_next") ||
                      req.nextUrl.pathname.startsWith("/api") ||
                      req.nextUrl.pathname.includes(".")

  if (isStaticFile) {
    return res
  }

  // Handle admin routes
  if (isAdminRoute) {
    const adminCookie = req.cookies.get("isAdmin")?.value === "true"
    if (!adminCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      return NextResponse.redirect(redirectUrl)
    }
    return res
  }

  // Allow auth routes without session check
  if (isAuthRoute) {
    return res
  }

  // For protected routes, check session
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Specify which routes this middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)  
     * - favicon.ico (favicon file)
     * - api routes
     * - static assets
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)",
  ],
}
