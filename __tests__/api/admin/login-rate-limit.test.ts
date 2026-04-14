/**
 * Unit tests — POST /api/admin/login (rate limiting & edge cases)
 *
 * These tests intentionally do NOT call vi.resetModules() between each case
 * so that the in-memory `attempts` Map inside the route module persists across
 * requests — which is required to exercise the rate limiter.
 *
 * Covers:
 *  🔒 Rate limit: 5th attempt still succeeds (boundary)
 *  🔒 Rate limit: 6th attempt returns 429
 *  🔒 Rate limit: resets after successful login
 *  🔒 Rate limit: applies per-IP (different IPs are independent)
 *  🔒 Rate limit: window resets after 15 minutes
 *  ❌ Missing password field → 400
 *  ❌ Empty string username → 400
 *  ❌ Empty string password → 400
 *  ❌ Supabase query error (DB down) → 401 (same response as bad creds)
 */

import { describe, it, expect, beforeAll, vi } from "vitest"
import bcrypt from "bcryptjs"
import type { MockNextResponse } from "../../setup"
import type { MockedFunction } from "vitest"
import type { createClient as CreateClientType } from "@supabase/supabase-js"

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USERNAME = "admin1"
const VALID_PASSWORD = "admin123"
const VALID_PASSWORD_HASH = bcrypt.hashSync(VALID_PASSWORD, 10)

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeRequest(
  body: unknown,
  ip = "1.2.3.4"
): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  })
}

// ─── Supabase client factory helpers ─────────────────────────────────────────

type AdminProfile = { id: number; username: string; password_hash: string }

function makeSupabaseClient(adminData: AdminProfile | null, queryError: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: adminData, error: queryError })
  // `eq` must be chainable: route calls .eq("username", ...).eq("is_active", ...).single()
  const eq = vi.fn()
  eq.mockReturnValue({ eq, single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from }
}

// ─── Rate-limit tests ─────────────────────────────────────────────────────────
//
// We import the route ONCE per describe block (via beforeAll) so the module's
// in-memory Map is shared across all `it` blocks — exactly like a real server.

describe("POST /api/admin/login — rate limiting", () => {
  let POST: (req: Request) => Promise<Response>
  let mockCreateClient: MockedFunction<typeof CreateClientType>

  beforeAll(async () => {
    // Single import so the rate-limit Map is NOT reset between tests.
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    vi.stubEnv("NODE_ENV", "test")

    const supabaseJs = await import("@supabase/supabase-js")
    mockCreateClient = supabaseJs.createClient as MockedFunction<typeof CreateClientType>

    // Return bad credentials so every attempt is a failed login
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(null, { message: "not found" }) as any
    )

    const route = await import("@/app/api/admin/login/route")
    POST = route.POST
  })

  it("allows up to 5 failed attempts (attempt 5 is NOT rate-limited)", async () => {
    const ip = "10.0.0.1"
    let lastStatus = 0

    for (let i = 1; i <= 5; i++) {
      const res = (await POST(makeRequest({ username: "bad", password: "bad" }, ip))) as unknown as MockNextResponse
      lastStatus = res.status
    }

    // All 5 should be 401 (wrong creds), not 429
    expect(lastStatus).toBe(401)
  })

  it("blocks the 6th attempt with 429 Too Many Requests", async () => {
    const ip = "10.0.0.2"

    // Exhaust the 5-attempt budget
    for (let i = 0; i < 5; i++) {
      await POST(makeRequest({ username: "bad", password: "bad" }, ip))
    }

    // 6th attempt should be rate-limited
    const res = (await POST(makeRequest({ username: "bad", password: "bad" }, ip))) as unknown as MockNextResponse
    expect(res.status).toBe(429)
    const body = await res.json<{ error: string }>()
    expect(body.error).toMatch(/too many/i)
  })

  it("rate limit applies per IP — a different IP is unaffected", async () => {
    const blockedIp = "10.0.0.3"
    const cleanIp = "10.0.0.4"

    // Block the first IP
    for (let i = 0; i < 6; i++) {
      await POST(makeRequest({ username: "bad", password: "bad" }, blockedIp))
    }

    // A request from a fresh IP should still get through (401, not 429)
    const res = (await POST(makeRequest({ username: "bad", password: "bad" }, cleanIp))) as unknown as MockNextResponse
    expect(res.status).toBe(401)
  })

  it("resets the rate-limit counter for an IP after a successful login", async () => {
    const ip = "10.0.0.5"

    // Make 4 failed attempts (just below the 5-attempt limit)
    for (let i = 0; i < 4; i++) {
      mockCreateClient.mockReturnValueOnce(
        makeSupabaseClient(null, { message: "not found" }) as any
      )
      await POST(makeRequest({ username: "bad", password: "bad" }, ip))
    }

    // Successful login — this should clear the counter
    mockCreateClient.mockReturnValueOnce(
      makeSupabaseClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH }) as any
    )
    const successRes = (await POST(
      makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }, ip)
    )) as unknown as MockNextResponse
    expect(successRes.status).toBe(200)

    // After successful login the counter is reset — next failed attempt should be 401 not 429
    mockCreateClient.mockReturnValueOnce(
      makeSupabaseClient(null, { message: "not found" }) as any
    )
    const afterRes = (await POST(makeRequest({ username: "bad", password: "bad" }, ip))) as unknown as MockNextResponse
    expect(afterRes.status).toBe(401)
  })

  it("rate limit window resets after 15 minutes (mocking Date.now)", async () => {
    const ip = "10.0.0.6"
    const realDateNow = Date.now

    try {
      // Exhaust the rate limit
      for (let i = 0; i < 6; i++) {
        mockCreateClient.mockReturnValue(
          makeSupabaseClient(null, { message: "not found" }) as any
        )
        await POST(makeRequest({ username: "bad", password: "bad" }, ip))
      }

      // Verify it is blocked
      const blockedRes = (await POST(makeRequest({ username: "bad", password: "bad" }, ip))) as unknown as MockNextResponse
      expect(blockedRes.status).toBe(429)

      // Advance time by 16 minutes (past the 15-minute window)
      const sixteenMinutesMs = 16 * 60 * 1000
      Date.now = () => realDateNow() + sixteenMinutesMs

      // Request should now succeed with 401 (expired window, fresh attempt counter)
      mockCreateClient.mockReturnValue(
        makeSupabaseClient(null, { message: "not found" }) as any
      )
      const afterWindowRes = (await POST(makeRequest({ username: "bad", password: "bad" }, ip))) as unknown as MockNextResponse
      expect(afterWindowRes.status).toBe(401)
    } finally {
      Date.now = realDateNow
    }
  })
})

