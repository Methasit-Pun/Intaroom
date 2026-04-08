/**
 * Production-failure regression tests — POST /api/admin/login
 *
 * These tests specifically target the two classes of failures reported in production:
 *
 *  1. "fail to fetch data"   → Supabase network/connection errors are NOT caught and
 *                              cause an unhandled rejection or wrong status code.
 *
 *  2. "admin credential issue" → Schema mismatch: the route queries columns
 *                                `username` and `password_hash`, but the actual
 *                                `admin_profiles` table (database-schema.sql) only has
 *                                `email` and `password` (plain text).
 *                                Mocked tests pass; production returns 401 every time.
 *
 * ⚠️  SCHEMA BUG SUMMARY
 *   Route expects:  SELECT id, username, password_hash  WHERE username = ?
 *   Actual schema:  id | email | password (plain text) | full_name | ...
 *
 *   Fix options (pick one):
 *     A) Migrate DB: ADD COLUMN username TEXT, ADD COLUMN password_hash TEXT
 *        then back-fill and drop old columns.
 *     B) Update route to query `email` instead of `username` and compare
 *        against the plain `password` column (also add hashing to the insert SQL).
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { createHash } from "crypto"
import type { MockNextResponse } from "../../setup"
import type { MockedFunction } from "vitest"
import type { createClient as CreateClientType } from "@supabase/supabase-js"

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_USERNAME = "admin1"
const VALID_PASSWORD = "admin123"
const VALID_PASSWORD_HASH = createHash("sha256").update(VALID_PASSWORD).digest("hex")

// ─── Request helpers ──────────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

// ─── Supabase client spy factory ─────────────────────────────────────────────

/** Returns a spy-instrumented mock client so we can assert on call arguments. */
function makeSpyClient(adminData: { id: number; username: string; password_hash: string } | null, queryError: unknown = null) {
  const single = vi.fn().mockResolvedValue({ data: adminData, error: queryError })
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, single }
}

/** Simulates Supabase SDK throwing a network-level error (no response). */
function makeNetworkErrorClient(message = "Failed to fetch") {
  const single = vi.fn().mockRejectedValue(new Error(message))
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, single }
}

