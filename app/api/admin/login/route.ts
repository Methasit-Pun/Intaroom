import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json()

    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD

    if (!adminUsername || !adminPassword) {
      console.error("Admin credentials not configured in environment variables")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    if (username !== adminUsername || password !== adminPassword) {
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
