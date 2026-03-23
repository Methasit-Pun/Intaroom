/**
 * Unit tests — proxy middleware (proxy.ts)
 *
 * This file tests the authentication guard logic added / fixed in the
 * refactor/backend branch:
 *
 *   FIX: Admin routes now check the HttpOnly `isAdmin` cookie FIRST, then fall
 *        back to Supabase session + profiles.role. Without this fix, admins who
 *        logged in via /api/admin/login would be redirected back to /login on
 *        every page because the old code only checked Supabase session.
 *
 * Covers:
 *  Static / API routes       — bypass all auth
 *  Admin routes (cookie)     — isAdmin=true cookie → allow
 *  Admin routes (Supabase)   — no cookie, but Supabase role=admin → allow
 *  Admin routes (rejected)   — no cookie, no Supabase admin → redirect /login
 *  Auth routes               — /login /register etc → allow without session
 *  Protected user routes     — valid Supabase session → allow
 *  Protected user routes     — no session → redirect /login?redirectedFrom=…
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  makeMockRequest,
} from "./setup"
import type { MockedFunction } from "vitest"
import type { getAdminSession as GetAdminSessionType } from "@/lib/admin-auth"

// Hoist vi.mock calls — they must be at module scope (Vitest hoists them before imports)
vi.mock("@/lib/admin-auth", () => ({
  getAdminSession: vi.fn(),
}))

// Typed references — resolved in beforeEach after module mocks are applied
let mockGetAdminSession: MockedFunction<typeof GetAdminSessionType>
let mockCreateMiddlewareClient: MockedFunction<() => { auth: { getSession: () => Promise<{ data: { session: unknown } }> } }>

beforeEach(async () => {
  const adminAuth = await import("@/lib/admin-auth")
  mockGetAdminSession = vi.mocked(adminAuth.getAdminSession)

  const helpers = await import("@supabase/auth-helpers-nextjs")
  mockCreateMiddlewareClient = helpers.createMiddlewareClient as typeof mockCreateMiddlewareClient
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stubAdminSession(isAdmin: boolean) {
  mockGetAdminSession.mockResolvedValue({ isAdmin, userId: isAdmin ? "user-1" : null })
}

function stubUserSession(session: unknown) {
  mockCreateMiddlewareClient.mockReturnValue({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session } }) },
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("proxy middleware", () => {

  // ── Static & API routes ────────────────────────────────────────────────────

  describe("static files and API routes (no auth check)", () => {
    it.each([
      "/_next/static/chunk.js",
      "/_next/image?url=foo",
      "/api/admin/login",
      "/api/reservations",
      "/favicon.ico",
      "/logo.png",
      "/robots.txt",
    ])("passes '%s' through without touching Supabase or admin session", async (pathname) => {
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest(pathname) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
      expect(mockGetAdminSession).not.toHaveBeenCalled()
    })
  })

  // ── Admin routes: isAdmin cookie ───────────────────────────────────────────

  describe("admin routes — isAdmin cookie (the fixed behaviour)", () => {
    it("allows /admin when isAdmin cookie is 'true' WITHOUT calling getAdminSession", async () => {
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin", { cookies: { isAdmin: "true" } }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
      // Key assertion: the Supabase DB round-trip must be skipped
      expect(mockGetAdminSession).not.toHaveBeenCalled()
    })

    it("allows /admin/calendar when isAdmin cookie is 'true'", async () => {
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin/calendar", { cookies: { isAdmin: "true" } }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
    })

    it("does NOT allow access when isAdmin cookie is 'false'", async () => {
      stubAdminSession(false)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin", { cookies: { isAdmin: "false" } }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })

    it("does NOT allow access when isAdmin cookie is absent", async () => {
      stubAdminSession(false)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin", { cookies: {} }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(307)
      expect(res.headers.get("location")).toContain("/login")
    })
  })

  // ── Admin routes: Supabase fallback ───────────────────────────────────────

  describe("admin routes — Supabase session fallback", () => {
    it("allows /admin when no cookie but getAdminSession returns isAdmin=true", async () => {
      stubAdminSession(true)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin", { cookies: {} }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
      expect(mockGetAdminSession).toHaveBeenCalledOnce()
    })

    it("redirects to /login when no cookie and getAdminSession returns isAdmin=false", async () => {
      stubAdminSession(false)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/admin", { cookies: {} }) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(307)
      const location = res.headers.get("location") ?? ""
      expect(location).toContain("/login")
    })
  })

  // ── Auth routes (public) ───────────────────────────────────────────────────

  describe("auth routes — publicly accessible", () => {
    it.each([
      "/login",
      "/register",
      "/forgot-password",
      "/auth/callback",
      "/register-success",
      "/reset-password",
    ])("allows '%s' without any session", async (pathname) => {
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest(pathname) as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
      // Neither admin check nor user session check should run
      expect(mockGetAdminSession).not.toHaveBeenCalled()
    })
  })

  // ── Protected user routes ─────────────────────────────────────────────────

  describe("protected user routes", () => {
    const fakeSession = { user: { id: "user-abc", email: "user@test.com" } }

    it("allows access when a valid Supabase session exists", async () => {
      stubUserSession(fakeSession)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/my-reservations") as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
    })

    it("allows access to the root '/' with a valid session", async () => {
      stubUserSession(fakeSession)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/") as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(200)
    })

    it("redirects to /login when no session exists", async () => {
      stubUserSession(null)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/my-reservations") as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      expect(res.status).toBe(307)
      const location = res.headers.get("location") ?? ""
      expect(location).toContain("/login")
    })

    it("includes redirectedFrom param when redirecting unauthenticated user", async () => {
      stubUserSession(null)
      const { proxy } = await import("@/proxy")
      const req = makeMockRequest("/summary") as any

      const res = (await proxy(req)) as unknown as MockNextResponse

      const location = res.headers.get("location") ?? ""
      expect(location).toContain("redirectedFrom=%2Fsummary")
    })
  })
})