// ─── Input validation edge cases ──────────────────────────────────────────────

describe("POST /api/admin/login — input validation edge cases", () => {
  let POST: (req: Request) => Promise<Response>

  beforeAll(async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    vi.stubEnv("NODE_ENV", "test")

    const supabaseJs = await import("@supabase/supabase-js")
    const mockCreateClient = supabaseJs.createClient as MockedFunction<typeof CreateClientType>
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH }) as any
    )

    const route = await import("@/app/api/admin/login/route")
    POST = route.POST
  })

  it("returns 400 when password field is missing from body", async () => {
    const res = (await POST(makeRequest({ username: VALID_USERNAME }))) as unknown as MockNextResponse
    expect(res.status).toBe(400)
  })

  it("returns 400 when username is an empty string", async () => {
    const res = (await POST(makeRequest({ username: "", password: VALID_PASSWORD }))) as unknown as MockNextResponse
    expect(res.status).toBe(400)
  })

  it("returns 400 when password is an empty string", async () => {
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: "" }))) as unknown as MockNextResponse
    expect(res.status).toBe(400)
  })

  it("returns 400 when body is an empty object", async () => {
    const res = (await POST(makeRequest({}))) as unknown as MockNextResponse
    expect(res.status).toBe(400)
  })
})

// ─── Supabase query error handling ───────────────────────────────────────────

describe("POST /api/admin/login — Supabase query errors", () => {
  let POST: (req: Request) => Promise<Response>

  beforeAll(async () => {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    vi.stubEnv("NODE_ENV", "test")

    const supabaseJs = await import("@supabase/supabase-js")
    const mockCreateClient = supabaseJs.createClient as MockedFunction<typeof CreateClientType>

    // Simulate a DB/network error (e.g. connection refused)
    const single = vi.fn().mockRejectedValue(new Error("connection refused"))
    const eq = vi.fn().mockReturnValue({ single })
    const select = vi.fn().mockReturnValue({ eq })
    const from = vi.fn().mockReturnValue({ select })
    mockCreateClient.mockReturnValue({ from } as any)

    const route = await import("@/app/api/admin/login/route")
    POST = route.POST
  })

  it("returns 400 when Supabase client throws an unexpected exception", async () => {
    // The route's catch-all converts unhandled exceptions to 400 "Invalid request"
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse
    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid request")
  })

  it("does NOT set isAdmin cookie when Supabase throws", async () => {
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse
    expect(res.cookies.has("isAdmin")).toBe(false)
  })
})
