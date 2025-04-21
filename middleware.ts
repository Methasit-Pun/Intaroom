import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Update the middleware function to prevent redirect loops
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Define auth routes that don't require authentication
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth") ||
    req.nextUrl.pathname.startsWith("/register-success") ||
    req.nextUrl.pathname.startsWith("/reset-password")

  // Special case for root path - redirect to login or home based on auth status
  const isRootPath = req.nextUrl.pathname === "/"

  // Check for admin cookie
  const adminCookie = req.cookies.get("isAdmin")?.value === "true"
  const userLoggedIn = req.cookies.get("userLoggedIn")?.value === "true"

  // If at root path, redirect to appropriate page
  if (isRootPath) {
    // Check for admin cookie first
    if (adminCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/admin"
      return NextResponse.redirect(redirectUrl)
    }

    // Check for user login cookie
    if (userLoggedIn) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/home"
      return NextResponse.redirect(redirectUrl)
    }

    // If no auth cookies, redirect to login
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    return NextResponse.redirect(redirectUrl)
  }

  // If already authenticated and trying to access auth routes, redirect
  if ((adminCookie || userLoggedIn) && isAuthRoute) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = adminCookie ? "/admin" : "/home"
    return NextResponse.redirect(redirectUrl)
  }

  // If not authenticated and trying to access protected routes, redirect to login
  if (!adminCookie && !userLoggedIn && !isAuthRoute && !isRootPath) {
    // Create Supabase client to check session
    const supabase = createMiddlewareClient({ req, res })

    try {
      const { data } = await supabase.auth.getSession()

      // If no session, redirect to login
      if (!data.session) {
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = "/login"
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error("Auth error in middleware:", error)

      // If error, redirect to login
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      return NextResponse.redirect(redirectUrl)
    }
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
