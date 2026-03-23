/**
 * Server-side admin authentication utilities.
 *
 * These functions run on the server (middleware, Route Handlers, Server
 * Components) and verify admin identity by checking the `profiles.role`
 * column in Supabase — NOT a cookie or localStorage value that a user can
 * forge in the browser.
 *
 * Usage in middleware:
 *   import { getAdminSession } from "@/lib/admin-auth"
 *   const { isAdmin } = await getAdminSession(req, res)
 *
 * Usage in a Server Component / Route Handler:
 *   import { requireAdmin } from "@/lib/admin-auth"
 *   const { userId } = await requireAdmin()   // throws redirect if not admin
 */

import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs"
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import type { NextRequest, NextResponse } from "next/server"

// ─── Middleware helper ────────────────────────────────────────────────────────

/**
 * Checks whether the incoming request belongs to an admin user.
 * Uses the Supabase session cookie — cannot be forged by the client.
 */
export async function getAdminSession(
  req: NextRequest,
  res: ReturnType<typeof NextResponse.next>
): Promise<{ isAdmin: boolean; userId: string | null }> {
  try {
    const supabase = createMiddlewareClient({ req, res })

    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return { isAdmin: false, userId: null }
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (error || !profile) {
      return { isAdmin: false, userId: session.user.id }
    }

    return {
      isAdmin: profile.role === "admin",
      userId: session.user.id,
    }
  } catch {
    return { isAdmin: false, userId: null }
  }
}

// ─── Server Component / Route Handler helper ─────────────────────────────────

/**
 * Verifies that the current request is from an admin user.
 * Call this at the top of any Server Component or Route Handler that renders
 * admin-only content.
 *
 * - If no session exists → redirects to /login
 * - If session exists but role !== 'admin' → redirects to /login
 * - Otherwise → returns { userId }
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const cookieStore = cookies()
  const supabase = createServerComponentClient({ cookies: () => cookieStore })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()

  if (error || profile?.role !== "admin") {
    redirect("/login")
  }

  return { userId: session.user.id }
}
