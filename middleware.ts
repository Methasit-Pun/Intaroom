import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  // Define public routes that don't require authentication
  const publicRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/register-success",
    "/auth/callback",
  ]

  // Check if current path is a public route
  const isPublicRoute = publicRoutes.some((route) => req.nextUrl.pathname.startsWith(route))

  // Special case for root path - always allow access
  const isRootPath = req.nextUrl.pathname === "/"

  // Check if this is a static asset
  const isStaticAsset =
    req.nextUrl.pathname.match(/\.(jpg|jpeg|png|gif|svg|css|js)$/) ||
    req.nextUrl.pathname.startsWith("/_next/") ||
    req.nextUrl.pathname.startsWith("/favicon.ico")

  // Skip auth check for public routes, root path, and static assets
  if (isPublicRoute || isRootPath || isStaticAsset) {
    return res
  }

  try {
    // Create supabase client with cookies
    const supabase = createMiddlewareClient({ req, res })

    // Check if this is an admin route
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")

    // Check for admin cookie
    const isAdminCookie = req.cookies.get("isAdmin")?.value === "true"

    // If this is an admin route and we have the admin cookie, allow access
    if (isAdminRoute && isAdminCookie) {
      return res
    }

    // Get the session
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // If no session and trying to access protected routes, redirect to login
    if (!session && !isAdminCookie) {
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = "/login"
      redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
      return NextResponse.redirect(redirectUrl)
    }
  } catch (error) {
    console.error("Error in middleware:", error)
    // On error, still allow the request to proceed to avoid blocking users
    return res
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
