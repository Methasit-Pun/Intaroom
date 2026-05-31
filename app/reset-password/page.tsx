"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"

const supabase = createClientComponentClient({ supabaseUrl, supabaseKey: supabaseAnonKey })

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const code = searchParams.get("code")

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true)
        // Remove the code from the URL so it can't be replayed
        router.replace("/reset-password")
      } else if (!session) {
        router.push("/login")
      }
    })

    if (code) {
      // Exchange client-side — this triggers the PASSWORD_RECOVERY event above
      supabase.auth.exchangeCodeForSession(code).catch(() => router.push("/login"))
    } else {
      // No code in URL: if there's no existing session either, redirect to login.
      // A logged-in user who navigates here directly will not get a PASSWORD_RECOVERY
      // event, so sessionReady stays false and they are redirected by the timeout below.
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) router.push("/login")
      })
    }

    // Fallback: if PASSWORD_RECOVERY never fires within 8 seconds, redirect to login
    const fallback = setTimeout(() => {
      if (!sessionReady) router.push("/login")
    }, 8000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(fallback)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    return () => {
      if (redirectTimer.current) clearTimeout(redirectTimer.current)
    }
  }, [])

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setSuccess(true)
      redirectTimer.current = setTimeout(() => router.push("/login"), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (!sessionReady && !success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
        <div className="text-white/70 text-sm">Verifying reset link...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#6D3B3B]">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">Reset Password</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {success ? (
          <div className="bg-green-500/20 border border-green-500 text-white p-4 rounded-lg">
            <p className="text-center">Password has been reset successfully. Redirecting to login...</p>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <input
                type="password"
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
