/**
 * Unit tests — lib/admin-auth.ts
 *
 * Tests the server-side admin authentication helpers that were introduced
 * as part of the backend refactor to replace the insecure cookie-only check.
 *
 * Covers getAdminSession():
 *  ✅ Returns isAdmin=true when Supabase session exists and role is "admin"
 *  ❌ Returns isAdmin=false when no Supabase session
 *  ❌ Returns isAdmin=false when session exists but role is "user"
 *  ❌ Returns isAdmin=false when profile query errors
 *  ❌ Returns isAdmin=false on unexpected exception
 *
 * Covers requireAdmin():
 *  ✅ Returns userId when session exists and role is "admin"
 *  🔀 Redirects to /login when no session
 *  🔀 Redirects to /login when role is not "admin"
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { makeMockRequest } from "../setup"
import type { MockedFunction } from "vitest"

// ─── Typed references to mocked Supabase helpers ─────────────────────────────

type SupabaseClient = {
  auth: { getSession: MockedFunction<() => Promise<{ data: { session: unknown } }>> }
  from: MockedFunction<() => {
    select: MockedFunction<() => {
      eq: MockedFunction<() => {
        single: MockedFunction<() => Promise<{ data: unknown; error: unknown }>>
      }>
    }>
  }>
}

function makeSupabaseClient(
  sessionUser: { id: string } | null,
  profileData: { role: string } | null,
  profileError: unknown = null
): SupabaseClient {
  const single = vi.fn().mockResolvedValue({ data: profileData, error: profileError })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })

  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: sessionUser ? { user: sessionUser } : null },
      }),
    },
    from,
  }
}

// ─── getAdminSession ──────────────────────────────────────────────────────────

describe("getAdminSession()", () => {
  let mockCreateMiddlewareClient: MockedFunction<() => SupabaseClient>

  beforeEach(async () => {
    const helpers = await import("@supabase/auth-helpers-nextjs")
    mockCreateMiddlewareClient = helpers.createMiddlewareClient as unknown as typeof mockCreateMiddlewareClient
  })

  it("returns { isAdmin: true } when session exists and role is 'admin'", async () => {
    mockCreateMiddlewareClient.mockReturnValue(
      makeSupabaseClient({ id: "user-1" }, { role: "admin" })
    )
    const { getAdminSession } = await import("@/lib/admin-auth")
    const req = makeMockRequest("/admin") as any
    const res = { headers: new Headers() } as any

    const result = await getAdminSession(req, res)

    expect(result.isAdmin).toBe(true)
    expect(result.userId).toBe("user-1")
  })

  it("returns { isAdmin: false } when there is no Supabase session", async () => {
    mockCreateMiddlewareClient.mockReturnValue(
      makeSupabaseClient(null, null)
    )
    const { getAdminSession } = await import("@/lib/admin-auth")
    const req = makeMockRequest("/admin") as any
    const res = { headers: new Headers() } as any

    const result = await getAdminSession(req, res)

    expect(result.isAdmin).toBe(false)
    expect(result.userId).toBeNull()
  })

  it("returns { isAdmin: false } when session exists but role is 'user'", async () => {
    mockCreateMiddlewareClient.mockReturnValue(
      makeSupabaseClient({ id: "user-2" }, { role: "user" })
    )
    const { getAdminSession } = await import("@/lib/admin-auth")
    const req = makeMockRequest("/admin") as any
    const res = { headers: new Headers() } as any

    const result = await getAdminSession(req, res)

    expect(result.isAdmin).toBe(false)
    expect(result.userId).toBe("user-2")
  })

  it("returns { isAdmin: false } when profile query returns an error", async () => {
    mockCreateMiddlewareClient.mockReturnValue(
      makeSupabaseClient({ id: "user-3" }, null, { message: "DB error" })
    )
    const { getAdminSession } = await import("@/lib/admin-auth")
    const req = makeMockRequest("/admin") as any
    const res = { headers: new Headers() } as any

    const result = await getAdminSession(req, res)

    expect(result.isAdmin).toBe(false)
    expect(result.userId).toBe("user-3")
  })

  it("returns { isAdmin: false, userId: null } on unexpected exception", async () => {
    mockCreateMiddlewareClient.mockImplementation(() => {
      throw new Error("network failure")
    })
    const { getAdminSession } = await import("@/lib/admin-auth")
    const req = makeMockRequest("/admin") as any
    const res = { headers: new Headers() } as any

    const result = await getAdminSession(req, res)

    expect(result.isAdmin).toBe(false)
    expect(result.userId).toBeNull()
  })
})

// ─── requireAdmin ──────────────────────────────────────────────────────────────

describe("requireAdmin()", () => {
  let mockCreateServerComponentClient: MockedFunction<() => SupabaseClient>

  beforeEach(async () => {
    const helpers = await import("@supabase/auth-helpers-nextjs")
    mockCreateServerComponentClient =
      helpers.createServerComponentClient as unknown as typeof mockCreateServerComponentClient
  })

  it("returns { userId } when session exists and role is 'admin'", async () => {
    mockCreateServerComponentClient.mockReturnValue(
      makeSupabaseClient({ id: "admin-user" }, { role: "admin" })
    )
    const { requireAdmin } = await import("@/lib/admin-auth")

    const result = await requireAdmin()

    expect(result.userId).toBe("admin-user")
  })

  it("redirects to /login when no session exists", async () => {
    mockCreateServerComponentClient.mockReturnValue(
      makeSupabaseClient(null, null)
    )
    const { requireAdmin } = await import("@/lib/admin-auth")

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/login")
  })

  it("redirects to /login when session exists but role is not 'admin'", async () => {
    mockCreateServerComponentClient.mockReturnValue(
      makeSupabaseClient({ id: "regular-user" }, { role: "user" })
    )
    const { requireAdmin } = await import("@/lib/admin-auth")

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/login")
  })

  it("redirects to /login when profile query returns an error", async () => {
    mockCreateServerComponentClient.mockReturnValue(
      makeSupabaseClient({ id: "user-x" }, null, { message: "not found" })
    )
    const { requireAdmin } = await import("@/lib/admin-auth")

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT:/login")
  })
})
