import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const type = requestUrl.searchParams.get("type")

  // For password recovery, pass the code to the client so it can exchange it
  // directly — this triggers the PASSWORD_RECOVERY auth event client-side,
  // which is required to gate the reset form properly.
  if (type === "recovery" && code) {
    return NextResponse.redirect(`${requestUrl.origin}/reset-password?code=${code}`)
  }

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      await supabase.auth.exchangeCodeForSession(code)

      if (type === "email_confirmation") {
        return NextResponse.redirect(`${requestUrl.origin}/login?verified=true`)
      }

      return NextResponse.redirect(`${requestUrl.origin}/`)
    } catch {
      return NextResponse.redirect(`${requestUrl.origin}/login?error=auth_callback_failed`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=missing_auth_code`)
}
