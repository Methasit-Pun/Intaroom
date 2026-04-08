import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getAdminSession } from "@/lib/admin-auth"

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()

  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin")
  const isAuthRoute =
    req.nextUrl.pathname.startsWith("/login") ||
    req.nextUrl.pathname.startsWith("/register") ||
    req.nextUrl.pathname.startsWith("/forgot-password") ||
    req.nextUrl.pathname.startsWith("/auth") ||
    req.nextUrl.pathname.startsWith("/register-success") ||
    req.nextUrl.pathname.startsWith("/reset-password")

  // Static files and API routes — skip authentication
  const isStaticFile =
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.includes(".")

  if (isStaticFile) {
    return res
  }

  // ── Admin routes ────────────────────────────────────────────────────────────
  // First check the HttpOnly isAdmin cookie set by /api/admin/login.
  // Falls back to Supabase session + profiles.role for Supabase-based admins.
  if (isAdminRoute) {
    const isAdminCookie = req.cookies.get("isAdmin")?.value === "true"
    if (isAdminCookie) {
      return res
    }
    const { isAdmin } = await getAdminSession(req, res)
    if (!isAdmin) {
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

  // ── Protected user routes ───────────────────────────────────────────────────
  const supabase = createMiddlewareClient({ req, res })
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = "/login"
    redirectUrl.searchParams.set("redirectedFrom", req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\..*).*)",
  ],
}