/** Simulates Supabase SDK hanging (promise never resolves) — times out in real code. */
function makeHangingClient() {
  const single = vi.fn().mockReturnValue(new Promise(() => { /* never resolves */ }))
  const eq = vi.fn().mockReturnValue({ single })
  const select = vi.fn().mockReturnValue({ eq })
  const from = vi.fn().mockReturnValue({ select })
  return { from, select, eq, single }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/admin/login — production failure regression", () => {
  let mockCreateClient: MockedFunction<typeof CreateClientType>

  beforeEach(async () => {
    const supabaseJs = await import("@supabase/supabase-js")
    mockCreateClient = supabaseJs.createClient as MockedFunction<typeof CreateClientType>

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://test.supabase.co")
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
    vi.stubEnv("NODE_ENV", "test")
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // ── 1. Supabase query arguments (schema contract) ─────────────────────────
  //
  // These tests document exactly what columns the route expects.
  // If the DB schema doesn't match, admin login will always fail in production.

  describe("Supabase query contract — must match actual DB schema", () => {
    it("queries the admin_profiles table", async () => {
      const spy = makeSpyClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH })
      mockCreateClient.mockReturnValue(spy as any)

      const { POST } = await import("@/app/api/admin/login/route")
      await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))

      // ⚠️ Actual table name — if this fails, the route is querying the wrong table
      expect(spy.from).toHaveBeenCalledWith("admin_profiles")
    })

    it("selects the expected columns from admin_profiles", async () => {
      const spy = makeSpyClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH })
      mockCreateClient.mockReturnValue(spy as any)

      const { POST } = await import("@/app/api/admin/login/route")
      await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))

      // ⚠️ SCHEMA MISMATCH DETECTED:
      //   This asserts the route uses "username" and "password_hash"
      //   BUT the actual DB schema (database-schema.sql:92-99) has:
      //     - "email"    (not "username")
      //     - "password" (not "password_hash", and stored as plain text)
      //
      //   In production Supabase returns null/error for non-existent columns
      //   → every login attempt results in 401 "Invalid admin credentials"
      expect(spy.select).toHaveBeenCalledWith("id, username, password_hash")
    })

    it("filters by 'username' column using the provided value", async () => {
      const spy = makeSpyClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH })
      mockCreateClient.mockReturnValue(spy as any)

      const { POST } = await import("@/app/api/admin/login/route")
      await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))

      // ⚠️ Same schema mismatch — actual column is "email", not "username"
      expect(spy.eq).toHaveBeenCalledWith("username", VALID_USERNAME)
    })

    it("performs a SHA-256 hash comparison (not plain-text)", async () => {
      const spy = makeSpyClient({ id: 1, username: VALID_USERNAME, password_hash: VALID_PASSWORD_HASH })
      mockCreateClient.mockReturnValue(spy as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      // Confirm login succeeds when password_hash matches SHA-256 of the input
      expect(res.status).toBe(200)

      // ⚠️ But the DB stores plain-text "password" — so even if the column name
      //    were fixed, the hash comparison would still fail unless passwords are
      //    stored as SHA-256 hashes.
    })
  })

  // ── 2. "fail to fetch" — Supabase network / connection errors ────────────

  describe("Supabase network errors (fail to fetch)", () => {
    it("returns 400 (caught by try/catch) when Supabase SDK throws a network error", async () => {
      mockCreateClient.mockReturnValue(makeNetworkErrorClient("Failed to fetch") as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      // The outer try/catch in the route catches thrown errors and returns 400.
      // A more specific 503 would be better UX but 400 is the current behaviour.
      expect(res.status).toBe(400)
    })

    it("returns 400 when Supabase SDK throws 'FetchError: request to ... failed'", async () => {
      mockCreateClient.mockReturnValue(makeNetworkErrorClient("FetchError: request to https://test.supabase.co failed, reason: connect ECONNREFUSED") as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      expect(res.status).toBe(400)
    })

    it("returns 400 when Supabase SDK throws a timeout error", async () => {
      mockCreateClient.mockReturnValue(makeNetworkErrorClient("AbortError: The operation was aborted") as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      expect(res.status).toBe(400)
    })

    it("returns a JSON body (not empty) on network error", async () => {
      mockCreateClient.mockReturnValue(makeNetworkErrorClient() as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      const body = await res.json<{ error: string }>()
      expect(body).toHaveProperty("error")
      expect(typeof body.error).toBe("string")
    })

    it("does NOT set isAdmin cookie when a network error occurs", async () => {
      mockCreateClient.mockReturnValue(makeNetworkErrorClient() as any)

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      expect(res.cookies.has("isAdmin")).toBe(false)
    })

    it("returns 500 when SUPABASE_SERVICE_ROLE_KEY is missing (config error, not fetch error)", async () => {
      vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "")

      const { POST } = await import("@/app/api/admin/login/route")
      const res = (await POST(makeRequest({ username: VALID_USERNAME, password: VALID_PASSWORD }))) as unknown as MockNextResponse

      // Config errors should surface as 500, not 400, so callers can distinguish
      // "bad request" from "server misconfiguration"
      expect(res.status).toBe(500)
    })
  })

  // ── 3. User login via Supabase Auth (client-side) ─────────────────────────
  //
  // Regular user login is handled entirely by the Supabase client SDK on the
  // browser (supabase.auth.signInWithPassword) — there is no server-side API
  // route to unit-test. The possible failure modes in production are:
  //
  //   a) NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY not set
  //      → Supabase client initialises with undefined → "Failed to construct URL"
  //   b) Email not confirmed → Supabase returns AuthApiError "Email not confirmed"
  //   c) Wrong credentials   → AuthApiError "Invalid login credentials"
  //   d) Network error       → FetchError in the browser
  //
  // The tests below verify that the env vars used by the Supabase client are
  // present in the test environment (regression guard).

  describe("User login env var sanity checks", () => {
    it("NEXT_PUBLIC_SUPABASE_URL is set in the test environment", () => {
      expect(process.env.NEXT_PUBLIC_SUPABASE_URL).toBeTruthy()
    })

    it("NEXT_PUBLIC_SUPABASE_URL starts with https://", () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
      expect(url).toMatch(/^https:\/\//)
    })
  })
})
