import { createClient } from "@supabase/supabase-js"
import { createHash } from "crypto"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
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
      // to prevent username enumeration
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 })
    }

    // Compare SHA-256 hash of the incoming password against the stored hash.
    // To generate a hash for a new admin password run:
    //   node -e "const {createHash}=require('crypto'); console.log(createHash('sha256').update('YOUR_PASSWORD').digest('hex'))"
    // then store that hex string in admin_profiles.password_hash
    const passwordHash = createHash("sha256").update(password).digest("hex")

    if (passwordHash !== admin.password_hash) {
      return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 })
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set("isAdmin", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
