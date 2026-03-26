// CORS utilities for Next.js Route Handlers (app/api/**/route.ts).
//
// next.config.mjs and vercel.json add CORS response headers at the CDN/build
// level, but they cannot respond to OPTIONS preflight requests on their own.
// Every Route Handler that accepts cross-origin requests must:
//   1. Export an OPTIONS function (handles preflight)
//   2. Call withCors() to attach headers to GET/POST/… responses
//
// Example usage in app/api/example/route.ts:
//
//   import { handleOptions, withCors } from "@/lib/cors"
//
//   export function OPTIONS() { return handleOptions() }
//
//   export async function GET() {
//     return withCors(Response.json({ ok: true }))
//   }

import { NextResponse } from "next/server"

const ALLOWED_ORIGIN =
  process.env.ALLOWED_ORIGIN ??
  (process.env.NODE_ENV === "production" ? "https://intaroomv2.vercel.app" : "*")

export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin":      ALLOWED_ORIGIN,
  "Access-Control-Allow-Methods":     "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, X-Supabase-Auth",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age":           "600",
}

// Returns a 204 No Content response for OPTIONS preflight.
// Export this as the OPTIONS handler in every Route Handler that needs CORS.
export function handleOptions(): NextResponse {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// Merges CORS headers onto any existing Response / NextResponse.
// Call this when building get/post/… responses.
export function withCors(response: Response): NextResponse {
  const headers = new Headers(response.headers)
  Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v))

  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}


