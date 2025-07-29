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
    await supabase.auth.exchangeCodeForSession(code)
  }

  // URL to redirect to after sign in process completes
  // Check if this is an email verification
  const type = requestUrl.searchParams.get("type")
  if (type === "email_confirmation" || type === "recovery") {
    // Redirect to login page with a success parameter using dynamic origin
    // return NextResponse.redirect(`${requestUrl.origin}/login?verified=true`)
    return NextResponse.redirect(`https://intaroomv2.vercel.app/login?verified=true`)
  }

  return NextResponse.redirect(requestUrl.origin)
}
