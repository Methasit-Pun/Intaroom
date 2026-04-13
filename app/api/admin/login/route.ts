import { createClient } from "@supabase/supabase-js"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

// ---------------------------------------------------------------------------
// In-memory rate limiter (works for single-instance / dev; swap for
// Upstash/Redis on multi-instance production deployments).
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5

interface AttemptRecord {
  count: number
  windowStart: number
}

const attempts = new Map<string, AttemptRecord>()

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  )
}

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const record = attempts.get(ip)

  if (!record || now - record.windowStart > RATE_LIMIT_WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStart: now })
    return false
  }

  if (record.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true
  }

  record.count += 1
  return false
}

function resetAttempts(ip: string) {
  attempts.delete(ip)
}

// ---------------------------------------------------------------------------
// POST /api/admin/login
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429 }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required" }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase configuration for admin login")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Use service role key so this route can read admin_profiles regardless of RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    })

    // Look up the admin record by username
    const { data: admin, error } = await supabase
      .from("admin_profiles")
      .select("id, username, password_hash")
      .eq("username", username)
      .single()

    if (error || !admin) {
      // Return the same error message regardless of whether the user exists
      // to prevent username enumeration.
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 })
    }

    // Compare password against bcrypt hash stored in admin_profiles.password_hash.
    // To generate a new hash run:
    //   node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD', 12).then(console.log)"
    // then store that string in admin_profiles.password_hash.
    const passwordMatches = await bcrypt.compare(password, admin.password_hash)

    if (!passwordMatches) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 })
    }

    // Successful login — clear rate-limit counter for this IP.
    resetAttempts(ip)

    const response = NextResponse.json({ success: true })
    response.cookies.set("isAdmin", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict", // prevent CSRF
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
