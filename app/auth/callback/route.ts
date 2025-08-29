import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code)
      
      // Check if this is an email verification
      const type = requestUrl.searchParams.get("type")
      
  // --- TEST FLOW: Skip email verification and always auto-authenticate ---
  if (type === "email_confirmation") {
    // Email verification - redirect to login with success message
    return NextResponse.redirect(`https://intaroomv2.vercel.app/login?verified=true`)
  }
  if (type === "recovery") {
    // Password recovery - redirect to reset password page
    return NextResponse.redirect(`https://intaroomv2.vercel.app/reset-password`)
  }
  // Regular auth callback - redirect to main app (skip verification for testing)
  return NextResponse.redirect(`https://intaroomv2.vercel.app/`)
      
    } catch (error) {
      console.error("Auth callback error:", error)
      // If there's an error, redirect to login with error parameter
      return NextResponse.redirect(`https://intaroomv2.vercel.app/login?error=auth_callback_failed`)
    }
  }

  // No code provided - redirect to login
  return NextResponse.redirect(`https://intaroomv2.vercel.app/login?error=missing_auth_code`)
}
