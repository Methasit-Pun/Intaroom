/**
 * Global test setup — runs once before every test file.
 *
 * Provides lightweight stubs for:
 *   • next/server   (NextResponse + NextRequest helpers)
 *   • next/headers  (cookies())
 *   • next/navigation (redirect())
 *   • @supabase/auth-helpers-nextjs
 *   • @/app/env
 *
 * Nothing here touches real network or filesystem.
 */

import { vi } from "vitest"

// ─── MockResponseCookies ──────────────────────────────────────────────────────

export class MockResponseCookies {
  private _store = new Map<string, { value: string } & Record<string, unknown>>()

  set(name: string, value: string, options: Record<string, unknown> = {}) {
    this._store.set(name, { value, ...options })
  }

  get(name: string) {
    return this._store.get(name) ?? null
  }

  has(name: string) {
    return this._store.has(name)
  }

  /** Expose raw store for assertions */
  toObject() {
    return Object.fromEntries(this._store)
  }
}

// ─── MockNextResponse ─────────────────────────────────────────────────────────

export class MockNextResponse {
  readonly status: number
  readonly headers: Headers
  readonly cookies: MockResponseCookies
  private _body: string | null

  constructor(body: string | null = null, init: ResponseInit = {}) {
    this.status = (init.status as number) ?? 200
    this.headers = new Headers(init.headers as HeadersInit)
    this.cookies = new MockResponseCookies()
    this._body = body
  }

  async json<T = unknown>(): Promise<T> {
    return JSON.parse(this._body ?? "null") as T
  }

  async text(): Promise<string> {
    return this._body ?? ""
  }

  // ── Static factory methods ────────────────────────────────────────────────

  static json(body: unknown, init: ResponseInit = {}) {
    const r = new MockNextResponse(JSON.stringify(body), {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...Object.fromEntries(new Headers(init.headers as HeadersInit)),
      },
    })
    return r
  }

  static next() {
    return new MockNextResponse(null, { status: 200 })
  }

  static redirect(url: URL | string, initOrStatus?: ResponseInit | number) {
    const status =
      typeof initOrStatus === "number"
        ? initOrStatus
        : ((initOrStatus as ResponseInit)?.status ?? 307)
    const r = new MockNextResponse(null, { status })
    r.headers.set("location", url.toString())
    return r
  }
}

// ─── Factory: create mock NextRequest ────────────────────────────────────────

export function makeMockRequest(
  pathname: string,
  opts: { cookies?: Record<string, string>; searchParams?: Record<string, string> } = {}
) {
  const base = new URL(`http://localhost${pathname}`)
  if (opts.searchParams) {
    for (const [k, v] of Object.entries(opts.searchParams)) base.searchParams.set(k, v)
  }

  return {
    nextUrl: {
      pathname,
      searchParams: base.searchParams,
      clone() {
        return new URL(base.toString())
      },
    },
    cookies: {
      get: (name: string) =>
        opts.cookies?.[name] !== undefined
          ? { name, value: opts.cookies[name] }
          : undefined,
    },
    url: base.toString(),
  }
}

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next/server", () => ({ NextResponse: MockNextResponse }))

vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`)
  }),
}))

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
  })),
}))

vi.mock("@supabase/auth-helpers-nextjs", () => ({
  createMiddlewareClient: vi.fn(() => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  })),
  createServerComponentClient: vi.fn(() => ({
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "not found" } }),
    })),
  })),
}))

vi.mock("@/app/env", () => ({
  supabaseUrl: "https://test.supabase.co",
  supabaseAnonKey: "test-anon-key",
  liffId: "test-liff-id",
}))

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}))
