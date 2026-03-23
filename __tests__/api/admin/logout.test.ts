/**
 * Unit tests — POST /api/admin/logout
 *
 * Covers:
 *  ✅ Returns 200 + { success: true }
 *  🔒 Clears isAdmin cookie (value = "", maxAge = 0)
 *  🔒 Cookie remains httpOnly after clear
 *  🔒 Secure flag respects NODE_ENV
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import type { MockNextResponse } from "../../setup"

describe("POST /api/admin/logout", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns 200 and { success: true }", async () => {
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    expect(res.status).toBe(200)
    const body = await res.json<{ success: boolean }>()
    expect(body.success).toBe(true)
  })

  it("clears the isAdmin cookie by setting an empty value", async () => {
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie).not.toBeNull()
    expect(cookie?.value).toBe("")
  })

  it("expires the isAdmin cookie immediately (maxAge = 0)", async () => {
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.maxAge).toBe(0)
  })

  it("keeps httpOnly: true on the cleared cookie", async () => {
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.httpOnly).toBe(true)
  })

  it("sets cookie path: '/'", async () => {
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.path).toBe("/")
  })

  it("sets cookie secure: false in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development")
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.secure).toBe(false)
  })

  it("sets cookie secure: true in production", async () => {
    vi.stubEnv("NODE_ENV", "production")
    const { POST } = await import("@/app/api/admin/logout/route")
    const res = (await POST()) as unknown as MockNextResponse

    const cookie = res.cookies.get("isAdmin")
    expect(cookie?.secure).toBe(true)
  })
})
