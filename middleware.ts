import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Update the middleware to handle admin login better
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Log the current path for debugging
  console.log(`Middleware processing path: ${req.nextUrl.pathname}`)

  // Create supabase client with cookies
  const supabase = createMiddlewareClient({ req, res })

  // Check if this is an admin route
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

  // Check for admin cookie
  const adminCookie = req.cookies.get("isAdmin")?.value === "true"

  // If this is an admin route and we have the admin cookie, allow access immediately
  if (isAdminRoute && adminCookie) {
    console.log("Admin route with admin cookie - allowing access")
    return res
  }

  // For non-admin routes or if no admin cookie, proceed with normal auth checks
  const {
    data: { session },
  } = await supabase.auth.getSession()

  console.log(`Session check result: ${!!session}`)

  // Define auth routes that don't require authentication
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth") ||
    req.nextUrl.pathname.startsWith("/register-success") ||
    req.nextUrl.pathname.startsWith("/reset-password")

  // Special case for root path - always allow access
  const isRootPath = req.nextUrl.pathname === "/"

  // If trying to access admin route without admin cookie or session, redirect to login
  if (isAdminRoute && !session && !adminCookie) {
    console.log("Admin route without auth - redirecting to login")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // If no session and trying to access protected routes, redirect to login
  // But allow access to the root path regardless of auth status
  if (!session && !isAuthRoute && !adminCookie && !isRootPath) {
    console.log("Protected route without auth - redirecting to login")
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If session exists and trying to access auth routes, redirect appropriately
  if ((session || adminCookie) && isAuthRoute) {
    console.log("Auth route with session - redirecting to appropriate page")
    const redirectUrl = req.nextUrl.clone()

    if (adminCookie) {
      redirectUrl.pathname = "/admin"
    } else {
      // Redirect regular users to the root path
      redirectUrl.pathname = "/"
    }

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
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
