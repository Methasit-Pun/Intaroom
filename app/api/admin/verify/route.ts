import { cookies } from "next/headers"
import { NextResponse } from "next/server"

/**
 * GET /api/admin/verify
 * Returns { isAdmin: true } when the HttpOnly isAdmin session cookie is present,
 * otherwise returns 401.  Use this instead of reading localStorage on the client.
 */
export async function GET() {
  const cookieStore = await cookies()
  const isAdmin = cookieStore.get("isAdmin")?.value === "true"

  if (!isAdmin) {
    return NextResponse.json({ isAdmin: false }, { status: 401 })
  }

  return NextResponse.json({ isAdmin: true })
}
