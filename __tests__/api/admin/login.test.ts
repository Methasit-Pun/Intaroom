/**
 * Unit tests — POST /api/admin/login
 *
 * Covers:
 *  ✅ Valid credentials → 200 + isAdmin cookie set
 *  ❌ Wrong username    → 401 (admin_profiles row not found)
 *  ❌ Wrong password    → 401 (SHA-256 hash mismatch)
 *  ❌ Missing NEXT_PUBLIC_SUPABASE_URL env var → 500
 *  ❌ Missing SUPABASE_SERVICE_ROLE_KEY env var → 500
 *  ❌ Both Supabase env vars missing            → 500
 *  ❌ Malformed JSON body                       → 400
 *  🔒 Cookie security attributes verified (httpOnly, sameSite, path, maxAge)
 *  🔒 Secure flag: false in dev, true in production
 *  🔒 Failed auth must NOT set the isAdmin cookie
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import bcrypt from "bcryptjs"
import type { MockNextResponse } from "../../setup"
import type { MockedFunction } from "vitest"
import type { createClient as CreateClientType } from "@supabase/supabase-js"

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USERNAME = "admin1"
const VALID_PASSWORD = "admin123"
const VALID_PASSWORD_HASH = bcrypt.hashSync(VALID_PASSWORD, 10)

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

function makeMalformedRequest(): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{ not valid json",
  })
}

// ─── Supabase client factory helpers ─────────────────────────────────────────

type AdminProfile = { id: number; username: string; password_hash: string }

function makeSupabaseClient(adminData: AdminProfile | null, queryError: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: adminData, error: queryError })
  // eq must be chainable: route calls .eq("username", …).eq("is_active", …).single()
  const eq = vi.fn()
  eq.mockReturnValue({ eq, single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/login", () => {
  let mockCreateClient: MockedFunction<typeof CreateClientType>

  beforeEach(async () => {
    // Reset module registry so the route's in-memory rate-limit Map starts
    // fresh for every test (all requests share the same "unknown" IP).
    vi.resetModules()
    const supabaseJs = await import("@supabase/supabase-js")
    mockCreateClient = supabaseJs.createClient as MockedFunction<typeof CreateClientType>

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    vi.stubEnv("NODE_ENV", "test")

    // Default: valid admin record with correct password hash
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH }) as any
    )
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── Happy path ─────────────────────────────────────────────────────────────

  it("returns 200 and { success: true } on valid credentials", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(200)
    const body = await res.json<{ success: boolean }>()
    expect(body.success).toBe(true)
  })

  it("sets isAdmin cookie with value 'true' on successful login", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie).not.toBeNull()
    expect(cookie?.value).toBe("true")
  })

  it("sets cookie with httpOnly: true", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.httpOnly).toBe(true)
  })

  it("sets cookie with sameSite: 'strict'", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.sameSite).toBe("strict")
  })

  it("sets cookie with path: '/'", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.path).toBe("/")
  })

  it("sets cookie maxAge to 7 days (604800 seconds)", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.maxAge).toBe(60 * 60 * 24 * 7)
  })

  it("sets cookie secure: false in non-production environment", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.secure).toBe(false)
  })

  it("sets cookie secure: true in production environment", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.secure).toBe(true)
  })

  // ── Wrong credentials ──────────────────────────────────────────────────────

  it("returns 401 when username is wrong (admin not found in DB)", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(null, { message: "not found" }) as any
    )
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "wrong_user", password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid admin credentials")
  })

  it("returns 401 when password is wrong (hash mismatch)", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ id: 1, username: VALID_USERNAME, password_hash: "wrong_hash_value" }) as any
    )
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: "wrong_pass" }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid admin credentials")
  })

  it("returns 401 when both username and password are wrong", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(null, { message: "not found" }) as any
    )
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "bad", password: "bad" }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
  })

  it("does NOT set isAdmin cookie when credentials are wrong", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(null, { message: "not found" }) as any
    )
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "wrong", password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.cookies.has("isAdmin")).toBe(false)
  })

  // ── Missing Supabase env vars ──────────────────────────────────────────────

  it("returns 500 when NEXT_PUBLIC_SUPABASE_URL env var is not set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Server configuration error")
  })

  it("returns 500 when SUPABASE_SERVICE_ROLE_KEY env var is not set", async () => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Server configuration error")
  })

  it("returns 500 when both Supabase env vars are missing", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
  })

  // ── Malformed / incomplete request ─────────────────────────────────────────

  it("returns 400 on malformed JSON body", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeMalformedRequest())) as unknown as MockNextResponse

    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid request")
  })

  it("returns 400 when body has no username field", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(400)
  })
})
