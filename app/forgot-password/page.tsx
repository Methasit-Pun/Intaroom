"use client"

import type React from "react"

import { useState } from "react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import Link from "next/link"
import { supabaseUrl, supabaseAnonKey } from "@/app/env"
import { Loader2 } from "lucide-react"

export default function ForgotPasswordPage() {
  const [username, setUsername] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Initialize Supabase client with explicit URL and key
  const supabase = createClientComponentClient({
    supabaseUrl,
    supabaseKey: supabaseAnonKey,
  })

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // First, get the email associated with the username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username)
        .single()

      if (profileError) {
        throw new Error("Username not found. Please check your username.")
      }

      const email = profileData.email

      // Now use the email to reset password
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      setSuccess(true)
    } catch (error: any) {
      setError(error.message || "Failed to send reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#5A0D16]">
      <div className="w-full max-w-md p-6 rounded-3xl bg-[#6D3B3B]">
        <h1 className="text-2xl font-semibold text-white text-center mb-6">Forgot Password</h1>

        {error && (
          <div className="bg-red-500/20 border border-red-500 text-white p-3 rounded-lg mb-4 text-sm">{error}</div>
        )}

        {success ? (
          <div>
            <div className="bg-green-500/20 border border-green-500 text-white p-4 rounded-lg mb-6">
              <p className="text-center">Password reset email sent. Please check your inbox.</p>
            </div>

            <div className="text-center">
              <Link
                href="/login"
                className="px-6 py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors inline-block"
              >
                Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetPassword}>
            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-full bg-transparent border border-white/30 text-white placeholder:text-white/70 focus:outline-none focus:border-white/50"
                  required
                />
                <p className="text-xs text-white/70 mt-1 ml-2">
                  Enter your username and we'll send a password reset link to your email
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-[#E8E1D9] hover:bg-[#D8D1C9] text-[#5A0D16] font-medium transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline mr-2 h-5 w-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Reset Password"
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-4 text-center text-sm text-white">
          <Link href="/login" className="hover:underline">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  )
}
