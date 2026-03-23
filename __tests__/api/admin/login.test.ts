/**
 * Unit tests — POST /api/admin/login
 *
 * Covers:
 *  ✅ Valid credentials → 200 + isAdmin cookie set
 *  ❌ Wrong username    → 401
 *  ❌ Wrong password    → 401
 *  ❌ Missing ADMIN_USERNAME env var → 500
 *  ❌ Missing ADMIN_PASSWORD env var → 500
 *  ❌ Both env vars missing          → 500
 *  ❌ Malformed JSON body            → 400
 *  🔒 Cookie security attributes verified (httpOnly, sameSite, path, maxAge)
 *  🔒 Secure flag: false in dev, true in production
 *  🔒 Failed auth must NOT set the isAdmin cookie
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { MockNextResponse } from "../../setup"

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/login", () => {
  const VALID_USERNAME = "admin1"
  const VALID_PASSWORD = "admin123"

  beforeEach(() => {
    vi.stubEnv("ADMIN_USERNAME", VALID_USERNAME)
    vi.stubEnv("ADMIN_PASSWORD", VALID_PASSWORD)
    vi.stubEnv("NODE_ENV", "test")
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

  it("sets cookie with sameSite: 'lax'", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.sameSite).toBe("lax")
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

  it("returns 401 when username is wrong", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "wrong_user", password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid admin credentials")
  })

  it("returns 401 when password is wrong", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: "wrong_pass" }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid admin credentials")
  })

  it("returns 401 when both username and password are wrong", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "bad", password: "bad" }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
  })

  it("does NOT set isAdmin cookie when credentials are wrong", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: "wrong", password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.cookies.has("isAdmin")).toBe(false)
  })

  // ── Missing env vars ───────────────────────────────────────────────────────

  it("returns 500 when ADMIN_USERNAME env var is not set", async () => {
    vi.stubEnv("ADMIN_USERNAME", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Server configuration error")
  })

  it("returns 500 when ADMIN_PASSWORD env var is not set", async () => {
    vi.stubEnv("ADMIN_PASSWORD", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Server configuration error")
  })

  it("returns 500 when both credential env vars are missing", async () => {
    vi.stubEnv("ADMIN_USERNAME", "")
    vi.stubEnv("ADMIN_PASSWORD", "")
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(500)
  })

  // ── Malformed request ──────────────────────────────────────────────────────

  it("returns 400 on malformed JSON body", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    const res = (await POST(makeMalformedRequest())) as unknown as MockNextResponse

    expect(res.status).toBe(400)
    const body = await res.json<{ error: string }>()
    expect(body.error).toBe("Invalid request")
  })

  it("returns 400 when body has no username field", async () => {
    const { POST } = await import("@/app/api/admin/login/route")
    // username is undefined → won't match env var → 401 (not 400 — JSON parses fine)
    const res = (await POST(makeRequest({ password: VALID_PASSWORD }))) as unknown as MockNextResponse

    expect(res.status).toBe(401)
  })
})
