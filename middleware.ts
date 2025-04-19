import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Update the middleware function to prevent redirect loops
export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Log the current path for debugging
  console.log(`Middleware processing path: ${req.nextUrl.pathname}`)

  // Check for potential redirect loops
  const redirectCount = Number.parseInt(req.cookies.get("redirectCount")?.value || "0")
  if (redirectCount > 3) {
    console.error("Detected potential redirect loop, allowing request to proceed")
    const resetRes = NextResponse.next()
    resetRes.cookies.set("redirectCount", "0")
    return resetRes
  }

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

  // For non-admin routes or if no admin cookie, proceed with normal auth checks
  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    // Handle auth errors
    if (error) {
      console.error("Auth error in middleware:", error)

      // If it's a refresh token error and not on an auth route, redirect to login
      if (
        (error.message?.includes("refresh_token_not_found") || (error as any)?.code === "refresh_token_not_found") &&
        !isAuthRoute
      ) {
        console.log("Refresh token error, redirecting to login")
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = "/login"
        const redirectRes = NextResponse.redirect(redirectUrl)
        redirectRes.cookies.set("redirectCount", (redirectCount + 1).toString())
        return redirectRes
      }
    }

    console.log(`Session check result: ${!!session}`)

    // If trying to access admin route without admin cookie or session, redirect to login
    if (isAdminRoute && !session && !adminCookie) {
      console.log("Admin route without auth - redirecting to login")
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      const redirectRes = NextResponse.redirect(redirectUrl)
      redirectRes.cookies.set("redirectCount", (redirectCount + 1).toString())
      return redirectRes
    }

    // If no session and trying to access protected routes, redirect to login
    // But allow access to the root path regardless of auth status
    if (!session && !isAuthRoute && !adminCookie && !isRootPath) {
      console.log("Protected route without auth - redirecting to login")
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      redirectUrl.searchParams.set(`redirectedFrom`, req.nextUrl.pathname)
      const redirectRes = NextResponse.redirect(redirectUrl)
      redirectRes.cookies.set("redirectCount", (redirectCount + 1).toString())
      return redirectRes
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

      const redirectRes = NextResponse.redirect(redirectUrl)
      redirectRes.cookies.set("redirectCount", (redirectCount + 1).toString())
      return redirectRes
    }
  } catch (error) {
    console.error("Exception in middleware:", error)

    // If there's an exception and not on an auth route, redirect to login
    if (!isAuthRoute && !isRootPath) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      const redirectRes = NextResponse.redirect(redirectUrl)
      redirectRes.cookies.set("redirectCount", (redirectCount + 1).toString())
      return redirectRes
    }
  }

  // Reset redirect count for successful requests
  res.cookies.set("redirectCount", "0")
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
